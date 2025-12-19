/**
 * ResumeForge - Cloud Functions
 * Refactored to use modular service architecture
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Services
const { AIService, CloudConvertService, StorageService, ConfigService } = require("./services");
const MASTER_RESUME = require("./master_resume");

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Secrets
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const cloudConvertApiKey = defineSecret("CLOUDCONVERT_API_KEY");

// Configuration loaded from Firestore via ConfigService
// Defaults are used if Firestore is unavailable
const configService = new ConfigService(db);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Standardized API Response
 */
function apiResponse(res, status, data) {
    const success = status >= 200 && status < 300;
    return res.status(status).json({ success, ...data });
}

/**
 * Authentication Middleware
 * @returns {Promise<{userId: string, userEmail: string}>}
 */
async function authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw { status: 401, code: "AUTH_MISSING", message: "No token provided" };
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return { userId: decodedToken.uid, userEmail: decodedToken.email };
    } catch (error) {
        throw { status: 403, code: "AUTH_INVALID", message: "Invalid token" };
    }
}

/**
 * Sanitize Filename
 */
function sanitizeFilename(str) {
    if (!str) return "Unknown";
    return str.replace(/[^a-zA-Z0-9]/g, "").trim();
}

/**
 * Extract First Name from LaTeX
 */
function extractFirstName(latex) {
    const nameMatch = latex.match(/\\textbf\{\\Huge\s*\\scshape\s*([A-Za-z]+)\s+.*?\}/);
    return nameMatch && nameMatch[1] ? nameMatch[1] : "User";
}

// ============================================================================
// HTTP ENDPOINTS
// ============================================================================

/**
 * POST /clipJob
 * Gatekeeper: Validates, caches, and queues jobs
 */
