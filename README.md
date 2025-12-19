# ResumeForge: AI-Powered Resume Tailoring

ResumeForge is a high-performance, production-ready resume automation suite built on **Firebase Cloud Functions (2nd Gen)** and **Google Gemini Pro**. It uses AI to analyze job descriptions and tailor your existing LaTeX resume for maximum ATS compatibility.

## 🚀 Key Features

*   **Multiple Resume Tracks**: Maintain separate LaTeX templates for different roles (e.g., Frontend, Backend, PM).
*   **Edit Before Processing**: Review and tweak scraped job descriptions in the extension popup before submission.
*   **ATS Scoring & Analysis**: Get real-time feedback on job/resume compatibility with missing keyword detection.
*   **Modular Architecture**: Robust service layer (`AIService`, `CloudConvertService`, etc.) for clean, maintainable code.
*   **Secure & Scalable**:
    *   **Cloud Tasks**: Asynchronous processing to handle high volume.
    *   **App Check**: Native Manifest V3 sandbox integration for reCAPTCHA protection.
    *   **Credential Security**: Isolated secrets management to prevent API key leaks.
*   **Premium Dashboard**: Real-time status updates, job filtering, and history management.

---

## 🏗️ Architecture Overview

### Backend (Node.js)
- **`clipJob`**: Verified HTTP entry point.
- **`processJobWorker`**: Multi-stage background processor (Analyze → Tailor → PDF Gen).
- **`onJobDeleted`**: Cleanup trigger that removes PDFs from Storage when jobs are deleted.

### Frontend (Chrome Extension)
- **`AppCheckBridge`**: A sandboxed iframe bridge for secure MV3-compliant reCAPTCHA.
- **`JobService`**: Centralized API and Firestore management.
- **`Dashboard`**: Glassmorphism UI for managing results and resume versions.

---

## 🛠️ Setup & Deployment

### 1. Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A Google Cloud Project on the **Blaze Plan**.

### 2. Backend Deployment
1.  Navigate to `firebase-functions/functions`.
2.  Set required secrets:
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    firebase functions:secrets:set CLOUDCONVERT_API_KEY
    ```
3.  Deploy: `firebase deploy --only functions`

### 3. Extension Setup
1.  Navigate to `extension/`.
2.  **Configure Secrets**:
    - Copy `src/secrets.template.js` to `src/secrets.js`.
    - Fill in your Firebase config and reCAPTCHA site key.
3.  Install & Build:
    ```bash
    npm install
    npm run build
    ```
4.  Load `extension/` folder as an "Unpacked Extension" in Chrome.

---

## 📄 License
MIT License. Optimized for the 2025 Job Market.
