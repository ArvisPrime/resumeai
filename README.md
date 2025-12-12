# ResumeForge (Node.js Edition)

A serverless, event-driven resume automation suite built on **Firebase Cloud Functions (2nd Gen)** and **Google Gemini 2.0**.

## 🚀 Features
*   **Smart Scraper**: Chrome Extension cleans up ads/navbars before sending job data.
*   **Event-Driven**: Asynchronous processing using Firestore triggers.
*   **AI-Powered**: Gemini 2.0 Flash tailors your resume content.
*   **PDF Generation**: CloudConvert engine for perfect LaTeX compilation.
*   **Secure**: Zero hardcoded secrets (uses Firebase Secret Manager).

## 1. Setup & Deployment

### Prerequisites
*   Node.js 20+
*   Firebase CLI (`npm install -g firebase-tools`)
*   Google Cloud Project (Blaze Plan required for Gen 2 Functions)

### A. API Keys
Ensure you have:
1.  **Google Gemini API Key** (from AI Studio)
2.  **CloudConvert API Key** (from CloudConvert Dashboard)

### B. Deploy Backend
1.  Navigate to the functions directory:
    ```bash
    cd firebase-functions
    ```
2.  Set your secrets (You will be prompted to paste values):
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    firebase functions:secrets:set CLOUDCONVERT_API_KEY
    ```
3.  Deploy the functions:
    ```bash
    firebase deploy --only functions
    ```
    *Note: If prompted to install dependencies or enable APIs, say Yes.*

### C. Extension Setup
1.  Open `extension/popup.js`.
2.  Ensure `API_URL` matches your deployed `clipJob` function URL (e.g., `https://clipjob-xxxx-uc.a.run.app`).
    *   *Tip: You can find this URL in the Firebase Console or deployment output.*
3.  Load into Chrome:
    *   `chrome://extensions/` > Enable Developer Mode > **Load Unpacked**.
    *   Select the `extension/` folder.

## 2. Usage
1.  **Find a Job**: Navigate to any job posting (LinkedIn, etc.).
2.  **Clip It**: Click the **ResumeForge** extension icon.
3.  **Wait**:
    *   The extension sends the job to the queue.
    *   The backend processes it (approx. 20-40 seconds).
    *   Check your **Firebase Console > Storage** for the generated PDF.
    *   *Upcoming Feature: The extension will notify you when done.*

## 3. Configuration
*   **Master Resume**: Edit `firebase-functions/functions/master_resume.tex` to update your core resume content. Redeploy after changes.
