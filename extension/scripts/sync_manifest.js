const fs = require('fs');
const path = require('path');

const SECRETS_PATH = path.join(__dirname, '../src/secrets.js');
const TEMPLATE_PATH = path.join(__dirname, '../manifest.template.json');
const MANIFEST_PATH = path.join(__dirname, '../manifest.json');

try {
    // 1. Read secrets.js
    const secretsContent = fs.readFileSync(SECRETS_PATH, 'utf8');

    // Extract googleClientId using regex
    const clientIdMatch = secretsContent.match(/googleClientId\s*=\s*["']([^"']+)["']/);

    if (!clientIdMatch) {
        throw new Error("Could not find googleClientId in src/secrets.js");
    }
    const clientId = clientIdMatch[1];

    // 2. Read manifest template
    const manifestTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // 3. Inject Client ID
    // Replaces "client_id": "ANYTHING" or "client_id": "PLACEHOLDER"
    const updatedManifest = manifestTemplate.replace(
        /"client_id":\s*"[^"]*"/,
        `"client_id": "${clientId}"`
    );

    // 4. Write to live manifest.json
    fs.writeFileSync(MANIFEST_PATH, updatedManifest);

    console.log(`✅ Successfully synced Google Client ID to manifest.json`);
} catch (error) {
    console.error(`❌ Sync Failed: ${error.message}`);
    process.exit(1);
}
