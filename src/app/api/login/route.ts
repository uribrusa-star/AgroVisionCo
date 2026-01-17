import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    /**
     * CORRECCIÓN FUNDAMENTAL PARA NEXT.JS 15:
     * La función cookies() ahora devuelve una Promesa. 
     * Debe ser esperada (await) antes de pasarla a getIronSession.
     */
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales.' }, { status: 400 });
    }

    // Consulta a Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }

    const userDoc = querySnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as User;

    // Validación de contraseña (Texto plano según tu base de datos actual)
    const isValidPassword = user.password === password;

    if (!isValidPassword) {
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