import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, getFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { getMessaging, isSupported } from 'firebase/messaging';
const firebaseConfig = {
  "projectId": "studio-1014760813-be189",
  "appId": "1:772501385922:web:739fa93cd99c91c393c15b",
  "storageBucket": "studio-1014760813-be189.firebasestorage.app",
  "apiKey": "AIzaSyDECON6YrcAh9R8M8prlaYt937dFyNjnN4",
  "authDomain": "studio-1014760813-be189.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "772501385922"
};

// Inicializar la App de Firebase (evita duplicados)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializar el servicio de Autenticación
const auth = getAuth(app); 

// Inicializar Firestore con persistencia de datos local optimizada para iOS/Safari
let db;
try {
    // Definimos un tamaño de caché razonable para dispositivos móviles (50 MB)
    const CACHE_SIZE = 50 * 1024 * 1024;
    
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ 
          cacheSizeBytes: CACHE_SIZE 
        }),
    });
} catch (e: any) {
    console.warn("No se pudo inicializar Firestore con persistencia local, fallando a memoria:", e);
    // Fallback a memoria si la persistencia falla (común en modo privado de Safari o SSR)
    db = getFirestore(app);
}

// Inicializar el servicio de notificaciones Push (Solo en el cliente si está soportado)
export const setupMessaging = async () => {
    try {
        const supported = await isSupported();
        if (supported && typeof window !== 'undefined') {
            return getMessaging(app);
        }
    } catch(err) {
        console.warn("FCM no está soportado en este entorno", err);
    }
    return null;
}

// Exportación fundamental para que layout.tsx y los APIs funcionen
export { db, auth, app };