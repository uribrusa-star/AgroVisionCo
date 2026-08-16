import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
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
