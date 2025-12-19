/**
 * ConfigService - Fetches and caches configuration from Firestore
 */

const CONFIG_COLLECTION = "config";
const CONFIG_DOC = "app";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedConfig = null;
let cacheTimestamp = 0;

let SECRETS_CONFIG = {};
try {
    SECRETS_CONFIG = require('./secrets_config');
} catch (e) {
    console.info("Using empty SECRETS_CONFIG (secrets_config.js not found)");
}

/**
 * Default configuration (fallback if Firestore is unavailable)
 * This uses placeholders in the public repo, but your local setup
 * will use the values defined in secrets_config.js.
 */
const DEFAULT_CONFIG = {
    geminiModel: "gemini-3-flash-preview",
    geminiApiVersion: "v1beta",
    ...SECRETS_CONFIG
};

class ConfigService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get configuration, using cache if valid
     * @returns {Promise<object>}
     */
    async getConfig() {
        const now = Date.now();

        // Return cached config if still valid
        if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return cachedConfig;
        }

        try {
            const docRef = this.db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                cachedConfig = { ...DEFAULT_CONFIG, ...docSnap.data() };
            } else {
                console.warn("Config document not found, using defaults");
                cachedConfig = DEFAULT_CONFIG;

                // Create the document with defaults for future use
                await docRef.set(DEFAULT_CONFIG);
            }

            cacheTimestamp = now;
            return cachedConfig;

        } catch (error) {
            console.error("Error fetching config:", error);
            return DEFAULT_CONFIG;
        }
    }

    /**
     * Get a specific config value
     * @param {string} key - The config key
     * @returns {Promise<any>}
     */
    async get(key) {
        const config = await this.getConfig();
        return config[key];
    }

    /**
     * Force refresh the cache
     */
    invalidateCache() {
        cachedConfig = null;
        cacheTimestamp = 0;
    }
}

module.exports = ConfigService;
