# ResumeForge

> **AI-Powered Resume Tailoring for the 2025 Job Market**

ResumeForge is a production-ready resume automation suite built on **Firebase Cloud Functions (2nd Gen)** and **Google Gemini Pro**. It uses AI to analyze job descriptions and tailor your LaTeX resume for maximum ATS compatibility.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multiple Resume Tracks** | Maintain separate LaTeX templates for different roles (Frontend, Backend, PM, etc.) |
| **Edit Before Processing** | Review and tweak scraped job descriptions before AI processing |
| **ATS Scoring** | Real-time compatibility feedback with missing keyword detection |
| **Secure by Design** | Firebase App Check, credential isolation, and sanitized git history |
| **Premium Dashboard** | Glassmorphism UI with real-time status, filtering, and history |
| **Scalable Backend** | Cloud Tasks for async processing, modular service architecture |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Popup     │  │  Dashboard  │  │  Sandbox (App Check)│  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┴─────────────────────┘             │
│                          │ JobService                        │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTPS + App Check Token
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Firebase Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  clipJob    │─▶│ Cloud Task  │─▶│ processJobWorker    │  │
│  │  (HTTP)     │  │   Queue     │  │  (Background)       │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                                │             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────▼──────────┐  │
│  │ AIService   │  │CloudConvert │  │  Firestore + Storage│  │
│  │ (Gemini)    │  │  Service    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Backend Components
- **`clipJob`**: Verified HTTP entry point with App Check enforcement
- **`processJobWorker`**: Multi-stage processor (Analyze → Tailor → Convert to PDF)
- **`onJobDeleted`**: Firestore trigger that cleans up PDFs when jobs are deleted

### Extension Components
- **`AppCheckBridge`**: Sandboxed iframe for MV3-compliant reCAPTCHA
- **`JobService`**: Centralized Firestore and API management
- **`Dashboard`**: Premium UI for managing results and resume tracks

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud Project on **Blaze Plan**

### 1. Clone & Configure

```bash
git clone https://github.com/YourUsername/resumeai.git
cd resumeai
```

### 2. Backend Setup

```bash
cd firebase-functions/functions
npm install

# Set required secrets
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set CLOUDCONVERT_API_KEY

# Copy and configure local secrets
cp services/secrets_config.template.js services/secrets_config.js
cp secrets_resume.template.js secrets_resume.js
# Edit both files with your actual values

# Deploy
firebase deploy --only functions
```

### 3. Extension Setup

```bash
cd ../../extension
npm install

# Copy and configure secrets
cp src/secrets.template.js src/secrets.js
# Edit src/secrets.js with your Firebase config, reCAPTCHA key, and OAuth client ID

# Build
npm run build
```

### 4. Load Extension
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

---

## 🔐 Security

This project follows security best practices:

| Security Feature | Implementation |
|------------------|----------------|
| **Credential Isolation** | All API keys and secrets are stored in git-ignored `secrets.js` files |
| **Firebase App Check** | reCAPTCHA v3 enforcement on all Cloud Functions |
| **Sanitized History** | Git history has been rewritten to remove all sensitive data |
| **Template Files** | `.template.js` files guide new developers without exposing credentials |

> ⚠️ **Important**: After cloning, you must create your own `secrets.js` files from the provided templates.

---

## 📁 Project Structure

```
resumeai/
├── extension/                    # Chrome Extension
│   ├── src/
│   │   ├── firebase-config.js   # Firebase + App Check setup
│   │   ├── services/
│   │   │   └── JobService.js    # Firestore & API abstraction
│   │   ├── popup.js             # Extension popup logic
│   │   ├── dashboard.js         # Dashboard page logic
│   │   ├── sandbox.js           # App Check sandbox worker
│   │   ├── secrets.js           # 🔒 Git-ignored credentials
│   │   └── secrets.template.js  # Template for secrets
│   ├── manifest.json
│   └── webpack.config.js
│
├── firebase-functions/
│   └── functions/
│       ├── index.js             # Cloud Function definitions
│       ├── master_resume.js     # LaTeX template (imports secrets)
│       ├── secrets_resume.js    # 🔒 Git-ignored personal resume
│       ├── services/
│       │   ├── AIService.js
│       │   ├── CloudConvertService.js
│       │   ├── ConfigService.js
│       │   ├── secrets_config.js          # 🔒 Git-ignored config
│       │   └── secrets_config.template.js # Template for config
│       └── package.json
│
├── firestore.rules
└── README.md
```

---

## 📚 Documentation

For detailed documentation, see the [GitHub Wiki](../../wiki):

- [Home](../../wiki/Home) - Overview and quick links
- [Architecture](../../wiki/Architecture) - Deep dive into system design
- [Setup Guide](../../wiki/Setup-Guide) - Step-by-step installation
- [Security](../../wiki/Security) - Credential management and best practices
- [Contributing](../../wiki/Contributing) - How to contribute

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for the 2025 Job Market</strong><br>
  Powered by Google Gemini Pro & Firebase
</p>
