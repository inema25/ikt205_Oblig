// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDtgPDajdVLW4dHyjKnc4rpEM71SICN_6c",
    authDomain: "ikt205g25v-c9cbd.firebaseapp.com",
    projectId: "ikt205g25v-c9cbd",
    storageBucket: "ikt205g25v-c9cbd.firebasestorage.app",
    messagingSenderId: "1038920115121",
    appId: "1:1038920115121:web:0bce670296eb41d651d390",
    measurementId: "G-3P2M5GL0G5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };