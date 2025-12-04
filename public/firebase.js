// ===============================
// Firebase Configuração Oficial
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// === SUA CONFIGURAÇÃO QUE VOCÊ ENVIOU ===
const firebaseConfig = {
  apiKey: "AIzaSyAbWgRpYBguSf5J9xYG7EwH6tx0xxBEvV4",
  authDomain: "gestao-torres.firebaseapp.com",
  projectId: "gestao-torres",
  storageBucket: "gestao-torres.firebasestorage.app",
  messagingSenderId: "580007649384",
  appId: "1:580007649384:web:568bd6c711bb9e0df35bdd",
  measurementId: "G-P6N25K7R4X"
};

// ===============================
// Inicializar Firebase
// ===============================
export const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage para Upload de Fotos
export const storage = getStorage(app);

// Auth (opcional — login futuramente)
export const auth = getAuth(app);
