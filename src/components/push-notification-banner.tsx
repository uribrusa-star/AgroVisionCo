'use client';

import React from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BellRing } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';

export function PushNotificationBanner() {
  const { notificationPermission, requestPermissionAndGetToken } = usePushNotifications();
  const { saveFcmToken, currentUser } = React.useContext(AppDataContext);
  const [dismissed, setDismissed] = React.useState(false);

  // Consideramos que si el usuario ya tiene su token registrado, no hace falta el banner, pero por ahora dependemos del permiso del navegador
  if (notificationPermission !== 'default' || dismissed || !currentUser) {
    return null;
  }

  const handleEnable = async () => {
    const token = await requestPermissionAndGetToken();
    if (token) {
        await saveFcmToken(token);
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300 shrink-0">
             <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Activa las Alertas Críticas</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Recibe notificaciones en tiempo real sobre riesgos de heladas o enfermedades detectadas por la IA directamente en tu dispositivo.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setDismissed(true)} className="bg-transparent border-blue-300 hover:bg-blue-100 text-blue-700">
            Más tarde
          </Button>
          <Button size="sm" onClick={handleEnable} className="bg-blue-600 hover:bg-blue-700 text-white">
            Activar Notificaciones
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
