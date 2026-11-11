import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);

  if (!session.user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const updates = await request.json();

    // Actualizar campos en la sesión segura de Iron Session
    if (updates.name !== undefined) session.user.name = updates.name;
    if (updates.notificationEmail !== undefined) session.user.notificationEmail = updates.notificationEmail;
    if (updates.avatar !== undefined) session.user.avatar = updates.avatar;
    if (updates.bottomNavEnabled !== undefined) session.user.bottomNavEnabled = updates.bottomNavEnabled;
    if (updates.bottomNavItems !== undefined) session.user.bottomNavItems = updates.bottomNavItems;

    await session.save();

    // Sincronizar en Firestore a través de adminDb si está disponible
    if (adminDb && session.user.id) {
      try {
        const firestoreUpdates: Record<string, any> = {
          updatedAt: new Date().toISOString()
        };
        if (updates.name !== undefined) firestoreUpdates.name = updates.name;
        if (updates.notificationEmail !== undefined) firestoreUpdates.notificationEmail = updates.notificationEmail;
        if (updates.avatar !== undefined) firestoreUpdates.avatar = updates.avatar;
        if (updates.bottomNavEnabled !== undefined) firestoreUpdates.bottomNavEnabled = updates.bottomNavEnabled;
        if (updates.bottomNavItems !== undefined) firestoreUpdates.bottomNavItems = updates.bottomNavItems;

        await adminDb.collection('users').doc(session.user.id).set(firestoreUpdates, { merge: true });

        // Si es el productor, asegurar persistencia en el ID canónico 'user-productor'
        if (session.user.id === 'user-productor' || session.user.role === 'Productor') {
          await adminDb.collection('users').doc('user-productor').set(firestoreUpdates, { merge: true }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn('Warning syncing session user patch to adminDb:', dbErr);
      }
    }

    return NextResponse.json({ success: true, user: session.user });
  } catch (error) {
    console.error('Error updating session user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
