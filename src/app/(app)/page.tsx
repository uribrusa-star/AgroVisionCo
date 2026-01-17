
'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Loader2 } from 'lucide-react';

export default function RedirectPage() {
  const { loading, currentUser, isClient } = useContext(AppDataContext);
  const router = useRouter();

  useEffect(() => {
    // This effect now only handles the case where a user somehow lands here
    // without being authenticated, sending them back to the login page.
    if (isClient && !loading && !currentUser) {
        router.replace('/');
    }
  }, [isClient, loading, currentUser, router]);

  // If the user is authenticated and lands on the base authenticated route,
  // redirect them to the dashboard. This should only happen if they navigate
  // to the app's root (e.g. /app) directly.
  useEffect(() => {
    if (isClient && currentUser) {
      if (window.location.pathname.endsWith('/app') || window.location.pathname.endsWith('/app/')) {
        router.replace('/dashboard');
      }
    }
  }, [isClient, currentUser, router]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}
