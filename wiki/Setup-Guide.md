# Setup Guide

This guide walks you through setting up ResumeForge from scratch.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Firebase CLI** - `npm install -g firebase-tools`
- **Google Cloud Project** on the **Blaze Plan** (pay-as-you-go)
- **CloudConvert Account** - [Sign up](https://cloudconvert.com/)

## Step 1: Clone the Repository

```bash
git clone https://github.com/YourUsername/resumeai.git
cd resumeai
```

## Step 2: Firebase Project Setup

### 2.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable **Firestore**, **Storage**, and **Authentication** (Google provider)
4. Upgrade to **Blaze Plan** (required for Cloud Functions)

### 2.2 Enable Required APIs
In [Google Cloud Console](https://console.cloud.google.com/):
- Cloud Functions API
- Cloud Tasks API
- Cloud Build API

### 2.3 Configure App Check
1. Go to Firebase Console → App Check
2. Register your Chrome Extension with reCAPTCHA v3
3. Note your **Site Key** for later

### 2.4 Set Function Secrets
```bash
cd firebase-functions/functions

# Gemini API Key (from Google AI Studio)
firebase functions:secrets:set GEMINI_API_KEY

# CloudConvert API Key
firebase functions:secrets:set CLOUDCONVERT_API_KEY
```

## Step 3: Backend Configuration

### 3.1 Install Dependencies
```bash
cd firebase-functions/functions
npm install
```

### 3.2 Configure Local Secrets
```bash
# Copy templates
cp services/secrets_config.template.js services/secrets_config.js
cp secrets_resume.template.js secrets_resume.js
```

Edit `services/secrets_config.js`:
```javascript
const SECRETS_CONFIG = {
    projectId: "your-project-id",
    region: "us-central1",
    bucketName: "your-project-id.firebasestorage.app",
    endpoints: {
        clipJob: "https://clipjob-xxxxx-uc.a.run.app"
    }
};
```

Edit `secrets_resume.js` with your actual LaTeX resume content.

### 3.3 Deploy Functions
```bash
firebase deploy --only functions
```

After deployment, note the `clipJob` URL from the output.

## Step 4: Extension Setup

### 4.1 Install Dependencies
```bash
cd ../../extension
npm install
```

### 4.2 Configure Secrets
```bash
cp src/secrets.template.js src/secrets.js
```

Edit `src/secrets.js`:
```javascript
export const firebaseConfig = {
    projectId: "your-project-id",
    appId: "1:123456789:web:abcdef",
    storageBucket: "your-project-id.firebasestorage.app",
    apiKey: "your-web-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    messagingSenderId: "123456789"
};

export const siteKey = "your-recaptcha-site-key";

export const googleClientId = "123456789.apps.googleusercontent.com";

export const appConfig = {
    projectId: "your-project-id",
    region: "us-central1",
    endpoints: {
        clipJob: "https://clipjob-xxxxx-uc.a.run.app"
    }
};
```

### 4.3 Update Manifest (Optional)
If using Chrome Identity API, update `manifest.json`:
```json
"oauth2": {
    "client_id": "your-oauth-client-id.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
}
```

### 4.4 Build Extension
```bash
npm run build
```

## Step 5: Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

## Step 6: Firestore Configuration (Optional)

Create `config/app` document in Firestore for dynamic configuration:

```javascript
{
    geminiModel: "gemini-1.5-flash",
    geminiApiVersion: "v1beta",
    projectId: "your-project-id",
    region: "us-central1",
    bucketName: "your-project-id.firebasestorage.app",
    endpoints: {
        clipJob: "https://clipjob-xxxxx-uc.a.run.app"
    }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App Check errors | Verify reCAPTCHA site key matches Firebase registration |
| Function not found | Check `clipJob` URL in `secrets.js` matches deployed URL |
| Auth errors | Ensure Google Auth is enabled in Firebase Console |
| Build errors | Delete `node_modules` and run `npm install` again |

## Next Steps

- [Extension Guide](Extension-Guide) - Learn how to use the extension
- [Security](Security) - Review security best practices
