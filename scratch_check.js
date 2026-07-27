const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function check() {
    const s2 = await db.collection('users').where('email', '==', 'enc1-est002@agrovista.co').get();
    console.log("Encargado:", s2.empty ? "NO" : s2.docs[0].data());
}

require('dotenv').config({ path: '.env.local' });
check();
