import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { adminDb } from '@/lib/firebase-admin';
import type { AttendanceLog } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ logs: [] });
    }

    const estId = session.user.establishmentId || 'main';
    
    // Obtener registros de asistencia con permisos de administrador (bypasea reglas de cliente)
    const snapshot = await adminDb
      .collection('attendanceLogs')
      .where('establishmentId', '==', estId)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AttendanceLog)).sort((a, b) => 
      new Date(b.checkIn || b.date).getTime() - new Date(a.checkIn || a.date).getTime()
    );

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching attendance logs from admin API:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const payload = await request.json();
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Datos de asistencia inválidos' }, { status: 400 });
    }

    const estId = session.user.establishmentId || 'main';
    const logData = {
      ...payload,
      establishmentId: payload.establishmentId || estId,
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('attendanceLogs').doc(payload.id).set(logData, { merge: true });

    return NextResponse.json({ success: true, log: logData });
  } catch (error: any) {
    console.error('Error saving attendance log via admin API:', error);
    return NextResponse.json({ error: error?.message || 'Error interno al guardar' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await adminDb.collection('attendanceLogs').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting attendance log via admin API:', error);
    return NextResponse.json({ error: error?.message || 'Error interno al eliminar' }, { status: 500 });
  }
}
