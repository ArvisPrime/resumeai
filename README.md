# Serverless Resume Automation Suite

This system allows you to tailor your resume for any job description using Gemini and Firebase.

## 1. Setup

### Prerequisites
*   Node.js & npm
*   Python 3.9+
*   Firebase CLI (`npm install -g firebase-tools`)
*   Google Cloud Project with Gemini API enabled

### A. Firebase Setup
1.  **Create a Project**: Go to [console.firebase.google.com](https://console.firebase.google.com/) and create a new project.
2.  **Enable Firestore**: Create a Firestore database (Start in Test mode for development).
3.  **Enable Storage**: Set up Firebase Storage (Start in Test mode).
4.  **Service Account**:
    *   Go to Project Settings > Service accounts.
    *   Click "Generate new private key".
    *   Rename the downloaded file to `serviceAccountKey.json` and place it in the `backend/` directory.

### B. Bridge (Firebase Functions)
1.  Navigate to `firebase-functions/`:
    ```bash
    cd firebase-functions
    npm install
    ```
2.  Login and Deploy:
    ```bash
    firebase login
    firebase init functions # Select your project, choose 'JavaScript', 'No' to ESLint, 'Yes' to dependencies
    # If prompted to overwrite index.js or package.json, choose NO.
    firebase deploy --only functions
    ```
3.  **Copy the Function URL**: The output will contain a URL (e.g., `https://us-central1-YOUR-PROJECT.cloudfunctions.net/submitJob`).

### C. Frontend (Chrome Extension)
1.  Open `extension/popup.js`.
2.  Replace `const API_URL = "PLACEHOLDER_FUNCTION_URL";` with your copied Function URL.
3.  Load into Chrome:
    *   Go to `chrome://extensions/`.
    *   Enable "Developer mode" (top right).
    *   Click "Load unpacked".
    *   Select the `extension/` directory.

### D. Backend (Python Worker)
1.  Navigate to `backend/`:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
2.  Set your Gemini API Key:
    ```bash
    export GOOGLE_API_KEY="your_api_key_here"
    ```
3.  Update bucket name in `backend/main.py`:
    *   Find `'storageBucket': 'YOUR_STORAGE_BUCKET_NAME.appspot.com'` and replace with your actual bucket name (from Firebase Console > Storage).

## 2. Usage

1.  **Start the Worker**:
    ```bash
    cd backend
    python main.py
    ```
2.  **Visit a Job Posting**: Go to LinkedIn or any job site.
3.  **Clipping**: Click the "Resume AI Clipper" extension icon and click "Tailor & Generate".
4.  **Wait**: Watch the Python terminal. It will detect the job, call Gemini, compile the PDF, and upload it.
5.  **Result**: The terminal will print a public URL to your tailored PDF!

## 3. Configuration
*   **Master Resume**: Edit `backend/master_resume.tex` to put your actual resume content. Ensure you keep the LaTeX structure valid.
