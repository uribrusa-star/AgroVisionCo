import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

import { getRoleAvatar } from '@/lib/utils';
import { users as mockUsers } from '@/lib/data';

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

    let { email, password, clientUser } = await request.json();
    email = email?.toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales.' }, { status: 400 });
    }

    let user: User | null = null;

    // 1. Resolver posibles alias de correo (ej. agrovision.co / agrovista.co)
    const emailAliases = [email];
    if (email === 'productor@agrovision.co' || email === 'productor@agrovista.co') {
      if (!emailAliases.includes('productor@agrovision.co')) emailAliases.push('productor@agrovision.co');
      if (!emailAliases.includes('productor@agrovista.co')) emailAliases.push('productor@agrovista.co');
    }

    // 2. Consultar Firestore buscando por los alias de correo de forma segura
    try {
      if (adminDb) {
        for (const targetEmail of emailAliases) {
          const usersSnapshot = await adminDb.collection('users').where('email', '==', targetEmail).get();
          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            user = { id: userDoc.id, ...userDoc.data() } as User;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user with adminDb:', error);
    }

    // 3. Si no se encuentra documento en Firestore aún, verificar usuarios mock locales como fallback
    if (!user) {
      const localMock = mockUsers.find(u => emailAliases.includes(u.email?.toLowerCase() || ''));
      if (localMock) {
        user = localMock;
      }
    }

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }

    // Verificar si el establecimiento está suspendido
    if (user.role !== 'SuperAdmin' && user.establishmentId) {
      try {
        const estDoc = await adminDb.collection('establishment').doc(user.establishmentId).get();
        if (estDoc.exists) {
          const estData = estDoc.data();
          if (estData?.isActive === false) {
            return NextResponse.json({ 
              error: 'Tu cuenta se encuentra suspendida temporalmente. Por favor comunícate con administración para regularizarla.' 
            }, { status: 403 });
          }
        }
      } catch (error) {
        console.error('Error verificando estado del establecimiento:', error);
      }
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
    let customToken: string | null = null;
    try {
      if (adminAuth) {
        customToken = await adminAuth.createCustomToken(user.id);
      }
    } catch (tokenErr) {
      console.warn('Could not generate custom Firebase token, proceeding with session cookie only:', tokenErr);
    }

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