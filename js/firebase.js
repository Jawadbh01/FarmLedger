// FarmLedger - Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpTPibk-7_kqyJdfN94KrLlcKkoNnqIYE",
  authDomain: "farmledger-e85e3.firebaseapp.com",
  projectId: "farmledger-e85e3",
  storageBucket: "farmledger-e85e3.firebasestorage.app",
  messagingSenderId: "922324809308",
  appId: "1:922324809308:web:05c015ce12e55034e99899"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
