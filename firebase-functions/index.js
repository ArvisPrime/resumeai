const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.submitJob = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.end();
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { url, description } = req.body;

        if (!url || !description) {
            res.status(400).send({ error: "Missing 'url' or 'description'" });
            return;
        }

        const writeResult = await admin.firestore().collection("job_queue").add({
            url: url,
            description: description,
            status: "Pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ result: writeResult.id });
    } catch (error) {
        console.error("Error adding document: ", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});
