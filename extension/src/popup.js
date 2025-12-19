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
const openDashboardBtn = document.getElementById('openDashboardBtn');
const signOutAppBtn = document.getElementById('signOutAppBtn');

const scrapeState = document.getElementById('scrapeState');
const reviewState = document.getElementById('reviewState');
const editDesc = document.getElementById('editDesc');
const trackSelect = document.getElementById('trackSelect');
const submitJobBtn = document.getElementById('submitJobBtn');
const cancelBtn = document.getElementById('cancelBtn');

// State
let allTracks = [];

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Auth State: User Logged In", user.uid);
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadTracks(user.uid);
    } else {
        console.log("Auth State: No User");
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}, (error) => {
    console.error("Auth State Error:", error);
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `Auth Error: ${error.message}`;
    statusEl.classList.remove('hidden');
});

async function loadTracks(uid) {
    try {
        allTracks = await JobService.getResumeTracks(uid);
        renderTrackSelect();
    } catch (e) {
        console.error("Failed to load tracks:", e);
    }
}

function renderTrackSelect() {
    trackSelect.innerHTML = allTracks.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('') || '<option value="default">Default Track</option>';
}

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
// CLIPPING LOGIC
// ============================================================================

tailorBtn.addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');

    statusDiv.className = "processing";
    statusDiv.textContent = "Scraping job details...";
    statusDiv.classList.remove('hidden');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found.");

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const clone = document.body.cloneNode(true);
                const selectorsToRemove = ['nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe'];
                selectorsToRemove.forEach(sel => clone.querySelectorAll(sel).forEach(el => el.remove()));
                return (clone.innerText || "").replace(/\s+/g, ' ').trim();
            },
        });

        const text = results[0].result;
        if (text.length < 100) throw new Error("Description too short.");

        // Switch to Review
        editDesc.value = text;
        scrapeState.classList.add('hidden');
        reviewState.classList.remove('hidden');
        statusDiv.classList.add('hidden');

    } catch (error) {
        statusDiv.textContent = error.message;
        statusDiv.className = "error";
        statusDiv.classList.remove('hidden');
    }
});

cancelBtn.addEventListener('click', () => {
    scrapeState.classList.remove('hidden');
    reviewState.classList.add('hidden');
});

submitJobBtn.addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const spinner = document.getElementById('submitSpinner');
    const btnText = document.getElementById('submitBtnText');
    const trackId = trackSelect.value;
    const description = editDesc.value.trim();

    statusDiv.className = "processing";
    statusDiv.textContent = "Submitting to Queue...";
    statusDiv.classList.remove('hidden');
    spinner.classList.remove('hidden');
    btnText.textContent = "Queuing...";
    submitJobBtn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = await JobService.submitJob(tab.url, description, trackId);

        if (result.jobId) {
            JobService.subscribeToJob(result.jobId, (job) => {
                if (job.status === "Done") {
                    statusDiv.textContent = "Success! Resume Ready.";
                    statusDiv.className = "success";
                    submitJobBtn.disabled = false;
                    btnText.textContent = "Tailor Another";
                    spinner.classList.add('hidden');
                } else if (job.status === "Error") {
                    statusDiv.textContent = "Error: " + (job.error || "Failed");
                    statusDiv.className = "error";
                    submitJobBtn.disabled = false;
                    spinner.classList.add('hidden');
                } else {
                    statusDiv.textContent = job.status + "...";
                }
            });
        }
    } catch (error) {
        statusDiv.textContent = error.message;
        statusDiv.className = "error";
        submitJobBtn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = "Tailor Resume";
    }
});
