import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';

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
  return {
    id,
    name: parseVal(fields.name) || '',
    email: parseVal(fields.email) || '',
    role: (parseVal(fields.role) || 'Productor') as any,
    password: parseVal(fields.password) || '',
    avatar: parseVal(fields.avatar),
    phone: parseVal(fields.phone),
    specialty: parseVal(fields.specialty),
    producerId: parseVal(fields.producerId)
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
      // 2. Consulta REST HTTP simple a Firestore (100% compatible con Serverless/Vercel sin timeouts ni sockets colgados)
      try {
        const restUrl = `https://firestore.googleapis.com/v1/projects/studio-1014760813-be189/databases/(default)/documents:runQuery`;
        const restRes = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'users' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'email' },
                  op: 'EQUAL',
                  value: { stringValue: email }
                }
              }
            }
          })
        });

        if (restRes.ok) {
          const data = await restRes.json();
          if (Array.isArray(data) && data.length > 0 && data[0].document) {
            user = parseFirestoreDoc(data[0]);
          }
        }
      } catch (restError) {
        console.warn('Error en consulta REST a Firestore, intentando con SDK:', restError);
      }

      // 3. Fallback con SDK cliente si todo lo anterior no arrojó resultado
      if (!user) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          user = { id: userDoc.id, ...userDoc.data() } as User;
        }
      }
    }

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }
    
    // Omitimos el password antes de guardar en la sesión por seguridad
    const { password: _, ...userToSave } = user;

    // Guardar los datos del usuario en la sesión de Iron Session
    session.user = userToSave;
    await session.save();

    return NextResponse.json({ user: userToSave });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor al intentar iniciar sesión.' }, 
      { status: 500 }
    );
  }
}