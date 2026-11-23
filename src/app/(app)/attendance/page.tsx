'use client';

import React, { useState, useContext } from 'react';
import { PageHeader } from '@/components/page-header';
import { WeatherCard } from '@/components/weather-card';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { UserCredentialView } from '@/components/user-credential-view';
import { AttendanceScannerDialog } from '@/components/attendance-scanner-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QrCode, ScanLine, Users, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleAvatar } from '@/lib/utils';

export default function AttendancePage() {
  const { currentUser, attendanceLogs, loading } = useContext(AppDataContext);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-credential' | 'active-personnel'>('my-credential');

  if (!currentUser) return null;

  const canManageGate = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  // Personal presente en la quinta ahora mismo
  const presentNow = (attendanceLogs || []).filter(l => l.status === 'in_progress');

  return (
    <>
      <PageHeader
        title="Asistencia y Credencial"
        description="Credencial digital antifraude para acceso a la quinta, registro de horas y escáner de tranquera."
      >
        <div className="flex items-center gap-2">
          {canManageGate && (
            <Button
              onClick={() => setIsScannerOpen(true)}
              className="h-9 gap-2 font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <ScanLine className="h-4 w-4" />
              <span>Escanear Tranquera</span>
              {presentNow.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-white/20 text-white hover:bg-white/30 text-[10px] px-1.5 py-0">
                  {presentNow.length} presentes
                </Badge>
              )}
            </Button>
          )}
          <WeatherCard compact />
        </div>
      </PageHeader>

      {/* Selector de pestañas para Encargado/Productor */}
      {canManageGate && (
        <div className="flex items-center justify-between gap-2 mb-6 border-b pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'my-credential' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('my-credential')}
              className={`h-9 text-xs gap-1.5 rounded-xl font-medium ${
                activeTab === 'my-credential' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
              }`}
            >
              <QrCode className="h-4 w-4" />
              Mi Credencial de Acceso
            </Button>

            <Button
              variant={activeTab === 'active-personnel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('active-personnel')}
              className={`h-9 text-xs gap-1.5 rounded-xl font-medium ${
                activeTab === 'active-personnel' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
              }`}
            >
              <Users className="h-4 w-4" />
              Presentes en la Quinta ({presentNow.length})
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsScannerOpen(true)}
            className="text-xs text-emerald-700 dark:text-emerald-400 gap-1.5 hidden sm:flex"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Abrir Escáner de Puerta
          </Button>
        </div>
      )}

      {/* Contenido Principal */}
      {activeTab === 'my-credential' ? (
        <UserCredentialView 
          user={currentUser} 
          onOpenScanner={() => setIsScannerOpen(true)} 
        />
      ) : (
        /* Vista de Personal Presente en la Quinta */
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Personal Presente en la Quinta ({presentNow.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Colaboradores que ingresaron hoy y aún no han registrado su salida.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Registrar Salida / Ingreso
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            {presentNow.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-semibold text-sm">No hay personal activo en la finca en este momento.</p>
                <p className="mt-1">Utilice el escáner de tranquera cuando los trabajadores ingresen al establecimiento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presentNow.map(log => (
                  <div 
                    key={log.id} 
                    className="p-3.5 rounded-2xl border bg-card border-emerald-500/30 flex items-center justify-between shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-11 w-11 border border-emerald-500/30 shrink-0">
                        <AvatarImage src={getRoleAvatar(log.personnelRole || 'Recolector')} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-sm">
                          {log.personnelName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 truncate">
                        <h4 className="font-bold text-sm text-foreground truncate">{log.personnelName}</h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                          {log.personnelRole || 'Personal'}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          Ingresó: <span className="font-medium text-foreground">{format(new Date(log.checkIn), 'HH:mm')} hs</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block mb-1" />
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(log.checkIn), { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Escáner de Asistencia en Tranquera */}
      {canManageGate && (
        <AttendanceScannerDialog
          isOpen={isScannerOpen}
          onOpenChange={setIsScannerOpen}
        />
      )}
    </>
  );
}
