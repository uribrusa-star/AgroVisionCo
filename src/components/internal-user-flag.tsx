'use client';

import { useEffect, useContext } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';

/**
 * Component that marks the current browser as an internal user
 * when a SuperAdmin logs in or accesses the platform.
 * Must be mounted inside AppContextProvider.
 */
export function InternalUserFlag() {
  const { currentUser } = useContext(AppDataContext);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUser?.role === 'SuperAdmin') {
      localStorage.setItem('agrovista_ignore_analytics', 'true');
    }
  }, [currentUser]);

  return null;
}
