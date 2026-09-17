import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCCm42l1rBL8PUGtpx4uHXFt-HRKac8PEE",
  authDomain: "peta-ppk.firebaseapp.com",
  projectId: "peta-ppk",
  storageBucket: "peta-ppk.firebasestorage.app",
  messagingSenderId: "1078162428357",
  appId: "1:1078162428357:web:6219a46f7c724db237bbac"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
