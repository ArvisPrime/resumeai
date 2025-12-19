// Firebase Configuration
import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

import { firebaseConfig } from "./secrets";

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize App Check
class AppCheckBridge {
    constructor() {
        this.iframe = null;
        this.isReady = false;
        this.pendingResolve = null;
        this.pendingReject = null;
        this.queuedRequests = [];
        this._setupIframe();
    }

    _setupIframe() {
        if (typeof document === 'undefined') return;
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'sandbox.html';
        this.iframe.style.display = 'none';
        document.body.appendChild(this.iframe);

        window.addEventListener('message', (event) => {
            if (event.data.type === 'SANDBOX_READY') {
                this.isReady = true;
                this.queuedRequests.forEach(req => this._sendRequest(req));
                this.queuedRequests = [];
            } else if (event.data.type === 'APP_CHECK_TOKEN_RESULT') {
                if (this.pendingResolve) {
                    this.pendingResolve({
                        token: event.data.token,
                        expireTimeMillis: event.data.expireTimeMillis
                    });
                    this.pendingResolve = null;
                }
            } else if (event.data.type === 'APP_CHECK_TOKEN_ERROR') {
                if (this.pendingReject) {
                    this.pendingReject(new Error(event.data.error));
                    this.pendingReject = null;
                }
            }
        });
    }

    getToken(forceRefresh) {
        return new Promise((resolve, reject) => {
            const request = { resolve, reject, forceRefresh };
            if (this.isReady) {
                this._sendRequest(request);
            } else {
                this.queuedRequests.push(request);
            }
        });
    }

    _sendRequest(request) {
        this.pendingResolve = request.resolve;
        this.pendingReject = request.reject;
        this.iframe.contentWindow.postMessage({
            type: 'GET_APP_CHECK_TOKEN',
            forceRefresh: request.forceRefresh
        }, '*');
    }
}

if (typeof window !== 'undefined') {
    const bridge = new AppCheckBridge();
    initializeAppCheck(app, {
        provider: {
            getToken: (forceRefresh) => bridge.getToken(forceRefresh)
        },
        isTokenAutoRefreshEnabled: true
    });
}
