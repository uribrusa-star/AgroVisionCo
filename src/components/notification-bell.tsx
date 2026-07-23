'use client';

import React, { useContext } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Bell, Check, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationBell() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useContext(AppDataContext);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full md:border md:border-primary/40">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border-primary/20 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
          <DropdownMenuLabel className="p-0 font-semibold text-base">Notificaciones</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
              onClick={() => markAllNotificationsAsRead()}
            >
              <Check className="mr-1 h-3 w-3" /> Marcar todas leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[350px] max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-20" />
              <p className="text-sm">No tienes notificaciones recientes.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 border-b last:border-b-0 transition-colors hover:bg-muted/50 cursor-pointer ${notif.read ? 'opacity-70 bg-transparent' : 'bg-primary/5'}`}
                  onClick={() => {
                    if (!notif.read) markNotificationAsRead(notif.id);
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {getSeverityIcon(notif.severity)}
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className={`text-sm leading-tight ${notif.read ? 'font-medium' : 'font-bold'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
