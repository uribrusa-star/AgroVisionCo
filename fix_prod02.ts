import { config } from 'dotenv';
config({ path: '.env.local' });
import { adminDb } from './src/lib/firebase-admin';

async function fix() {
    const snapshot = await adminDb.collection('users').where('email', '==', 'productor02@agrovista.co').get();
    if (snapshot.empty) {
        console.log("No se encontro productor02");
        return;
    }
    const doc = snapshot.docs[0];
    console.log("DATA ANTES:", doc.data());
    await doc.ref.update({
        establishmentId: "EST-002",
        password: doc.data().password || "uribrusa"
    });
    console.log("Corregido! DATA AHORA:", (await doc.ref.get()).data());
}

fix();
