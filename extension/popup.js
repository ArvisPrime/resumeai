// Placeholder for the Firebase Cloud Function URL
// TODO: Replace this with your actual deployed function URL
const API_URL = "PLACEHOLDER_FUNCTION_URL";

document.getElementById('tailorBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    
    if (API_URL === "PLACEHOLDER_FUNCTION_URL") {
        statusDiv.textContent = "Error: API URL not configured in popup.js";
        statusDiv.className = "error";
        return;
    }

    statusDiv.textContent = "Scraping page...";
    statusDiv.className = "";
    spinner.style.display = "block";

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
             throw new Error("No active tab found.");
        }

        // Execute script to get body text
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText,
        });

        if (!results || !results[0] || !results[0].result) {
            throw new Error("Failed to scrape page content.");
        }

        const pageText = results[0].result;
        const pageUrl = tab.url;

        statusDiv.textContent = "Sending to Resume AI...";
        
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
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Server error");
        }

        statusDiv.textContent = `Success! Job ID: ${data.result}`;
        statusDiv.className = "success";

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.className = "error";
    } finally {
        spinner.style.display = "none";
    }
});
