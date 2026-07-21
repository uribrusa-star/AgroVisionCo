import { NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, body: messageBody, severity, targetRoles, targetUserId, targetUserIds } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    let allTokens: string[] = [];

    if (targetUserId) {
      // Send to a single user
      const userDoc = await adminDb.collection('users').doc(targetUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
      }
    } else if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      // Send to specific multiple users
      const usersSnapshot = await adminDb.collection('users').where('__name__', 'in', targetUserIds).get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
      });
    } else {
      // Broadcast based on roles
      const rolesToTarget = targetRoles || ['Productor', 'Ingeniero Agronomo', 'Encargado'];
      const usersSnapshot = await adminDb.collection('users').where('role', 'in', rolesToTarget).get();
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          allTokens = allTokens.concat(userData.fcmTokens);
        }
      });
    }
    
    // allTokens populated above

    if (allTokens.length === 0) {
      return NextResponse.json({ message: 'No devices registered for push notifications.' }, { status: 200 });
    }

    // Firebase Messaging requires batches of 500, but realistically here we just send.
    const message = {
        notification: {
            title: title,
            body: messageBody,
        },
        data: {
          severity: severity || 'info', // 'critical', 'warning', 'info'
        },
        tokens: allTokens, // Envío masivo usando sendEachForMulticast
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    
    return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
    });

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
