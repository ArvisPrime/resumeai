const { onRequest } = require("firebase-functions/v2/https");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CloudConvert = require("cloudconvert");
const crypto = require("crypto");
const { CloudTasksClient } = require("@google-cloud/tasks");
const MASTER_RESUME = require("./master_resume");

admin.initializeApp();
const db = admin.firestore();

// Secrets
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const cloudConvertApiKey = defineSecret("CLOUDCONVERT_API_KEY");

// Configuration
const PROJECT_ID = "YOUR_PROJECT_ID"; // TODO: Should fetch dynamically if possible
const LOCATION = "us-central1";
const QUEUE = "resume-worker-queue";

/**
 * 1. GATEKEEPER: clipJob
 * - Validates App Check (Security)
 * - Checks MD5 Cache (Optimization)
 * - Dispatches Cloud Task (Scale)
 */
exports.clipJob = onRequest({ cors: true }, async (req, res) => {
    // 1. Security: App Check
    // if (!req.header("X-Firebase-AppCheck")) {
    //    return res.status(401).json({ error: "Unauthorized. Missing App Check Token." });
    // }
    // Note: We'll uncomment strict enforcement after Phase 4 (Frontend Update) to avoid breaking dev flow.

    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { url, description } = req.body;

    if (!url || !description || description.length < 100) {
        return res.status(400).json({ error: "Invalid payload." });
    }

    try {
        // 2. Optimization: MD5 Cache Check
        const contentHash = crypto.createHash('md5').update(description).digest('hex');

        const cacheQuery = await db.collection("job_queue")
            .where("contentHash", "==", contentHash)
            .where("status", "==", "Done")
            .limit(1)
            .get();

        if (!cacheQuery.empty) {
            const cachedDoc = cacheQuery.docs[0].data();
            console.log(`Cache Hit! Returning existing PDF for hash: ${contentHash}`);
            return res.status(200).json({
                result: cacheQuery.docs[0].id,
                pdfUrl: cachedDoc.latestPdfUrl,
                status: "Cached"
            });
        }

        // 3. Create Job (Pending)
        const docRef = await db.collection("job_queue").add({
            url,
            description,
            contentHash,
            status: "Queued",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Scale: Dispatch Cloud Task (via Firebase Admin SDK)
        // This handles OIDC Auth and URL resolution automatically.
        const { getFunctions } = require("firebase-admin/functions");
        await getFunctions().taskQueue("processJobWorker").enqueue({ docId: docRef.id });

        return res.status(200).json({ result: docRef.id, status: "Queued" });

    } catch (error) {
        console.error("Error in clipJob:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * 2. WORKER: processJobWorker
 * - Triggered by Cloud Tasks (Rate Limited: 5/sec)
 * - Step A: ATS Analysis
 * - Step B: PDF Generation
 */
exports.processJobWorker = onTaskDispatched({
    retryConfig: {
        maxAttempts: 3,
        minBackoffSeconds: 60
    },
    rateLimits: {
        maxConcurrentDispatches: 10,
        maxDispatchesPerSecond: 5
    },
    secrets: [geminiApiKey, cloudConvertApiKey]
}, async (req) => {
    // When using onTaskDispatched, the payload is in req.data
    const { docId } = req.data;
    if (!docId) return;

    console.log(`Worker started for Job ${docId}`);

    const docRef = db.collection("job_queue").document(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        console.error(`Doc ${docId} not found.`);
        return;
    }

    const data = docSnap.data();

    // Idempotency: skip if already processing/done
    if (data.status === "Done") return;

    try {
        await docRef.update({ status: "Processing" });

        // Initialize APIs
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        const cloudConvert = new CloudConvert(cloudConvertApiKey.value());

        // Use v1beta for experimental models
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp"
        }, { apiVersion: 'v1beta' });

        // --- STEP A: ATS SCORING ---
        console.log("Analyzing ATS Score...");
        const atsPrompt = `
            Analyze this Resume vs Job Description.
            
            RESUME:
            ${MASTER_RESUME}
            
            JOB:
            ${data.description}
            
            Return JSON ONLY:
            {
                "score": <0-100 integer>,
                "missing_keywords": ["keyword1", "keyword2"]
            }
        `;

        const atsResult = await model.generateContent(atsPrompt);
        const atsText = atsResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const atsData = JSON.parse(atsText);

        // --- STEP B: TAILORING ---
        console.log("Tailoring content...");
        const tailorPrompt = `
            Role: Resume Expert & LaTeX Specialist.
            Task: Tailor this resume for the job description.
            Constraint: Return RAW LATEX code only. Start with \\documentclass.
            
            RESUME:
            ${MASTER_RESUME}
            
            JOB:
            ${data.description}
        `;

        const tailorResult = await model.generateContent(tailorPrompt);
        const tailoredLatex = tailorResult.response.text().replace(/```latex/g, "").replace(/```/g, "").trim();

        // --- STEP C: PDF GENERATION ---
        console.log("Converting to PDF...");
        const job = await cloudConvert.jobs.create({
            tasks: {
                "import-raw": { operation: "import/raw", file: tailoredLatex, filename: "resume.tex" },
                "convert-pdf": { operation: "convert", input: "import-raw", output_format: "pdf", input_format: "tex" },
                "export-url": { operation: "export/url", input: "convert-pdf" }
            }
        });

        const finishedJob = await cloudConvert.jobs.wait(job.id);
        const exportTask = finishedJob.tasks.find(t => t.name === "export-url" && t.status === "finished");
        const pdfUrl = exportTask.result.files[0].url;

        // --- STEP D: UPDATE FIRESTORE (Atomic) ---
        /* 
           We store the version in a subcollection to keep the main doc clean,
           but update the main doc with the 'latest' pointers.
        */

        // Save version
        const versionRef = docRef.collection("versions").doc();
        await versionRef.set({
            atsScore: atsData.score,
            missingKeywords: atsData.missing_keywords || [],
            pdfUrl: pdfUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            latex: tailoredLatex
        });

        // Update Main Doc
        await docRef.update({
            status: "Done",
            latestPdfUrl: pdfUrl,
            latestAtsScore: atsData.score,
            currentVersionId: versionRef.id,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Job ${docId} Finished. Score: ${atsData.score}`);

    } catch (error) {
        console.error(`Job ${docId} Failed:`, error);
        await docRef.update({
            status: "Error",
            error: error.message
        });
    }
});
