# Backend Guide

This guide documents the Firebase Cloud Functions and services that power ResumeForge.

## Cloud Functions

### clipJob (HTTP v2)

**Entry point for job submissions.**

```
POST https://clipjob-xxxxx-uc.a.run.app
```

**Request Body:**
```json
{
  "jobDescription": "Full job description text...",
  "trackId": "default"
}
```

**Headers:**
- `Authorization: Bearer <Firebase ID Token>`
- `X-Firebase-AppCheck: <App Check Token>`

**Response:**
```json
{
  "success": true,
  "jobId": "abc123",
  "message": "Job queued for processing"
}
```

**Process:**
1. Validates App Check token
2. Authenticates user via ID token
3. Creates job document in Firestore
4. Enqueues Cloud Task for background processing

---

### processJobWorker (HTTP v2)

**Background processor invoked by Cloud Tasks.**

**Processing Stages:**

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | `Analyzing` | AI scores job/resume compatibility |
| 2 | `Tailoring` | AI customizes resume for the job |
| 3 | `Generating PDF` | CloudConvert converts LaTeX to PDF |
| 4 | `Completed` | PDF uploaded to Storage |

**Error Handling:**
- If PDF generation fails, tailored LaTeX is still saved
- Status set to `completed_no_pdf` for manual recovery

---

### getDownloadLink (HTTP v2)

**Generates signed URLs for PDF downloads.**

```
POST https://getdownloadlink-xxxxx-uc.a.run.app
```

**Request:**
```json
{
  "jobId": "abc123"
}
```

**Response:**
```json
{
  "url": "https://storage.googleapis.com/...",
  "expiresAt": 1703001600000
}
```

---

### onJobDeleted (Firestore Trigger)

**Cleanup trigger for deleted jobs.**

When a job document is deleted:
1. Locates associated PDF in Storage
2. Deletes the PDF file
3. Logs cleanup action

---

## Services

### AIService

**Gemini Pro integration for AI operations.**

```javascript
const aiService = new AIService(config);

// Analyze job and score compatibility
const analysis = await aiService.analyzeJob(jobDescription, resume);
// Returns: { score, missingKeywords, suggestions }

// Tailor resume for the job
const tailored = await aiService.tailorResume(jobDescription, resume, analysis);
// Returns: LaTeX string
```

---

### CloudConvertService

**LaTeX to PDF conversion using CloudConvert API.**

```javascript
const converter = new CloudConvertService(apiKey);

// Convert LaTeX to PDF
const pdfBuffer = await converter.convertLatexToPdf(latexContent);
```

**Requirements:**
- CloudConvert API key (set via Firebase secrets)
- Sufficient API credits

---

### ConfigService

**Dynamic configuration from Firestore.**

```javascript
const configService = new ConfigService(db);

// Get full config
const config = await configService.getConfig();

// Get specific value
const model = await configService.get('geminiModel');
```

**Config Document:** `config/app`

| Field | Type | Description |
|-------|------|-------------|
| `geminiModel` | string | AI model to use |
| `geminiApiVersion` | string | API version |
| `projectId` | string | GCP project ID |
| `bucketName` | string | Storage bucket |

---

### StorageService

**Firebase Storage operations.**

```javascript
const storage = new StorageService(bucket);

// Upload PDF
await storage.uploadPdf(userId, jobId, pdfBuffer);

// Get signed URL
const url = await storage.getSignedUrl(userId, jobId);

// Delete PDF
await storage.deletePdf(userId, jobId);
```

---

## Firestore Schema

### jobs/{userId}/{jobId}

```javascript
{
  jobDescription: "string",
  trackId: "string",
  status: "queued|analyzing|tailoring|generating_pdf|completed|failed",
  atsScore: 85,
  missingKeywords: ["keyword1", "keyword2"],
  tailoredLatex: "\\documentclass...",
  pdfPath: "jobs/{userId}/{jobId}/resume.pdf",
  company: "Company Name",
  title: "Job Title",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### profiles/{userId}/tracks/{trackId}

```javascript
{
  name: "Frontend Engineer",
  latex: "\\documentclass...",
  isDefault: true,
  createdAt: Timestamp
}
```

---

## Deployment

```bash
cd firebase-functions/functions

# Set secrets
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set CLOUDCONVERT_API_KEY

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:clipJob
```

## Monitoring

- **Logs**: Firebase Console → Functions → Logs
- **Metrics**: Cloud Console → Cloud Functions
- **Errors**: Firebase Console → Error Reporting
