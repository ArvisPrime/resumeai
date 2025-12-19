// Firebase Configuration
import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, CustomProvider } from "firebase/app-check";

import { firebaseConfig } from "./secrets";

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize App Check
if (typeof window !== 'undefined') {
    initializeAppCheck(app, {
        provider: new CustomProvider({
            getToken: async (forceRefresh) => {
                // Return debug token if configured, otherwise provide instructions
                if (firebaseConfig.appCheckDebugToken) {
                    return {
                        token: firebaseConfig.appCheckDebugToken,
                        expireTimeMillis: Date.now() + 3600000
                    };
                }
                console.warn("App Check: No debug token provided. Security enforced on backend.");
                return null;
            }
        }),
        isTokenAutoRefreshEnabled: true
    });
}
