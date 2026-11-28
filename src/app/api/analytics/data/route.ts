import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);
    if (!session.user || session.user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection('webAnalytics')
      .orderBy('date', 'desc')
      .limit(30)
      .get();

    const data: any[] = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching analytics from admin API:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}
