const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CloudConvert = require("cloudconvert");
const MASTER_RESUME = require("./master_resume");

admin.initializeApp();
const db = admin.firestore();

// Secrets
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const cloudConvertApiKey = defineSecret("CLOUDCONVERT_API_KEY");

/**
 * Function 1: HTTP Endpoint (clipJob)
 * Receives job data from Chrome Extension
 */
exports.clipJob = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { url, description } = req.body;

    // Basic Validation
    if (!url || !description) {
        return res.status(400).json({ error: "Missing required fields: url, description" });
    }
    if (description.length < 100) {
        return res.status(400).json({ error: "Description too short. Please capture more text." });
    }

    try {
        const docRef = await db.collection("job_queue").add({
            url,
            description,
            status: "Pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ result: docRef.id });
    } catch (error) {
        console.error("Error creating job:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * Function 2: Firestore Trigger (processJobWorker)
 * Processes the job when created in job_queue
 */
exports.processJobWorker = onDocumentCreated({
    document: "job_queue/{docId}",
    region: "us-central1",
    maxInstances: 10,
    concurrency: 1,
    timeoutSeconds: 300,
    secrets: [geminiApiKey, cloudConvertApiKey]
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const docId = event.params.docId;

    // Idempotency check: Only process "Pending"
    if (data.status !== "Pending") return;

    try {
        console.log(`Processing Job ${docId}...`);

        // 1. Update Status to Processing
        await snap.ref.update({ status: "Processing" });

        // 2. Initialize APIs with Secrets
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        const cloudConvert = new CloudConvert(cloudConvertApiKey.value());

        // 3. Generate Tailored LaTeX (Gemini)
        console.log("Generative AI: Tailoring resume...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
            You are an expert Technical Resume Strategist and LaTeX Specialist.
            
            INPUT DATA:
            1. MASTER TEMPLATE (LaTeX):
            ${MASTER_RESUME}
            
            2. TARGET JOB DESCRIPTION:
            ${data.description}
            
            YOUR MISSION:
            Tailor the resume content to align with the Target Role while maintaining 100% syntactically correct LaTeX structure.
            
            STRICT OUTPUT RULES:
            1. Return only the raw LaTeX code. No markdown blocks. No explanations.
            2. Must start with \\documentclass.
            3. Must end with \\end{document}.
            4. Escape special LaTeX characters (%, $, &, #) correctly in the content.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean markdown if present
        let cleanLatex = responseText.replace(/```latex/g, "").replace(/```/g, "").trim();

        // 4. Convert to PDF (CloudConvert)
        console.log("CloudConvert: Compiling PDF...");

        // Create Job
        const job = await cloudConvert.jobs.create({
            tasks: {
                "import-raw": {
                    operation: "import/raw",
                    file: cleanLatex,
                    filename: "resume.tex"
                },
                "convert-pdf": {
                    operation: "convert",
                    input: "import-raw",
                    output_format: "pdf",
                    input_format: "tex"
                },
                "export-url": {
                    operation: "export/url",
                    input: "convert-pdf"
                }
            }
        });

        // Wait for job completion
        const finishedJob = await cloudConvert.jobs.wait(job.id);
        const exportTask = finishedJob.tasks.find(t => t.name === "export-url" && t.status === "finished");

        if (!exportTask || !exportTask.result || !exportTask.result.files) {
            throw new Error("CloudConvert did not return a file URL.");
        }

        const pdfUrl = exportTask.result.files[0].url;
        console.log("PDF Generated:", pdfUrl);

        // 5. Upload to Firebase Storage (Download then Upload)
        // Note: For simplicity and performance, we can just save the CloudConvert URL directly 
        // OR stream it to our bucket. Streaming is better for persistence.
        const bucket = admin.storage().bucket();
        const destFile = bucket.file(`resumes/${docId}.pdf`);

        // Fetch from CloudConvert and pipe to Storage
        const fetch = (await import("node-fetch")).default; // CloudConvert sends temporary URL
        const pdfRes = await fetch(pdfUrl);

        const writeStream = destFile.createWriteStream({
            metadata: { contentType: 'application/pdf' }
        });

        await new Promise((resolve, reject) => {
            pdfRes.body.pipe(writeStream)
                .on("finish", resolve)
                .on("error", reject);
        });

        // Make public (optional, or use signed URL)
        await destFile.makePublic();
        const publicUrl = destFile.publicUrl();

        // 6. Final Update
        await snap.ref.update({
            status: "Done",
            pdfUrl: publicUrl,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Job ${docId} Completed Successfully.`);

    } catch (error) {
        console.error(`Job ${docId} Failed:`, error);

        await snap.ref.update({
            status: "Error",
            error: error.message || "Unknown Error",
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
