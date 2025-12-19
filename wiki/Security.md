# Security

ResumeForge implements multiple layers of security to protect your credentials and data.

## Credential Management

### Git-Ignored Secret Files

All sensitive configuration is stored in files that are **excluded from version control**:

| File | Location | Contains |
|------|----------|----------|
| `secrets.js` | `extension/src/` | Firebase config, API keys, OAuth client ID |
| `secrets_config.js` | `functions/services/` | Project ID, region, endpoint URLs |
| `secrets_resume.js` | `functions/` | Your personal LaTeX resume |

### Template Files

Each secret file has a corresponding `.template.js` file that is committed to the repo:

```
secrets.js           ← Git-ignored (your actual credentials)
secrets.template.js  ← Committed (placeholder values)
```

**When cloning the repo**, copy the templates and fill in your values:
```bash
cp src/secrets.template.js src/secrets.js
```

## API Key Security

### Rotation Procedure

If you suspect a key has been compromised:

1. **Rotate the key** in Google Cloud Console
2. **Update** your local `secrets.js` files
3. **Redeploy** affected components
4. **Verify** the old key no longer works

### Key Restrictions

Apply restrictions to your API keys in Google Cloud Console:

| Key Type | Recommended Restrictions |
|----------|-------------------------|
| Web API Key | Restrict to: Firestore, Auth, Storage, App Check APIs |
| | Restrict to: Your extension ID or domain |

## Firebase App Check

App Check prevents unauthorized access to your Cloud Functions.

### How It Works

1. Extension loads `sandbox.html` in a hidden iframe
2. Sandbox initializes reCAPTCHA v3 and requests token
3. Token passed to main extension via `postMessage`
4. Extension includes token in all API requests
5. Cloud Functions verify token before processing

### MV3 Compliance

Chrome's Manifest V3 restricts remote script loading. Our sandbox approach:

- `sandbox.html` has a relaxed CSP allowing Google scripts
- Main extension context remains secure
- Communication happens via structured `postMessage`

## Data Protection

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /jobs/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /profiles/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Security

PDFs are stored with user-scoped paths:
```
gs://bucket/jobs/{userId}/{jobId}/tailored_resume.pdf
```

Signed URLs expire after a configurable period.

## Git History Sanitization

This repository's Git history has been sanitized to remove:

- ✅ API keys and OAuth client IDs
- ✅ Project IDs and function URLs  
- ✅ Personal information (name, email, phone)
- ✅ Employer and education details
- ✅ Author/committer metadata

All commits now show generic author information.

## Best Practices

1. **Never commit `secrets.js` files** - Verify with `git status`
2. **Use environment-specific configs** - Different credentials for dev/prod
3. **Enable App Check enforcement** - In Firebase Console
4. **Regularly rotate keys** - Especially after team changes
5. **Monitor API usage** - Set up alerts for unusual activity
