import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

import { getRoleAvatar } from '@/lib/utils';

function parseFirestoreDoc(doc: any): User | null {
  if (!doc || !doc.document || !doc.document.fields) return null;
  const fields = doc.document.fields;
  const id = doc.document.name.split('/').pop() || '';
  const parseVal = (v: any) => {
    if (!v) return undefined;
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.doubleValue !== undefined) return Number(v.doubleValue);
    return undefined;
  };
  const role = (parseVal(fields.role) || 'Productor') as any;
  return {
    id,
    name: parseVal(fields.name) || '',
    email: parseVal(fields.email) || '',
    role,
    password: parseVal(fields.password) || '',
    notificationEmail: parseVal(fields.notificationEmail) || '',
    avatar: getRoleAvatar(role),
    phone: parseVal(fields.phone),
    specialty: parseVal(fields.specialty),
    producerId: parseVal(fields.producerId),
    lastLoginAt: parseVal(fields.lastLoginAt)
  } as User;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    const { email, password, clientUser } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales.' }, { status: 400 });
    }

    let user: User | null = null;

    // 1. Verificación instantánea si el cliente ya sincronizó el usuario en vivo (evita sockets gRPC/HTTP2 en Vercel que causan 502 Bad Gateway)
    if (clientUser && clientUser.email?.toLowerCase() === email.toLowerCase() && clientUser.password === password) {
      user = clientUser as User;
    } else {
      // 2. Usar Admin SDK para saltarse las reglas de seguridad de Firestore (ya que no hay usuario logueado aún)
      try {
        const usersSnapshot = await adminDb.collection('users').where('email', '==', email).get();
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          user = { id: userDoc.id, ...userDoc.data() } as User;
        }
      } catch (error) {
        console.error('Error fetching user with adminDb:', error);
      }
    }

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }
    
    // Update lastLoginAt
    const lastLoginAt = new Date().toISOString();
    try {
      await adminDb.collection('users').doc(user.id).update({
        lastLoginAt
      });
      user.lastLoginAt = lastLoginAt;
    } catch (e) {
      console.error('Error updating lastLoginAt:', e);
    }
    
    // Omitimos el password antes de guardar en la sesión por seguridad
    const { password: _, ...userToSave } = user;

    // Generar un token personalizado para que el cliente (Navegador) pueda iniciar sesión en Firebase Auth
    const customToken = await adminAuth.createCustomToken(user.id);

    // Guardar los datos del usuario en la sesión de Iron Session
    session.user = userToSave;
    await session.save();

    return NextResponse.json({ user: userToSave, firebaseToken: customToken });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor al intentar iniciar sesión.' }, 
      { status: 500 }
    );
  }
}