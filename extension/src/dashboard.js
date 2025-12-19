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
const welcomeCard = document.getElementById('welcomeCard');
const goToProfileBtn = document.getElementById('goToProfileBtn');

// Nav & Sections
const tabJobs = document.getElementById('tabJobs');
const tabProfile = document.getElementById('tabProfile');
const jobsSection = document.getElementById('jobsSection');
const profileSection = document.getElementById('profileSection');

// Profile Elements
const trackList = document.getElementById('trackList');
const addTrackBtn = document.getElementById('addTrackBtn');
const currentTrackName = document.getElementById('currentTrackName');
const masterResumeRaw = document.getElementById('masterResumeRaw');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const deleteTrackBtn = document.getElementById('deleteTrackBtn');
const saveStatus = document.getElementById('saveStatus');

// State
let allJobs = [];
let allTracks = [];
let currentTrackId = null;
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
        loadProfileAndTracks(user.uid);
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
        controlBar.style.display = 'flex';
        // Show/Hide table vs welcome card
        if (allJobs.length === 0) {
            jobsTable.classList.add('hidden');
            welcomeCard.classList.remove('hidden');
        } else {
            jobsTable.classList.remove('hidden');
            welcomeCard.classList.add('hidden');
        }
    } else {
        tabProfile.classList.add('active');
        tabJobs.classList.remove('active');
        profileSection.classList.remove('hidden');
        jobsSection.classList.add('hidden');
        controlBar.style.display = 'none';
        welcomeCard.classList.add('hidden');
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

        if (jobs.length === 0) {
            jobsTable.classList.add('hidden');
            welcomeCard.classList.remove('hidden');
            controlBar.classList.add('hidden');
        } else {
            jobsTable.classList.remove('hidden');
            welcomeCard.classList.add('hidden');
            controlBar.classList.remove('hidden');
        }

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
        const activeStatuses = ['Processing', 'Preparing', 'Analyzing', 'Tailoring', 'Generating PDF', 'Finalizing'];

        if (job.status === 'Done') {
            badgeClass = 'badge-done';
        } else if (job.status === 'Error') {
            badgeClass = 'badge-error';
        } else if (activeStatuses.includes(job.status)) {
            badgeClass = 'badge-processing badge-pulse';
        }

        // Date
        const dateStr = job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleString() : '—';

        // Actions
        let actions = ``;
        if (job.status === 'Done') {
            actions = `<button class="btn btn-primary download-btn" data-id="${job.id}">Download</button>`;
        } else if (job.status === 'Error') {
            actions = `<button class="btn retry-btn" data-id="${job.id}">Retry ⟳</button>`;
        }

        if (job.tailoredLatex) {
            actions += `<button class="btn btn-ghost source-btn" data-id="${job.id}" style="margin-left:5px;">Source</button>`;
        }

        actions += ` <a href="${job.url}" target="_blank" class="btn" style="text-decoration:none; margin-left:5px;">Link</a>`;
        actions += `<button class="btn btn-danger delete-job-btn" data-id="${job.id}" style="margin-left:5px;" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>`;

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

    document.querySelectorAll('.retry-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleRetry(e.target.closest('button').getAttribute('data-id')));
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDownload(e.target.closest('button').getAttribute('data-id')));
    });

    document.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleViewSource(e.target.closest('button').getAttribute('data-id')));
    });

    document.querySelectorAll('.delete-job-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDelete(e.target.closest('button').getAttribute('data-id')));
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
    } catch (error) {
        console.error("Retry error:", error);
        alert("Failed to retry job: " + error.message);
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Retry ⟳";
        }
    }
}

async function handleDelete(jobId) {
    if (!confirm("Delete this job from history? This will also remove the associated PDF.")) return;

    try {
        await JobService.deleteJob(jobId);
    } catch (error) {
        alert("Failed to delete: " + error.message);
    }
}

function handleViewSource(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job || !job.tailoredLatex) return;

    const modal = document.getElementById('latexModal');
    const display = document.getElementById('latexDisplay');

    display.value = job.tailoredLatex;
    modal.classList.remove('hidden');
}

// Modal Listeners
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('latexModal').classList.add('hidden');
});

