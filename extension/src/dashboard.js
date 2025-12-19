/**
 * Dashboard - Refactored to use JobService
 */

import { auth } from './firebase-config';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import JobService from './services/JobService';

// DOM Elements
const jobListBody = document.getElementById('jobListBody');
const jobsTable = document.getElementById('jobsTable');
const loading = document.getElementById('loading');
const controlBar = document.getElementById('controlBar');
const statusFilter = document.getElementById('statusFilter');
const sortOrder = document.getElementById('sortOrder');
const userEmailSpan = document.getElementById('userEmail');
const signOutBtn = document.getElementById('signOutBtn');

// Nav & Sections
const tabJobs = document.getElementById('tabJobs');
const tabProfile = document.getElementById('tabProfile');
const jobsSection = document.getElementById('jobsSection');
const profileSection = document.getElementById('profileSection');

// Profile Elements
const masterResumeRaw = document.getElementById('masterResumeRaw');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const saveStatus = document.getElementById('saveStatus');

// State
let allJobs = [];
let unsubscribe = null;

// ============================================================================
// AUTHENTICATION
// ============================================================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        userEmailSpan.textContent = user.email;
        document.getElementById('headerActions').classList.remove('hidden');
        loginContainer.classList.add('hidden');
        setupRealtimeListener(user.uid);
        loadProfile(user.uid);
    } else {
        userEmailSpan.textContent = '';
        document.getElementById('headerActions').classList.add('hidden');
        loginContainer.classList.remove('hidden');

        // Cleanup
        if (unsubscribe) unsubscribe();
        allJobs = [];
        renderTable([]);
        loading.style.display = 'none';
        jobsTable.classList.add('hidden');
        controlBar.classList.add('hidden');
    }
});

signOutBtn.addEventListener('click', () => signOut(auth));

// Login UI
const loginContainer = document.createElement('div');
loginContainer.id = 'loginContainer';
loginContainer.style.textAlign = 'center';
loginContainer.style.marginTop = '100px';
loginContainer.className = 'hidden';
loginContainer.innerHTML = `
    <h2>Welcome to ResumeForge</h2>
    <p>Sign in to view your job history.</p>
    <button id="googleSignInBtn" class="btn btn-primary" style="padding: 12px 24px; font-size: 1.1em;">
        Sign in with Google
    </button>
`;
document.body.appendChild(loginContainer);

document.body.addEventListener('click', (e) => {
    if (e.target.id === 'googleSignInBtn') signInWithGoogle();
});

async function signInWithGoogle() {
    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
        if (chrome.runtime.lastError || !token) {
            console.error("Auth Error", chrome.runtime.lastError);
            return;
        }
        const credential = GoogleAuthProvider.credential(null, token);
        await signInWithCredential(auth, credential);
    });
}

// ============================================================================
// NAVIGATION
// ============================================================================

tabJobs.addEventListener('click', () => switchTab('jobs'));
tabProfile.addEventListener('click', () => switchTab('profile'));

function switchTab(tabName) {
    if (tabName === 'jobs') {
        tabJobs.classList.add('active');
        tabProfile.classList.remove('active');
        jobsSection.classList.remove('hidden');
        profileSection.classList.add('hidden');
        controlBar.style.display = 'flex'; // Use style.display because control-bar might be flex
    } else {
        tabProfile.classList.add('active');
        tabJobs.classList.remove('active');
        profileSection.classList.remove('hidden');
        jobsSection.classList.add('hidden');
        controlBar.style.display = 'none';
    }
}

// ============================================================================
// DATA LAYER (via JobService)
// ============================================================================

function setupRealtimeListener(uid) {
    loading.style.display = 'block';

    // Use JobService for data subscription
    unsubscribe = JobService.subscribeToJobs(uid, (jobs) => {
        allJobs = jobs;
        loading.style.display = 'none';
        jobsTable.classList.remove('hidden');
        controlBar.classList.remove('hidden');
        applyFiltersAndRender();
    });
}

// ============================================================================
// FILTER & SORT
// ============================================================================

statusFilter.addEventListener('change', applyFiltersAndRender);
sortOrder.addEventListener('change', applyFiltersAndRender);

