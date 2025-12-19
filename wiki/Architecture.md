# Architecture

ResumeForge follows a modern, serverless architecture optimized for scalability and security.

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Popup     │  │  Dashboard  │  │  Sandbox (iframe)   │  │
│  │  - Scrape   │  │  - History  │  │  - reCAPTCHA v3     │  │
│  │  - Review   │  │  - Profiles │  │  - App Check        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┴─────────────────────┘             │
│                          │                                   │
│                    JobService.js                             │
│           (Firestore + HTTP API abstraction)                 │
└──────────────────────────┼───────────────────────────────────┘
                           │ HTTPS + App Check Token
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Firebase Backend                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  clipJob    │──▶│ Cloud Task  │──▶│ processJobWorker   │  │
│  │  (HTTP)     │  │   Queue     │  │  (Background)       │  │
│  │  App Check  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                                │             │
│                                    ┌───────────┴───────────┐ │
│                                    │                       │ │
│                                    ▼                       ▼ │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐  │
│  │ AIService   │  │  CloudConvertService │  │  Storage    │  │
│  │ (Gemini AI) │  │  (LaTeX → PDF)       │  │  (PDFs)     │  │
│  └─────────────┘  └─────────────────────┘  └─────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     Firestore                            │ │
│  │  - jobs/{uid}/{jobId}    - profiles/{uid}/tracks/{id}   │ │
│  │  - config/app            - users/{uid}                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### Extension Components

| Component | File | Purpose |
|-----------|------|---------|
| **Popup** | `popup.js` | Job scraping, review/edit, submission |
| **Dashboard** | `dashboard.js` | Job history, profile management, PDF downloads |
| **Sandbox** | `sandbox.js` | Isolated iframe for reCAPTCHA (MV3 compliance) |
| **JobService** | `services/JobService.js` | API abstraction layer |
| **Firebase Config** | `firebase-config.js` | Firebase init + App Check bridge |

### Backend Services

| Service | File | Purpose |
|---------|------|---------|
| **AIService** | `services/AIService.js` | Gemini Pro integration for analysis and tailoring |
| **CloudConvertService** | `services/CloudConvertService.js` | LaTeX to PDF conversion |
| **ConfigService** | `services/ConfigService.js` | Dynamic configuration from Firestore |
| **StorageService** | `services/StorageService.js` | Firebase Storage operations |

### Cloud Functions

| Function | Type | Description |
|----------|------|-------------|
| `clipJob` | HTTP (v2) | Entry point for job submissions. Validates App Check, creates Cloud Task |
| `processJobWorker` | HTTP (v2) | Background processor. Analyzes job, tailors resume, generates PDF |
| `getDownloadLink` | HTTP (v2) | Generates signed URLs for PDF downloads |
| `onJobDeleted` | Firestore Trigger | Cleans up Storage when jobs are deleted |

## Data Flow

1. **User scrapes job** → Extension popup extracts job description
2. **User reviews/edits** → Popup shows review screen with track selection
3. **Submission** → JobService calls `clipJob` with App Check token
4. **Background Processing**:
   - Cloud Task created
   - `processJobWorker` invoked
   - AIService analyzes job and scores ATS compatibility
   - AIService tailors resume to job requirements
   - CloudConvertService converts LaTeX to PDF
   - Results saved to Firestore and Storage
5. **Real-time updates** → Dashboard shows live status via Firestore listener
6. **Download** → User clicks download, `getDownloadLink` provides signed URL

## Security Architecture

See [Security](Security) for detailed security documentation.
