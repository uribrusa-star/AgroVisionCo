'use client';

import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { setupMessaging } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function ForegroundNotificationListener() {
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const messaging = await setupMessaging();
        if (messaging) {
          unsubscribe = onMessage(messaging, (payload) => {
            console.log('Mensaje recibido en primer plano (Listener Global):', payload);
            toast({
              title: payload.notification?.title || "Nueva Alerta",
              description: payload.notification?.body || "Tienes una nueva notificación",
              variant: payload.data?.severity === 'critical' ? 'destructive' : 'default',
            });
          });
        }
      } catch (e) {
        console.warn('No se pudo inicializar onMessage', e);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast]);

  return null;
}
