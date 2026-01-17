import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, getFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 

const firebaseConfig = {
  "projectId": "studio-1014760813-be189",
  "appId": "1:772501385922:web:739fa93cd99c91c393c15b",
  "storageBucket": "studio-1014760813-be189.firebasestorage.app",
  "apiKey": "AIzaSyAIIOa4Sz_lyPVHyqGjNm3Px13XjlvxDlY",
  "authDomain": "studio-1014760813-be189.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "772501385922"
};

// Inicializar la App de Firebase (evita duplicados)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializar el servicio de Autenticación
const auth = getAuth(app); 

// Inicializar Firestore con persistencia de datos local
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
    });
} catch (e: any) {
    console.error("No se pudo inicializar Firestore con persistencia local", e);
    // Fallback a memoria si la persistencia falla (común en SSR o entornos privados)
    db = getFirestore(app);
}

// Exportación fundamental para que layout.tsx y los APIs funcionen
export { db, auth, app };