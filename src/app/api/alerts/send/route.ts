import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { title, body: messageBody, severity, targetRoles, targetUserId, targetUserIds } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Falta título o mensaje' }, { status: 400 });
    }

    let allTokens: string[] = [];
    let targetUserIdsList: string[] = [];

    if (targetUserId) {
      // Enviar a un usuario individual (por ID o por email)
      const userDoc = await adminDb.collection('users').doc(targetUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
        targetUserIdsList.push(userDoc.id);
      } else {
        const userByEmail = await adminDb.collection('users').where('email', '==', targetUserId).get();
        if (!userByEmail.empty) {
          const docSnap = userByEmail.docs[0];
          const userData = docSnap.data();
          if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
            allTokens = allTokens.concat(userData.fcmTokens);
          }
          targetUserIdsList.push(docSnap.id);
        }
      }
    } else if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // Enviar a múltiples usuarios específicos
      const usersSnapshot = await adminDb.collection('users').where('__name__', 'in', targetUserIds).get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
        targetUserIdsList.push(doc.id);
      });
      targetUserIdsList = targetUserIdsList.concat(targetUserIds);
    } else {
      // Broadcast masivo según roles
      const rolesToTarget = targetRoles || ['Productor', 'Ingeniero Agronomo', 'Encargado'];
      const usersSnapshot = await adminDb.collection('users').where('role', 'in', rolesToTarget).get();
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
        targetUserIdsList.push(doc.id);
      });
    }

    targetUserIdsList = Array.from(new Set(targetUserIdsList));

    // Guardar notificación en la base de datos interna para cada usuario
    if (adminDb && targetUserIdsList.length > 0) {
      const batch = adminDb.batch();
      const createdAt = new Date().toISOString();
      
      targetUserIdsList.forEach(userId => {
        const newNotifRef = adminDb.collection('notifications').doc();
        batch.set(newNotifRef, {
          userId,
          title,
          body: messageBody,
          severity: severity || 'info',
          createdAt,
          read: false
        });
      });
      
      await batch.commit().catch(e => console.error("Error guardando notificaciones en db:", e));
    }

    allTokens = Array.from(new Set(allTokens.filter(t => typeof t === 'string' && t.trim().length > 0)));

    if (allTokens.length === 0) {
      return NextResponse.json({
        success: true,
        count: targetUserIdsList.length,
        usersCount: targetUserIdsList.length,
        successCount: 0,
        failureCount: 0,
        message: 'Notificaciones guardadas en la bandeja. No hay dispositivos con token FCM activo registrados.'
      }, { status: 200 });
    }

    let successCount = 0;
    let failureCount = 0;
    let responses: any[] = [];

    try {
      if (adminMessaging) {
        const message = {
          notification: {
            title: title,
            body: messageBody,
          },
          data: {
            severity: severity || 'info',
          },
          tokens: allTokens,
        };

        const response = await adminMessaging.sendEachForMulticast(message);
        successCount = response.successCount;
        failureCount = response.failureCount;
        responses = response.responses;
      }
    } catch (pushErr: any) {
      console.error('Error enviando push vía FCM:', pushErr);
    }
    
    return NextResponse.json({
      success: true,
      count: targetUserIdsList.length,
      usersCount: targetUserIdsList.length,
      successCount,
      failureCount,
      responses
    });

  } catch (error: any) {
    console.error('Error en ruta de alertas:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
