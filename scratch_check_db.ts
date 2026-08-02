import { adminDb } from './src/lib/firebase-admin.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  console.log("Checking EST-003 data...");
  const collectors = await adminDb.collection('collectors').where('establishmentId', '==', 'EST-003').get();
  console.log("Collectors in EST-003:", collectors.size);
  collectors.forEach(doc => console.log(doc.id, doc.data()));

  const harvests = await adminDb.collection('harvests').where('establishmentId', '==', 'EST-003').get();
  console.log("Harvests in EST-003:", harvests.size);
  harvests.forEach(doc => console.log(doc.id, doc.data()));
}

check().catch(console.error);
