import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDgn7sV5n4QUojSUbed07jxK1CISRpG5TU",
  authDomain: "inovasecti-a3dea.firebaseapp.com",
  projectId: "inovasecti-a3dea",
  storageBucket: "inovasecti-a3dea.firebasestorage.app",
  messagingSenderId: "151677863168",
  appId: "1:151677863168:web:0b452808337ffebcf05fe5",
  measurementId: "G-5Y2FZE92CP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
let appCheck = null;

const appCheckSiteKey = String(
  import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || "",
).trim();

if (typeof window !== "undefined" && appCheckSiteKey) {
  try {
    const hostname = String(window.location?.hostname || "").toLowerCase();
    const isLocalhost =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const debugToken = String(
      import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || "",
    ).trim();

    if (isLocalhost && debugToken) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN =
        debugToken === "true" ? true : debugToken;
    }

    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("Falha ao inicializar o Firebase App Check:", error);
  }
}

export { app, appCheck, db, auth, storage };
