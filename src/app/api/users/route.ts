import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, password, role, establishmentId, email } = body;
    const sessionUserId = session.user.id;

    if (!name || !password || !role || !establishmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'Ingeniero Agronomo' && role !== 'Encargado' && role !== 'Productor') {
      return NextResponse.json({ error: 'Invalid role for self-service creation' }, { status: 400 });
    }

    // Verify the user making the request is a Productor or SuperAdmin
    const producerDoc = await adminDb.collection('users').doc(sessionUserId).get();
    if (!producerDoc.exists || (producerDoc.data()?.role !== 'Productor' && producerDoc.data()?.role !== 'SuperAdmin')) {
      return NextResponse.json({ error: 'Unauthorized. Only Producers and Admins can create users.' }, { status: 403 });
    }

    const isSuperAdmin = producerDoc.data()?.role === 'SuperAdmin' || producerDoc.data()?.establishmentId === 'main';

    if (role === 'Productor' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Only the Super Admin can create Producers.' }, { status: 403 });
    }

    if (role !== 'Productor' && producerDoc.data()?.establishmentId !== establishmentId) {
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

    // Generate email
    const estSuffix = establishmentId.toLowerCase().replace(/[^a-z0-9]/g, '');
    let finalEmail = email?.toLowerCase(); // Used if role === 'Productor'
    
    if (role === 'Ingeniero Agronomo') {
      finalEmail = `ing-${estSuffix}@agrovista.co`;
    } else if (role === 'Encargado') {
      finalEmail = `enc${managerCount + 1}-${estSuffix}@agrovista.co`;
    }
    
    if (!finalEmail) {
      return NextResponse.json({ error: 'Email is required for Productor creation' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: finalEmail,
      password,
      displayName: name,
    });

    // Create Firestore user document
    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      email: finalEmail,
      role,
      avatar: '',
      establishmentId,
      password, // Save password for mock login to work
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid, email: finalEmail });

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide a friendly error for duplicate emails
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'El correo electrónico ya está en uso por otra cuenta.' }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, name, password } = body;
    const sessionUserId = session.user.id;

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user making the request is a SuperAdmin
    const callerDoc = await adminDb.collection('users').doc(sessionUserId).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'Unauthorized. Only Admins can edit users.' }, { status: 403 });
    }

    const updateDataAuth: any = { displayName: name };
    const updateDataFirestore: any = { name };

    if (password && password.trim().length >= 6) {
      updateDataAuth.password = password;
      updateDataFirestore.password = password; // For the mock login compatibility
    }

    // Update Firebase Auth user
    await adminAuth.updateUser(id, updateDataAuth);

    // Update Firestore user document
    await adminDb.collection('users').doc(id).update(updateDataFirestore);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
