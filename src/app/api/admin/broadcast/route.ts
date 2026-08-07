import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user || session.user.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const { title, body, severity } = await request.json();

    if (!title || !body || !severity) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    // 1. Obtener todos los usuarios
    const usersSnapshot = await adminDb.collection('users').get();
    
    // 2. Crear las notificaciones en lotes (batches de a 500)
    let batch = adminDb.batch();
    let count = 0;
    
    for (const doc of usersSnapshot.docs) {
      const notificationRef = adminDb.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: doc.id,
        title,
        body,
        severity,
        read: false,
        createdAt: new Date().toISOString()
      });
      
      count++;
      
      // Si llegamos a 500 operaciones, enviamos el lote y abrimos uno nuevo
      if (count === 500) {
        await batch.commit();
        batch = adminDb.batch();
        count = 0;
      }
    }
    
    // Enviar el lote restante
    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: usersSnapshot.size });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificaciones masivas.' }, 
      { status: 500 }
    );
  }
}
