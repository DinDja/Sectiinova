import { initializeApp } from "firebase/app";
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

export { app, db, auth, storage };
