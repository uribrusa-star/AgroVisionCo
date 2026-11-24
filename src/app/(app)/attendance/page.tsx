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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, ScanLine, Users, Clock, UserCheck, ShieldCheck, ShieldAlert, UserCog, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleAvatar } from '@/lib/utils';
import { canUserManageAttendance } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const { currentUser, attendanceLogs, establishmentData, updateEstablishmentData, users, loading } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'active-personnel' | 'my-credential'>('active-personnel');
  const [isAssigning, setIsAssigning] = useState(false);

  if (!currentUser) return null;

  const canManageGate = canUserManageAttendance(currentUser, establishmentData);
  const isProductor = currentUser.role === 'Productor' || currentUser.role === 'SuperAdmin';

  // Personal presente en la quinta ahora mismo
  const presentNow = (attendanceLogs || []).filter(l => l.status === 'in_progress');

  // Si el usuario no tiene permisos para gestionar la asistencia
  if (!canManageGate) {
    return (
      <>
        <PageHeader
          title="Control de Asistencia"
          description="Módulo de control de acceso y registro de personal en tranquera."
        >
          <WeatherCard compact />
        </PageHeader>

        <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
          <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-6 sm:p-8 rounded-3xl text-center shadow-md">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Acceso de Gestión Restringido</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
              El módulo de control de tranquera y carga de asistencias solo está habilitado para el <strong>Productor</strong> y el <strong>usuario que él designe</strong> como responsable de asistencia.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Para registrar su propio ingreso, presente su credencial digital ante el escáner de la tranquera.
            </p>

            <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-900 flex justify-center">
              <div className="w-full max-w-md">
                <UserCredentialView user={currentUser} />
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const handleAssignManager = async (userId: string) => {
    setIsAssigning(true);
    try {
      if (userId === 'none') {
        await updateEstablishmentData({ attendanceManagerId: '', attendanceManagerName: '' });
        toast({
          title: "Responsable Removido",
          description: "Ahora solo tú como productor puedes acceder a cargar asistencias.",
        });
      } else {
        const target = users.find(u => u.id === userId);
        if (target) {
          await updateEstablishmentData({
            attendanceManagerId: target.id,
            attendanceManagerName: target.name
          });
          toast({
            title: "Responsable Designado",
            description: `${target.name} (${target.role}) ahora tiene acceso a esta sección para cargar asistencias.`,
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el responsable de asistencia.",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const currentManagerName = establishmentData?.attendanceManagerName || 
    (establishmentData?.attendanceManagerId && users.find(u => u.id === establishmentData.attendanceManagerId)?.name);

  return (
    <>
      <PageHeader
        title="Control de Asistencia"
        description="Gestión de accesos en tranquera, registro con aprobación y visualización de personal en finca."
      >
        <div className="flex items-center gap-2">
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
          <WeatherCard compact />
        </div>
      </PageHeader>

      {/* Panel de Designación de Responsable (Solo visible para el Productor) */}
      {isProductor && (
        <Card className="mb-6 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  Responsable Designado para Asistencia
                  {currentManagerName ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 border-emerald-400">
                      ✓ {currentManagerName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Solo Productor
                    </Badge>
                  )}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elige qué usuario (por ej. el Encargado) tendrá permiso para ver esta sección y hacer las cargas de asistencia del personal.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Select
                value={establishmentData?.attendanceManagerId || 'none'}
                onValueChange={handleAssignManager}
                disabled={isAssigning}
              >
                <SelectTrigger className="w-[230px] h-9 text-xs bg-background">
                  <SelectValue placeholder="Seleccionar colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (Solo yo como Productor)</SelectItem>
                  {users.filter(u => u.role !== 'Productor').map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner informativo para el Encargado / Usuario Designado */}
      {!isProductor && canManageGate && (
        <div className="mb-6 p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Has sido designado por el productor para gestionar el <strong>Control de Asistencia</strong> del personal.</span>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px]">Encargado de Tranquera</Badge>
        </div>
      )}

      {/* Selector de pestañas */}
      <div className="flex items-center justify-between gap-2 mb-6 border-b pb-3">
        <div className="flex items-center gap-2">
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

          <Button
            variant={activeTab === 'my-credential' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('my-credential')}
            className={`h-9 text-xs gap-1.5 rounded-xl font-medium ${
              activeTab === 'my-credential' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
          >
            <QrCode className="h-4 w-4" />
            Mi Credencial Digital
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1.5 hidden sm:flex hover:bg-emerald-50"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Abrir Escáner de Tranquera
        </Button>
      </div>

      {/* Contenido Principal */}
      {activeTab === 'active-personnel' ? (
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
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto shadow-xs"
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
                        <AvatarImage src={getRoleAvatar(((log as any).personnelRole || log.role || 'Personal') as any)} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-sm">
                          {log.personnelName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 truncate">
                        <h4 className="font-bold text-sm text-foreground truncate">{log.personnelName}</h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                          {(log as any).personnelRole || log.role || 'Personal'}
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
      ) : (
        <UserCredentialView 
          user={currentUser} 
          onOpenScanner={() => setIsScannerOpen(true)} 
        />
      )}

      {/* Escáner de Asistencia en Tranquera con Aprobación */}
      <AttendanceScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  );
}
