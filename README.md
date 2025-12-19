# ResumeForge

A high-performance, production-ready resume automation suite built on **Firebase Cloud Functions (2nd Gen)** and **Google Gemini Pro**. ResumeForge uses AI to analyze job descriptions and tailor your existing LaTeX resume for maximum ATS compatibility.

## 🚀 Advanced Features

*   **Modular Service Architecture**: Logic is encapsulated in dedicated services (`AIService`, `CloudConvertService`, `StorageService`).
*   **Dynamic Configuration**: Zero hardcoded endpoints. Configuration (model selection, endpoints, bucket names) is managed via Firestore `config/app`.
*   **User-Specific Master Resumes**: Store and manage your own LaTeX templates in the **Profile** dashboard.
*   **ATS Scoring & Analysis**: Real-time evaluation of how well your resume matches a job.
*   **Real-time Dashboard**: Track job status (`Analyzing` → `Tailoring` → `Generating PDF`) with live updates from Firestore.
*   **Secure & Scalable**: Asynchronous processing using **Google Cloud Tasks** to handle high volume without timeouts.

---

## 🏗️ Architecture Overview

### Backend (Node.js)
- **`clipJob`**: HTTP entry point for the extension.
- **`processJobWorker`**: Background worker (Cloud Task) that handles the heavy lifting (AI + PDF Gen).
- **`getDownloadLink`**: Generates secure, short-lived signed URLs for downloads.

### Frontend (Chrome Extension)
- **`JobService`**: Centralized service layer for Firestore and API interactions.
- **`Dashboard`**: React-inspired (Vanilla JS + Bundler) interface for history and profile management.
- **`Webpack`**: Optimized build process for the extension.

---

## 🛠️ Setup & Deployment

### 1. Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A Google Cloud Project on the **Blaze Plan**.

### 2. Backend Deployment
1.  Navigate to the functions directory:
    ```bash
    cd firebase-functions/functions
    ```
2.  Set required secrets:
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    firebase functions:secrets:set CLOUDCONVERT_API_KEY
    ```
3.  Deploy:
    ```bash
    firebase deploy --only functions
    ```

### 3. Extension Setup
The extension now uses **Webpack**. You must build the bundles before loading into Chrome.
1.  Navigate to the extension directory:
    ```bash
    cd extension
    ```
2.  Install & Build:
    ```bash
    npm install
    npx webpack --mode production
    ```
3.  Load into Chrome:
    - Open `chrome://extensions/`.
    - Enable **Developer Mode**.
    - Click **Load Unpacked**.
    - Select the `extension/` folder in this repository.

---

## ⚙️ Configuration (Firestore)

ResumeForge loads its configuration dynamically from the `config/app` document in Firestore.

**Required Schema:**
```json
{
  "geminiModel": "gemini-3-flash-preview",
  "bucketName": "your-bucket-name.appspot.com",
  "region": "us-central1"
}
```

---

## 📄 License
MIT License. Optimized for the 2025 Job Market.
