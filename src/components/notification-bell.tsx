'use client';

import React, { useContext, useState } from 'react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Bell, Check, Info, AlertTriangle, ShieldAlert, Trash2, Calendar, CheckCheck, Sparkles, ChevronRight, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PushNotification } from '@/lib/types';

export function NotificationBell() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = useContext(AppDataContext);

  const [selectedNotif, setSelectedNotif] = useState<PushNotification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenDetail = (notif: PushNotification) => {
    setSelectedNotif(notif);
    setIsDetailOpen(true);
    if (!notif.read) {
      markNotificationAsRead(notif.id);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!selectedNotif) return;
    if (deleteNotification) {
      await deleteNotification(selectedNotif.id);
    }
    setIsDetailOpen(false);
    setSelectedNotif(null);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 font-semibold gap-1 text-[11px] px-2 py-0.5 shadow-none">
            <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span>Alerta Crítica</span>
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-semibold gap-1 text-[11px] px-2 py-0.5 shadow-none">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Advertencia</span>
          </Badge>
        );
      default:
        return (
          <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100 font-semibold gap-1 text-[11px] px-2 py-0.5 shadow-none">
            <Info className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Información</span>
          </Badge>
        );
    }
  };

  const getSeverityIconSmall = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
        );
      case 'warning':
        return (
          <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="p-1.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "EEEE d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 rounded-full md:border md:border-primary/30 hover:bg-muted/80 transition-all duration-200 active:scale-95"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-foreground/80" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-background animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-[92vw] sm:w-[420px] p-0 border border-stone-200 dark:border-stone-800 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-stone-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-stone-50/80 dark:bg-stone-800/80 border-b border-stone-100 dark:border-stone-800/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">Notificaciones</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full border-0">
                  {unreadCount} nuevas
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2.5 text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold rounded-lg transition-colors"
                onClick={() => markAllNotificationsAsRead()}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Marcar leídas
              </Button>
            )}
          </div>
          
          {/* Notification List */}
          <ScrollArea className="h-[380px] max-h-[65vh]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center space-y-3">
                <div className="p-4 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500">
                  <Bell className="h-8 w-8 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">Sin notificaciones pendientes</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Te avisaremos sobre novedades en tu campo o tareas asignadas.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`flex items-start gap-3 p-3.5 transition-all duration-200 cursor-pointer group hover:bg-stone-50 dark:hover:bg-stone-800/60 ${notif.read ? 'opacity-80' : 'bg-emerald-50/40 dark:bg-emerald-950/20'}`}
                    onClick={() => handleOpenDetail(notif)}
                  >
                    {getSeverityIconSmall(notif.severity)}
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs leading-tight truncate ${notif.read ? 'font-semibold text-stone-700 dark:text-stone-300' : 'font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        )}
                      </div>
                      
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-normal">
                        {notif.body}
                      </p>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          Ver detalle <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Detalle Completo de Notificación */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl p-0 overflow-hidden dark:bg-stone-900 dark:text-stone-100">
          {selectedNotif && (
            <div>
              {/* Header Tonal según Severidad */}
              <div className={`p-5 border-b flex items-start gap-3.5 ${
                selectedNotif.severity === 'critical'
                  ? 'bg-red-50/80 dark:bg-red-950/40 border-red-100 dark:border-red-900/50'
                  : selectedNotif.severity === 'warning'
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/50'
              }`}>
                <div className="mt-0.5">
                  {getSeverityIconSmall(selectedNotif.severity)}
                </div>
                <div className="flex-1 space-y-1 pr-4">
                  <div>
                    {getSeverityBadge(selectedNotif.severity)}
                  </div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug pt-1">
                    {selectedNotif.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>{formatDateLabel(selectedNotif.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Contenido Completo de la Notificación */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                  <p className="text-sm text-stone-700 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                    {selectedNotif.body}
                  </p>
                </div>
              </div>

              {/* Footer con Acciones */}
              <div className="p-4 bg-stone-50/80 dark:bg-stone-800/80 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
                {deleteNotification ? (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs gap-1.5 font-medium"
                    onClick={handleDeleteCurrent}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </Button>
                ) : <div />}

                <Button 
                  type="button" 
                  size="sm"
                  className="bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold text-xs px-5 rounded-xl shadow-sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Entendido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
