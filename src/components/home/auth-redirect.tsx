'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('currentUser') || window.sessionStorage.getItem('currentUser');
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.id) {
          if (user.role === 'SuperAdmin') {
            router.replace('/admin');
          } else {
            router.replace('/dashboard');
          }
        }
      }
    } catch {
      // Ignorar si el JSON es inválido o no hay usuario guardado
    }
  }, [router]);

  return null;
}
