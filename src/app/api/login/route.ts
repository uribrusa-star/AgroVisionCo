import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { users as defaultUsers } from '@/lib/data';

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

    let user: User | null = null;
    const defaultUser = defaultUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      user = { id: userDoc.id, ...userDoc.data() } as User;
    }

    // Si la contraseña ingresada coincide con la de data.ts, sincronizar Firestore automáticamente si estaba desactualizado
    if (defaultUser && password === defaultUser.password) {
      if (!user || user.password !== defaultUser.password || !user.notificationEmail) {
        const userRef = doc(db, 'users', defaultUser.id);
        const updatedUser = user ? { ...user, password: defaultUser.password, notificationEmail: user.notificationEmail || defaultUser.notificationEmail } : defaultUser;
        await setDoc(userRef, updatedUser, { merge: true });
        user = updatedUser;
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