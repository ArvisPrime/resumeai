import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";

import { firebaseConfig, siteKey } from "./secrets";

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: false // Managed by main app
});

window.addEventListener('message', async (event) => {
    if (event.data.type === 'GET_APP_CHECK_TOKEN') {
        try {
            const result = await getToken(appCheck, event.data.forceRefresh || false);
            window.parent.postMessage({
                type: 'APP_CHECK_TOKEN_RESULT',
                token: result.token,
                expireTimeMillis: result.expireTimeMillis
            }, '*');
        } catch (error) {
            console.error("Sandbox App Check Error:", error);
            window.parent.postMessage({
                type: 'APP_CHECK_TOKEN_ERROR',
                error: error.message
            }, '*');
        }
    }
});

window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
console.log("App Check Sandbox Ready");
