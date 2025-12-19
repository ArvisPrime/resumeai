/**
 * JobService - Abstracts all API and Firestore interactions
 */

import { auth, db } from '../firebase-config';
import { appConfig } from '../secrets';
import { collection, query, where, orderBy, onSnapshot, limit, doc, getDoc, setDoc, serverTimestamp, addDoc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";

// Config Cache
let cachedConfig = null;

/**
 * Fetch configuration from Firestore
 */
async function getConfig() {
    if (cachedConfig) return cachedConfig;

    try {
        const configDoc = await getDoc(doc(db, "config", "app"));
        if (configDoc.exists()) {
            cachedConfig = configDoc.data();
        } else {
            // Fallback defaults
            cachedConfig = appConfig;
        }
    } catch (error) {
        console.error("Failed to fetch config:", error);
        cachedConfig = appConfig;
    }

    return cachedConfig;
}

/**
 * Get API endpoint URL
 */
async function getEndpoint(name) {
    const config = await getConfig();

    if (config.endpoints && config.endpoints[name]) {
        return config.endpoints[name];
    }

    // Fallback to constructed URL
    const baseUrl = `https://${config.region}-${config.projectId}.cloudfunctions.net`;
    return `${baseUrl}/${name}`;
}

/**
 * Get current user's ID token for authenticated requests
 */
async function getAuthToken() {
    if (!auth.currentUser) {
        throw new Error("Not authenticated");
    }
    return auth.currentUser.getIdToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpointName, body) {
    const token = await getAuthToken();
    const endpoint = await getEndpoint(endpointName);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

/**
 * JobService Class
 */
class JobService {
    /**
     * Submit a new job for processing
     * @param {string} url - The job posting URL
     * @param {string} description - The scraped job description
     * @returns {Promise<{jobId: string, status: string}>}
     */
    static async submitJob(url, description, trackId = 'default') {
        return apiRequest('clipJob', { url, description, trackId });
    }

    /**
     * Subscribe to real-time updates for a single job
     * @param {string} jobId - The job document ID
     * @param {function} callback - Called with job data on each update
     * @returns {function} Unsubscribe function
     */
    static subscribeToJob(jobId, callback) {
        return onSnapshot(doc(db, "job_queue", jobId), (snapshot) => {
            if (snapshot.exists()) {
                callback({ id: snapshot.id, ...snapshot.data() });
            }
        });
    }

    /**
     * Subscribe to real-time job updates for a user
     * @param {string} userId - The user's Firebase UID
     * @param {function} callback - Called with array of jobs on each update
     * @returns {function} Unsubscribe function
     */
    static subscribeToJobs(userId, callback) {
        const q = query(
            collection(db, "job_queue"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(100)
        );

        return onSnapshot(q, (snapshot) => {
            const jobs = [];
            snapshot.forEach((doc) => {
                jobs.push({ id: doc.id, ...doc.data() });
            });
            callback(jobs);
        });
    }

    /**
     * Retry a failed job
     * @param {string} jobId - The job document ID
     * @returns {Promise<{status: string, message: string}>}
     */
    static async retryJob(jobId) {
        return apiRequest('retryJob', { jobId });
    }

    /**
     * Delete a job from history
     */
    static async deleteJob(jobId) {
        await deleteDoc(doc(db, "job_queue", jobId));
    }

    /**
     * Get a short-lived download URL for a completed job
     * @param {string} jobId - The job document ID
     * @returns {Promise<{url: string}>}
     */
    static async getDownloadUrl(jobId) {
        return apiRequest('getDownloadLink', { jobId });
    }

    /**
     * Get user profile (master resume)
     * @param {string} userId - The user's Firebase UID
     * @returns {Promise<any>}
     */
    static async getUserProfile(userId) {
        const profileDoc = await getDoc(doc(db, "profiles", userId));
        return profileDoc.exists() ? profileDoc.data() : null;
    }

    /**
     * Update user profile (master resume)
     * @param {string} userId - The user's Firebase UID
     * @param {object} profileData - Profile data to save
     * @returns {Promise<void>}
     */
    static async updateUserProfile(userId, profileData) {
        await setDoc(doc(db, "profiles", userId), {
            ...profileData,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    /**
     * Get all resume tracks for a user
     */
    static async getResumeTracks(userId) {
        const tracksRef = collection(db, "profiles", userId, "tracks");
        const snap = await getDocs(query(tracksRef, orderBy("name", "asc")));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Add a new resume track
     */
    static async addResumeTrack(userId, name, latex) {
        const tracksRef = collection(db, "profiles", userId, "tracks");
        const docRef = await addDoc(tracksRef, {
            name,
            latex,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    }

    /**
     * Update an existing track
     */
    static async updateResumeTrack(userId, trackId, data) {
        const trackRef = doc(db, "profiles", userId, "tracks", trackId);
        await updateDoc(trackRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    }

    /**
     * Delete a resume track
     */
    static async deleteResumeTrack(userId, trackId) {
        const trackRef = doc(db, "profiles", userId, "tracks", trackId);
        await deleteDoc(trackRef);
    }

    /**
     * Clear cached config (useful after admin updates)
     */
    static clearConfigCache() {
        cachedConfig = null;
    }
}

export default JobService;