document.getElementById('copyLatexBtn').addEventListener('click', async () => {
    const text = document.getElementById('latexDisplay').value;
    const btn = document.getElementById('copyLatexBtn');

    try {
        await navigator.clipboard.writeText(text);
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = originalText, 2000);
    } catch (err) {
        alert("Failed to copy!");
    }
});

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

// ============================================================================
// PROFILE & TRACKS MANAGEMENT
// ============================================================================

async function loadProfileAndTracks(uid) {
    try {
        const profile = await JobService.getUserProfile(uid);
        const tracks = await JobService.getResumeTracks(uid);

        allTracks = tracks;

        // Migration logic: If old masterResume exists but no tracks, create a default track
        if (allTracks.length === 0 && profile && profile.masterResume) {
            console.log("Migrating legacy profile to tracks...");
            const trackId = await JobService.addResumeTrack(uid, "Professional Default", profile.masterResume);
            allTracks = [{ id: trackId, name: "Professional Default", latex: profile.masterResume }];
        }

        renderTracks();

        if (allTracks.length > 0 && !currentTrackId) {
            selectTrack(allTracks[0].id);
        }
    } catch (error) {
        console.error("Failed to load profile/tracks:", error);
    }
}

function renderTracks() {
    trackList.innerHTML = '';

    allTracks.forEach(track => {
        const div = document.createElement('div');
        div.className = `track-item ${track.id === currentTrackId ? 'active' : ''}`;
        div.dataset.id = track.id;
        div.innerHTML = `
            <span>${track.name}</span>
        `;
        div.onclick = () => selectTrack(track.id);
        trackList.appendChild(div);
    });
}

function selectTrack(trackId) {
    currentTrackId = trackId;
    const track = allTracks.find(t => t.id === trackId);

    if (track) {
        currentTrackName.textContent = track.name;
        masterResumeRaw.value = track.latex;
        deleteTrackBtn.classList.remove('hidden');
    } else {
        currentTrackName.textContent = "Select a Track";
        masterResumeRaw.value = "";
        deleteTrackBtn.classList.add('hidden');
    }

    renderTracks();
}

addTrackBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;

    const name = prompt("Enter a name for this resume track (e.g. 'Software Engineer', 'Data Science'):");
    if (!name) return;

    try {
        const trackId = await JobService.addResumeTrack(auth.currentUser.uid, name, "");
        allTracks.push({ id: trackId, name, latex: "" });
        selectTrack(trackId);
        showSaveStatus("Track created!", "success");
    } catch (error) {
        alert("Failed to create track: " + error.message);
    }
});

deleteTrackBtn.addEventListener('click', async () => {
    if (!currentTrackId || !auth.currentUser) return;
    if (!confirm("Are you sure you want to delete this track? This cannot be undone.")) return;

    try {
        await JobService.deleteResumeTrack(auth.currentUser.uid, currentTrackId);
        allTracks = allTracks.filter(t => t.id !== currentTrackId);
        currentTrackId = null;
        if (allTracks.length > 0) {
            selectTrack(allTracks[0].id);
        } else {
            selectTrack(null);
        }
        showSaveStatus("Track deleted", "success");
    } catch (error) {
        alert("Failed to delete track: " + error.message);
    }
});

saveProfileBtn.addEventListener('click', async () => {
    if (!auth.currentUser || !currentTrackId) {
        showSaveStatus("Select a track first.", "error");
        return;
    }

    const uid = auth.currentUser.uid;
    const latex = masterResumeRaw.value.trim();

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = "Saving...";
    showSaveStatus("");

    try {
        await JobService.updateResumeTrack(uid, currentTrackId, {
            latex: latex
        });

        // Update local state
        const track = allTracks.find(t => t.id === currentTrackId);
        if (track) track.latex = latex;

        showSaveStatus("Track saved successfully!", "success");
    } catch (error) {
        console.error("Save error:", error);
        showSaveStatus("Error saving: " + error.message, "error");
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save Changes";
    }
});

function showSaveStatus(msg, type) {
    saveStatus.textContent = msg;
    saveStatus.className = "save-status " + (type || "");
}

if (goToProfileBtn) {
    goToProfileBtn.addEventListener('click', () => switchTab('profile'));
}
