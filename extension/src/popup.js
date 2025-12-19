/**
 * Popup - Refactored to use JobService
 */

import { auth } from './firebase-config';
import { onAuthStateChanged, signOut } from "firebase/auth";
import JobService from './services/JobService';

// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const openAuthBtn = document.getElementById('openAuthBtn');

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// Auth Actions
if (openAuthBtn) {
    openAuthBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'dashboard.html' });
    });
}

signOutAppBtn.addEventListener('click', () => {
    signOut(auth);
});

openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

// ============================================================================
// CLIPPING LOGIC (via JobService)
// ============================================================================

tailorBtn.addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('spinner');
    const btnText = document.getElementById('btnText');
    const btn = document.getElementById('tailorBtn');

    // Validation
    if (!auth.currentUser) {
        statusDiv.textContent = "Error: Not authenticated.";
        statusDiv.className = "error";
        statusDiv.classList.remove('hidden');
        return;
    }

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

        // Smart Scraping
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const clone = document.body.cloneNode(true);

                const selectorsToRemove = [
                    'nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe',
                    '[role="navigation"]', '.nav', '.header', '.footer', '.menu', '#menu',
                    '.cookie-notice', '.advertisement', '.ad', '.sidebar'
                ];

                selectorsToRemove.forEach(sel => {
                    clone.querySelectorAll(sel).forEach(el => el.remove());
                });

                let text = clone.innerText || "";
                return text.replace(/\s+/g, ' ').trim();
            },
        });

        if (!results || !results[0] || !results[0].result) {
            throw new Error("Failed to scrape page content.");
        }

        const pageText = results[0].result;
        const pageUrl = tab.url;

        if (pageText.length < 100) {
            throw new Error("Job description is too short (< 100 chars).");
        }

        statusDiv.textContent = `Sending ${pageText.length} chars to ResumeForge...`;

        // Use JobService
        const result = await JobService.submitJob(pageUrl, pageText);

        statusDiv.textContent = result.status === "Cached"
            ? "Success! Found cached result."
            : "Success! Job queued.";
        statusDiv.className = "success";

    } catch (error) {
        console.error(error);
        statusDiv.textContent = error.message;
        statusDiv.className = "error";
        btnText.textContent = "Try Again";
        btn.disabled = false;
        spinner.classList.add('hidden');
    }
});
