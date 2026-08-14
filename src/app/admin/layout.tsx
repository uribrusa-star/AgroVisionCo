'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { terminate, clearIndexedDbPersistence } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isClient, loading } = React.useContext(AppDataContext);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isClient && !loading) {
      if (!currentUser) {
        router.replace('/login');
      } else if (currentUser.role !== 'SuperAdmin') {
        router.replace('/dashboard');
      }
    }
  }, [isClient, loading, currentUser, router, pathname]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/logout', { method: 'POST' });
        await signOut(auth);
        
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch (error) {
        console.error('Error logging out and clearing cache:', error);
      }
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/';
    }
  };

  if (!isClient || loading || !currentUser || currentUser.role !== 'SuperAdmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F4EB] dark:bg-stone-950 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#2d4a22] dark:text-emerald-400" />
        <p className="mt-4 text-[#2d4a22] dark:text-emerald-400 font-medium">Verificando credenciales de administrador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] dark:bg-stone-950 transition-colors duration-300 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-[#2d4a22] dark:text-emerald-400" />
              <span className="font-headline font-bold text-lg sm:text-xl text-[#2d4a22] dark:text-emerald-400">
                AgroVista <span className="text-stone-500 dark:text-stone-400 font-normal">| SuperAdmin</span>
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{currentUser.name}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{currentUser.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-stone-500 dark:text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
