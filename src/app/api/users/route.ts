import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, producerId, establishmentId } = body;

    if (!name || !email || !password || !role || !producerId || !establishmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'Ingeniero Agronomo' && role !== 'Encargado') {
      return NextResponse.json({ error: 'Invalid role for self-service creation' }, { status: 400 });
    }

    // Verify the user making the request is a Productor
    const producerDoc = await adminDb.collection('users').doc(producerId).get();
    if (!producerDoc.exists || producerDoc.data()?.role !== 'Productor') {
      return NextResponse.json({ error: 'Unauthorized. Only Producers can create staff.' }, { status: 403 });
    }

    if (producerDoc.data()?.establishmentId !== establishmentId) {
      return NextResponse.json({ error: 'Establishment ID mismatch' }, { status: 403 });
    }

    // Check limits
    const staffSnapshot = await adminDb.collection('users')
      .where('establishmentId', '==', establishmentId)
      .where('role', 'in', ['Ingeniero Agronomo', 'Encargado'])
      .get();
    
    let engineerCount = 0;
    let managerCount = 0;

    staffSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'Ingeniero Agronomo') engineerCount++;
      if (data.role === 'Encargado') managerCount++;
    });

    if (role === 'Ingeniero Agronomo' && engineerCount >= 1) {
      return NextResponse.json({ error: 'Limit reached: Solo puedes tener 1 Ingeniero Agrónomo.' }, { status: 400 });
    }

    if (role === 'Encargado' && managerCount >= 3) {
      return NextResponse.json({ error: 'Limit reached: Solo puedes tener hasta 3 Encargados.' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create Firestore user document
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role,
      avatar: '',
      establishmentId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide a friendly error for duplicate emails
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otra cuenta.' }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
