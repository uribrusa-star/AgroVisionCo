'use client';

import { useEffect } from 'react';

export function SWUnregister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
          console.log('[SWUnregister] Service Worker anclado eliminado exitosamente.');
        }
      });
    }
  }, []);

  return null;
}
