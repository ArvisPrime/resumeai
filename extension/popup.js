// Firebase Function URL (Production)
// TODO: Ensure this matches your deployed function name (clipJob)
const API_URL = "https://us-central1-resumeai-6b02f.cloudfunctions.net/clipJob";

document.getElementById('tailorBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const btnText = document.getElementById('btnText');
    const btn = document.getElementById('tailorBtn');

    // Reset UI
    statusDiv.className = "processing";
    statusDiv.textContent = "Analyzing page structure...";
    statusDiv.classList.remove('hidden');
    spinner.classList.remove('hidden');
    btnText.textContent = "Processing...";
    btn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error("No active tab found.");
        }

        // Smart Scraping: Inject cleaner script
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Clone body to avoid modifying the actual page visible to user
                const clone = document.body.cloneNode(true);

                // Remove noise elements
                const selectorsToRemove = [
                    'nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe',
                    '[role="navigation"]', '.nav', '.header', '.footer', '.menu', '#menu',
                    '.cookie-notice', '.advertisement', '.ad', '.sidebar'
                ];

                selectorsToRemove.forEach(sel => {
                    const elements = clone.querySelectorAll(sel);
                    elements.forEach(el => el.remove());
                });

                // Get clean text
                let text = clone.innerText || "";

                // Collapse whitespace
                text = text.replace(/\s+/g, ' ').trim();

                return text;
            },
        });

        if (!results || !results[0] || !results[0].result) {
            throw new Error("Failed to scrape page content.");
        }

        const pageText = results[0].result;
        const pageUrl = tab.url;

        // Validation: payload size
        if (pageText.length < 100) {
            throw new Error("Job description is too short (< 100 chars). detected. Please highlight the text or try another page.");
        }

        statusDiv.textContent = `Sending ${pageText.length} chars to ResumeForge...`;

        // Send to Backend
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: pageUrl,
                description: pageText
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error (${response.status})`);
        }

        const data = await response.json();

        statusDiv.textContent = "Success! Job queued.";
        statusDiv.className = "success";

        setTimeout(() => {
            window.close();
        }, 2000);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = error.message;
        statusDiv.className = "error";
        btnText.textContent = "Try Again";
        btn.disabled = false;
        spinner.classList.add('hidden');
    }
});
