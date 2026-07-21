import { useEffect, useState } from 'react';
import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { setupMessaging } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [foregroundMessage, setForegroundMessage] = useState<MessagePayload | null>(null);
  const { toast } = useToast();

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
          // Register the Service Worker explicitly so Next-PWA doesn't override it easily
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      const messaging = await setupMessaging();
      if (messaging) {
        unsubscribe = onMessage(messaging, (payload) => {
          console.log('Mensaje recibido en primer plano:', payload);
          setForegroundMessage(payload);
          toast({
            title: payload.notification?.title || "Nueva Alerta",
            description: payload.notification?.body || "Tienes una nueva notificación",
            variant: payload.data?.severity === 'critical' ? 'destructive' : 'default',
          });
        });
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    fcmToken,
    notificationPermission,
    requestPermissionAndGetToken,
    foregroundMessage
  };
}
