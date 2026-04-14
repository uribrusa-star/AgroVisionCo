
'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, RefreshCw, database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export function ConnectivityBanner() {
    const isOnline = useOnlineStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium sticky top-0 z-[100] shadow-md border-b border-amber-600/20"
                >
                    <div className="flex items-center gap-2">
                        <WifiOff className="h-4 w-4 animate-pulse" />
                        <span>Modo Offline: Estás trabajando localmente en tu dispositivo.</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-600/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                         <RefreshCw className="h-3 w-3 animate-spin duration-[3000ms]" />
                         Auto-Sincronización Activada
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Minimal placeholder if framer-motion is not available or preferred simple
export function OfflineStatusIndicator() {
    const isOnline = useOnlineStatus();
    if (isOnline) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full shadow-lg text-xs font-bold animate-bounce">
            <WifiOff className="h-4 w-4" />
            OFFLINE
        </div>
    );
}
