// Firebase Configuration
import { initializeApp } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    projectId: "YOUR_PROJECT_ID",
    appId: "1:YOUR_PROJECT_NUMBER:web:0c2013328d49d3b9bfc1f1",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    messagingSenderId: "YOUR_PROJECT_NUMBER"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});
export const db = getFirestore(app);
export const storage = getStorage(app);
