# Extension Guide

This guide covers how to use the ResumeForge Chrome Extension.

## Installation

1. Build the extension: `cd extension && npm run build`
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` folder

## Using the Extension

### Popup Interface

Click the ResumeForge icon in your browser toolbar to open the popup.

#### Step 1: Scrape a Job
1. Navigate to a job posting (LinkedIn, Indeed, etc.)
2. Click the extension icon
3. Click **Scrape Job** to extract the job description

#### Step 2: Review & Edit
After scraping, you'll see a review screen:
- **Job Description**: Edit the scraped text if needed
- **Resume Track**: Select which resume template to use
- **Submit**: Send the job for AI processing

#### Step 3: Monitor Progress
The popup shows real-time status:
| Status | Meaning |
|--------|---------|
| `Queued` | Waiting in Cloud Task queue |
| `Analyzing` | AI is scoring ATS compatibility |
| `Tailoring` | AI is customizing your resume |
| `Generating PDF` | Converting LaTeX to PDF |
| `Completed` | Ready for download |

### Dashboard

Access via: Click extension icon → **Open Dashboard**

#### Jobs Tab
- View all processed jobs
- Filter by status (Completed, Processing, Failed)
- Sort by date
- Download PDFs
- View ATS scores
- Delete old jobs

#### Profile Tab
Manage your resume templates:

**Resume Tracks**
- Create multiple tracks for different roles
- Each track has its own LaTeX template
- Switch between tracks when submitting jobs

**Setup Guide**
- First-run tutorial for new users
- Links to configuration help

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+R` | Open popup (configurable) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Click Sign In with Google |
| Scrape returns empty | Check if the page has loaded fully |
| Processing stuck | Check the Dashboard for error details |
| PDF not downloading | Verify Storage permissions in Firebase |

## Tips

1. **Edit before submitting** - Clean up scraped text for better results
2. **Use specific tracks** - Create tracks like "Frontend", "Backend", "PM"
3. **Check ATS scores** - Aim for 70%+ compatibility
4. **Review tailored resume** - Use "View Source" to see the LaTeX
