import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estId = searchParams.get('estId') || 'EST-003';
    
    const snapshot = await adminDb.collection('collectors').where('establishmentId', '==', estId).get();
    const harvestsSnap = await adminDb.collection('harvests').where('establishmentId', '==', estId).get();
    const usersSnap = await adminDb.collection('users').where('establishmentId', '==', estId).get();
    
    return NextResponse.json({ 
      success: true, 
      establishmentId: estId,
      collectorsCount: snapshot.size, 
      harvestsCount: harvestsSnap.size,
      usersCount: usersSnap.size,
      users: usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      collectors: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
