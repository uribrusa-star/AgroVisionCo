import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user || session.user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'No autorizado. Solo SuperAdmin.' }, { status: 401 });
    }

    const collectionsToUpdate = [
      'collectors', 'packers', 'harvests', 'agronomistLogs', 'phenologyLogs', 
      'predictionLogs', 'diagnosisLogs', 'supplies', 'tasks', 'batches', 
      'collectorPaymentLogs', 'packagingLogs', 'culturalPracticeLogs', 
      'producerLogs', 'transactions', 'knowledge'
    ];

    let totalUpdated = 0;

    for (const collectionName of collectionsToUpdate) {
      const snapshot = await adminDb.collection(collectionName).get();
      const batch = adminDb.batch();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.establishmentId) {
          batch.update(doc.ref, { establishmentId: 'main' });
          totalUpdated++;
        }
      });
      
      if (snapshot.size > 0) {
          await batch.commit();
      }
    }

    // Also update users to have establishmentId: 'main' if not set
    const usersSnapshot = await adminDb.collection('users').get();
    const userBatch = adminDb.batch();
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.establishmentId) {
        userBatch.update(doc.ref, { establishmentId: 'main' });
      }
    });
    if (usersSnapshot.size > 0) {
        await userBatch.commit();
    }

    return NextResponse.json({ success: true, message: `Migrated ${totalUpdated} documents to establishmentId: 'main'` });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