function applyFiltersAndRender() {
    let filtered = [...allJobs];

    // Filter
    const status = statusFilter.value;
    if (status !== 'All') {
        filtered = filtered.filter(job => job.status === status);
    }

    // Sort
    const sort = sortOrder.value;
    filtered.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.seconds : 0;
        const dateB = b.createdAt ? b.createdAt.seconds : 0;

        switch (sort) {
            case 'newest': return dateB - dateA;
            case 'oldest': return dateA - dateB;
            case 'score_desc': return (b.latestAtsScore || 0) - (a.latestAtsScore || 0);
            case 'score_asc': return (a.latestAtsScore || 0) - (b.latestAtsScore || 0);
            default: return 0;
        }
    });

    renderTable(filtered);
}

// ============================================================================
// RENDERING
// ============================================================================

function renderTable(jobs) {
    jobListBody.innerHTML = '';

    if (jobs.length === 0) {
        jobListBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#888;">No jobs found.</td></tr>`;
        return;
    }

    jobs.forEach(job => {
        const tr = document.createElement('tr');

        // Status Badge
        let badgeClass = 'badge-queued';
        if (job.status === 'Done') badgeClass = 'badge-done';
        else if (job.status === 'Processing') badgeClass = 'badge-processing';
        else if (job.status === 'Error') badgeClass = 'badge-error';

        // Date
        const dateStr = job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleString() : '—';

        // Actions
        let actions = ``;
        if (job.status === 'Done') {
            actions = `<button class="btn btn-primary download-btn" data-id="${job.id}">Download</button>`;
        } else if (job.status === 'Error') {
            actions = `<button class="btn retry-btn" data-id="${job.id}">Retry ⟳</button>`;
        }

        actions += ` <a href="${job.url}" target="_blank" class="btn" style="text-decoration:none; margin-left:5px;">Original</a>`;

        // Score Color
        let score = job.latestAtsScore || 0;
        let scoreColor = '#6b7280';
        if (score >= 80) scoreColor = '#059669';
        else if (score >= 50) scoreColor = '#d97706';
        else if (score > 0) scoreColor = '#dc2626';

        tr.innerHTML = `
            <td><span class="badge ${badgeClass}">${job.status}</span></td>
            <td style="font-weight:600;">${job.company || 'Unknown'}</td>
            <td>${job.jobTitle || 'Job Description'}</td>
            <td>
                <div class="score-indicator" style="color:${scoreColor}">
                   ${score > 0 ? score + '%' : '—'}
                </div>
            </td>
            <td style="font-size:0.8em; color:#666;">${dateStr}</td>
            <td style="text-align:right;">${actions}</td>
        `;

        jobListBody.appendChild(tr);
    });

    // Attach Event Listeners
    document.querySelectorAll('.retry-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleRetry(e.target.getAttribute('data-id')));
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDownload(e.target.getAttribute('data-id')));
    });
}

// ============================================================================
// ACTIONS (via JobService)
// ============================================================================

async function handleDownload(jobId) {
    const btn = document.querySelector(`button.download-btn[data-id="${jobId}"]`);
    const originalText = btn ? btn.textContent : "Download";

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Getting Link...";
    }

    try {
        const { url } = await JobService.getDownloadUrl(jobId);
        window.open(url, '_blank');
    } catch (error) {
        console.error("Download error:", error);
        alert("Failed to get download link: " + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

async function handleRetry(jobId) {
    if (!confirm("Retry this job?")) return;

    const btn = document.querySelector(`button.retry-btn[data-id="${jobId}"]`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Retrying...";
    }

    try {
        await JobService.retryJob(jobId);
        // Firestore listener will update UI automatically
    } catch (error) {
        console.error("Retry error:", error);
        alert("Failed to retry job: " + error.message);
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Retry ⟳";
        }
    }
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

async function loadProfile(uid) {
    try {
        const profile = await JobService.getUserProfile(uid);
        if (profile && profile.masterResume) {
            masterResumeRaw.value = profile.masterResume;
        }
    } catch (error) {
        console.error("Failed to load profile:", error);
    }
}

saveProfileBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const latex = masterResumeRaw.value.trim();

    if (!latex) {
        showSaveStatus("Please enter your LaTeX resume code.", "error");
        return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";
    showSaveStatus("");

    try {
        await JobService.updateUserProfile(uid, {
            masterResume: latex,
            email: auth.currentUser.email
        });
        showSaveStatus("Profile saved successfully!", "success");
    } catch (error) {
        console.error("Save error:", error);
        showSaveStatus("Error saving: " + error.message, "error");
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Template";
    }
});

function showSaveStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = "save-status " + (type || "");
}
