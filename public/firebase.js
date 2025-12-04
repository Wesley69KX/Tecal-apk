// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbWgRpYBguSf5J9xYG7EwH6tx0xxBEvV4",
  authDomain: "gestao-torres.firebaseapp.com",
  projectId: "gestao-torres",
  storageBucket: "gestao-torres.firebasestorage.app",
  messagingSenderId: "580007649384",
  appId: "1:580007649384:web:568bd6c711bb9e0df35bdd",
  measurementId: "G-P6N25K7R4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
