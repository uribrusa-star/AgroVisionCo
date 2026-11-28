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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