exports.clipJob = onRequest({ cors: true, enforceAppCheck: true }, async (req, res) => {
    if (req.method !== "POST") {
        return apiResponse(res, 405, { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" });
    }

    try {
        // Authenticate
        const { userId, userEmail } = await authenticateRequest(req);

        // Validate Payload
        const { url, description } = req.body;
        if (!url || !description || description.length < 100) {
            return apiResponse(res, 400, { code: "INVALID_PAYLOAD", message: "Invalid payload" });
        }

        // MD5 Cache Check
        const contentHash = crypto.createHash('md5').update(description + url).digest('hex');
        const cacheQuery = await db.collection("job_queue")
            .where("userId", "==", userId)
            .where("contentHash", "==", contentHash)
            .where("status", "==", "Done")
            .limit(1)
            .get();

        if (!cacheQuery.empty) {
            const cachedDoc = cacheQuery.docs[0];
            return apiResponse(res, 200, {
                jobId: cachedDoc.id,
                status: "Cached",
                message: "Job already processed"
            });
        }

        // Create Job
        const docRef = await db.collection("job_queue").add({
            userId,
            userEmail,
            url,
            description,
            trackId: req.body.trackId || "default",
            contentHash,
            status: "Queued",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Dispatch Worker
        const { getFunctions } = require("firebase-admin/functions");
        await getFunctions().taskQueue("processJobWorker").enqueue({ docId: docRef.id });

        return apiResponse(res, 200, { jobId: docRef.id, status: "Queued" });

    } catch (error) {
        if (error.status) {
            return apiResponse(res, error.status, { code: error.code, message: error.message });
        }
        console.error("clipJob Error:", error);
        return apiResponse(res, 500, { code: "INTERNAL_ERROR", message: "Internal Server Error" });
    }
});

/**
 * POST /getDownloadLink
 * Generates short-lived signed URL for secure downloads
 */
exports.getDownloadLink = onRequest({ cors: true, enforceAppCheck: true }, async (req, res) => {
    if (req.method !== "POST") {
        return apiResponse(res, 405, { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" });
    }

    try {
        const { userId } = await authenticateRequest(req);

        const { jobId } = req.body;
        if (!jobId) {
            return apiResponse(res, 400, { code: "MISSING_JOB_ID", message: "Missing jobId" });
        }

        // Verify ownership
        const docSnap = await db.collection("job_queue").doc(jobId).get();
        if (!docSnap.exists) {
            return apiResponse(res, 404, { code: "JOB_NOT_FOUND", message: "Job not found" });
        }

        const job = docSnap.data();
        if (job.userId !== userId) {
            return apiResponse(res, 403, { code: "FORBIDDEN", message: "Not your job" });
        }

        if (job.status !== "Done" || !job.storagePath) {
            return apiResponse(res, 400, { code: "FILE_NOT_READY", message: "File not ready" });
        }

        // Generate signed URL using config
        const config = await configService.getConfig();
        const storageService = new StorageService(storage, config.bucketName);
        const url = await storageService.getSignedUrl(job.storagePath, 15);

        return apiResponse(res, 200, { url });

    } catch (error) {
        if (error.status) {
            return apiResponse(res, error.status, { code: error.code, message: error.message });
        }
        console.error("getDownloadLink Error:", error);
        return apiResponse(res, 500, { code: "INTERNAL_ERROR", message: "Internal Server Error" });
    }
});

/**
 * POST /retryJob
 * Re-queues a failed job
 */
exports.retryJob = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        return apiResponse(res, 405, { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" });
    }

    try {
        const { userId } = await authenticateRequest(req);

        const { jobId } = req.body;
        if (!jobId) {
            return apiResponse(res, 400, { code: "MISSING_JOB_ID", message: "Missing jobId" });
        }

        const docRef = db.collection("job_queue").doc(jobId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return apiResponse(res, 404, { code: "JOB_NOT_FOUND", message: "Job not found" });
        }

        const job = docSnap.data();
        if (job.userId !== userId) {
            return apiResponse(res, 403, { code: "FORBIDDEN", message: "Not your job" });
        }

        // Reset and re-enqueue
        await docRef.update({
            status: "Queued",
            error: admin.firestore.FieldValue.delete(),
            retriedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const { getFunctions } = require("firebase-admin/functions");
        await getFunctions().taskQueue("processJobWorker").enqueue({ docId: jobId });

        return apiResponse(res, 200, { status: "Queued", message: "Job retried" });

    } catch (error) {
        if (error.status) {
            return apiResponse(res, error.status, { code: error.code, message: error.message });
        }
        console.error("retryJob Error:", error);
        return apiResponse(res, 500, { code: "INTERNAL_ERROR", message: "Internal Server Error" });
    }
});

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * processJobWorker
 * Cloud Task handler for resume processing
 */
exports.processJobWorker = onTaskDispatched({
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
    rateLimits: { maxConcurrentDispatches: 10, maxDispatchesPerSecond: 5 },
    secrets: [geminiApiKey, cloudConvertApiKey]
}, async (req) => {
    const { docId } = req.data;
    if (!docId) return;

    console.log(`Worker started for Job ${docId}`);

    const docRef = db.collection("job_queue").doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.error(`Doc ${docId} not found.`);
        return;
    }

    const data = docSnap.data();
    if (data.status === "Done") return; // Idempotency

    // Fetch config from Firestore
    const config = await configService.getConfig();
    console.log(`Using model: ${config.geminiModel}`);

    // Initialize Services with config
    const aiService = new AIService(geminiApiKey.value(), config.geminiModel, config.geminiApiVersion);
    const cloudConvertService = new CloudConvertService(cloudConvertApiKey.value());
    const storageService = new StorageService(storage, config.bucketName);

    try {
        await docRef.update({ status: "Preparing" });

        // Step 0: Fetch User Profile / Track
        let userResume = MASTER_RESUME;
        if (data.userId) {
            console.log(`Fetching profile for user: ${data.userId}`);

            // Try fetching specific track first
            if (data.trackId && data.trackId !== "default") {
                const trackSnap = await db.collection("profiles").doc(data.userId).collection("tracks").doc(data.trackId).get();
                if (trackSnap.exists && trackSnap.data().latex) {
                    userResume = trackSnap.data().latex;
                    console.log(`Using custom track: ${data.trackId}`);
                }
            }

            // Fallback to legacy masterResume or Default track
            if (userResume === MASTER_RESUME) {
                const profileSnap = await db.collection("profiles").doc(data.userId).get();
                if (profileSnap.exists && profileSnap.data().masterResume) {
                    userResume = profileSnap.data().masterResume;
                    console.log("Using legacy custom master resume.");
                } else if (data.trackId === "default") {
                    // Check if there is a track named "default" (though usually they have random IDs)
                    const defaultTracks = await db.collection("profiles").doc(data.userId).collection("tracks").where("isDefault", "==", true).limit(1).get();
                    if (!defaultTracks.empty) {
                        userResume = defaultTracks.docs[0].data().latex;
                    }
                }
            }
        }

        // Step A: ATS Analysis
        await docRef.update({ status: "Analyzing" });
        console.log("Analyzing ATS Score & Metadata...");
        const atsData = await aiService.analyzeATS(userResume, data.description);

        // Save metadata early
        await docRef.update({
            company: atsData.company_name,
            jobTitle: atsData.job_title,
            latestAtsScore: atsData.score
        });

        // Step B: Tailoring
        await docRef.update({ status: "Tailoring" });
        console.log("Tailoring resume...");
        const tailoredLatex = await aiService.tailorResume(userResume, data.description);

        // Step C: PDF Generation
        await docRef.update({ status: "Generating PDF", tailoredLatex });

        try {
            console.log("Converting to PDF...");
            const pdfUrl = await cloudConvertService.convertLatexToPdf(tailoredLatex);

            // Step D: Download and Upload to Storage
            console.log("Uploading to Firebase Storage...");
            const pdfResponse = await fetch(pdfUrl);
            const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

            const company = sanitizeFilename(atsData.company_name);
            const title = sanitizeFilename(atsData.job_title);
            const firstName = extractFirstName(userResume);
            const fileName = `${company}_${title}_${firstName}.pdf`;
            const filePath = `resumes/${fileName}`;

            await storageService.uploadPdf(pdfBuffer, filePath, {
                originalUrl: data.url,
                jobId: docId
            });

            // Step E: Update Firestore
            await docRef.update({ status: "Finalizing" });
            const versionRef = docRef.collection("versions").doc();
            await versionRef.set({
                atsScore: atsData.score,
                missingKeywords: atsData.missing_keywords || [],
                storagePath: filePath,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                latex: tailoredLatex,
                company: atsData.company_name,
                jobTitle: atsData.job_title
            });

            await docRef.update({
                status: "Done",
                storagePath: filePath,
                latestAtsScore: atsData.score,
                company: atsData.company_name,
                jobTitle: atsData.job_title,
                currentVersionId: versionRef.id,
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Job ${docId} Finished. File: ${fileName}`);

        } catch (pdfError) {
            console.error("PDF Generation failed but LaTeX was saved:", pdfError);
            await docRef.update({
                status: "Error",
                error: "PDF conversion failed. You can still access the tailored LaTeX below."
            });
        }

    } catch (error) {
        console.error(`Job ${docId} Failed:`, error);
        await docRef.update({
            status: "Error",
            error: error.message
        });
    }
});

/**
 * Storage Cleanup - Delete PDF when Job is deleted
 */
exports.onJobDeleted = onDocumentDeleted("job_queue/{docId}", async (event) => {
    const data = event.data.before.data();
    if (data.storagePath) {
        console.log(`Cleaning up storage for deleted job: ${event.params.docId}`);
        const config = await configService.getConfig();
        const bucket = admin.storage().bucket(config.bucketName);
        try {
            await bucket.file(data.storagePath).delete();
            console.log("PDF deleted successfully.");
        } catch (e) {
            console.error("Failed to delete PDF from Storage:", e);
        }
    }
});
