import { useEffect, useState } from 'react';
import { getToken, MessagePayload } from 'firebase/messaging';
import { setupMessaging } from '@/lib/firebase';

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [foregroundMessage, setForegroundMessage] = useState<MessagePayload | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermissionAndGetToken = async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return null; // Not supported
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const messaging = await setupMessaging();
        if (messaging) {
          // Usamos serviceWorker.ready porque next-pwa ya lo registró como /sw.js 
          // (que ahora incluye a nuestro worker personalizado de Firebase)
          const registration = await navigator.serviceWorker.ready;
          
          // We provide the VapidKey so Firebase knows it's us
          const token = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
          
          setFcmToken(token);
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error('Error al solicitar permiso o token FCM:', error);
      return null;
    }
  };

  // Note: onMessage (foreground listener) is now handled globally 
  // by ForegroundNotificationListener.tsx to prevent multiple listeners.

  return {
    fcmToken,
    notificationPermission,
    requestPermissionAndGetToken,
    foregroundMessage
  };
}
