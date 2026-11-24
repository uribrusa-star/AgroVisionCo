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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QrCode, ScanLine, Users, Clock, UserCheck, ShieldAlert, UserCog, CheckCircle2, LogOut, Calendar, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleAvatar } from '@/lib/utils';
import { canUserManageAttendance, AttendanceLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const { currentUser, attendanceLogs, establishmentData, updateEstablishmentData, users, recordAttendanceCheck } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active-personnel' | 'today-logs' | 'my-credential'>('active-personnel');
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmExitLog, setConfirmExitLog] = useState<AttendanceLog | null>(null);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);

  if (!currentUser) return null;

  const canManageGate = canUserManageAttendance(currentUser, establishmentData);
  const isProductor = currentUser.role === 'Productor' || currentUser.role === 'SuperAdmin';

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Personal presente en la quinta ahora mismo
  const presentNow = (attendanceLogs || []).filter(l => l.status === 'in_progress');

  // Registros de la jornada de hoy (activos + completados)
  const todayLogs = (attendanceLogs || []).filter(l => 
    l.date === todayStr || (l.checkIn && l.checkIn.startsWith(todayStr))
  );

  // Total horas trabajadas hoy
  const totalHoursWorkedToday = todayLogs
    .filter(l => l.status === 'completed' && l.hoursWorked)
    .reduce((sum, l) => sum + (l.hoursWorked || 0), 0);

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

  const handleConfirmExit = async () => {
    if (!confirmExitLog) return;
    setIsSubmittingExit(true);
    try {
      const res = await recordAttendanceCheck({
        personnelId: confirmExitLog.personnelId,
        personnelName: confirmExitLog.personnelName,
        role: confirmExitLog.role,
        dni: confirmExitLog.dni,
        method: 'manual'
      });
      toast({
        title: "Salida Registrada",
        description: `Se registró la salida de ${confirmExitLog.personnelName}. Jornada: ${res.hoursWorked || 0} horas.`,
      });
      setConfirmExitLog(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo registrar la salida en el servidor.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingExit(false);
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

      {/* Selector directo de pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón directo de Presentes */}
          <Button
            variant={activeTab === 'active-personnel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('active-personnel')}
            className={`h-9 text-xs gap-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'active-personnel' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Presentes en Finca</span>
            <Badge 
              variant="secondary" 
              className={`ml-1 text-[10px] px-1.5 py-0 ${
                activeTab === 'active-personnel' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              }`}
            >
              {presentNow.length}
            </Badge>
          </Button>

          {/* Botón directo de Hoy - Registro Total */}
          <Button
            variant={activeTab === 'today-logs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('today-logs')}
            className={`h-9 text-xs gap-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'today-logs' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Hoy (Jornada Total)</span>
            <Badge 
              variant="secondary" 
              className={`ml-1 text-[10px] px-1.5 py-0 ${
                activeTab === 'today-logs' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {todayLogs.length}
            </Badge>
          </Button>

          {/* Mi Credencial Digital */}
          <Button
            variant={activeTab === 'my-credential' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('my-credential')}
            className={`h-9 text-xs gap-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'my-credential' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Mi Credencial Digital</span>
          </Button>
        </div>

        {/* Botón directo de Abrir Escáner */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <ScanLine className="h-3.5 w-3.5" />
          <span>Abrir Escáner</span>
        </Button>
      </div>

      {/* CONTENIDO DE PESTAÑA 1: PERSONAL PRESENTE AHORA */}
      {activeTab === 'active-personnel' && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Personal Presente en la Quinta ({presentNow.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Colaboradores que ingresaron y están actualmente cumpliendo jornada en el campo.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-xs">
                🟢 {presentNow.length} en actividad
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            {presentNow.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-semibold text-sm">No hay personal activo en la finca en este momento.</p>
                <p className="mt-1">Utilice el escáner de tranquera cuando los trabajadores ingresen al establecimiento.</p>
                <Button 
                  size="sm" 
                  onClick={() => setIsScannerOpen(true)}
                  className="mt-4 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <ScanLine className="h-3.5 w-3.5" /> Abrir Escáner de Tranquera
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presentNow.map(log => {
                  const checkInDate = new Date(log.checkIn);
                  const currentHours = Math.round(Math.max(0, (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60)) * 10) / 10;

                  return (
                    <div 
                      key={log.id} 
                      className="p-3.5 rounded-2xl border bg-card border-emerald-500/30 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-11 w-11 border border-emerald-500/30 shrink-0">
                            <AvatarImage src={getRoleAvatar(((log as any).personnelRole || log.role || 'Personal') as any)} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-sm">
                              {log.personnelName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 truncate">
                            <h4 className="font-bold text-sm text-foreground truncate">{log.personnelName}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                                {(log as any).personnelRole || log.role || 'Personal'}
                              </Badge>
                              {log.dni && (
                                <span className="text-[10px] text-muted-foreground font-mono">DNI: {log.dni}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block mb-1" />
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(checkInDate, { locale: es })}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs">
                        <div className="text-muted-foreground">
                          Ingreso: <strong className="text-foreground font-mono">{format(checkInDate, 'HH:mm')} hs</strong>
                          <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">({currentHours} hs)</span>
                        </div>

                        {/* Botón para marcar salida con confirmación */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmExitLog(log)}
                          className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 rounded-lg"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Marcar Salida</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CONTENIDO DE PESTAÑA 2: HOY - REGISTRO TOTAL DE LA JORNADA */}
      {activeTab === 'today-logs' && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  Registro Total de la Jornada de Hoy ({todayLogs.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Historial completo de asistencias, horarios de ingreso, egreso y horas acumuladas el {format(new Date(), "dd 'de' MMMM", { locale: es })}.
                </CardDescription>
              </div>

              {/* Resumen de métricas de la jornada */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700">
                  Presentes: <strong>{presentNow.length}</strong>
                </Badge>
                <Badge variant="outline" className="text-xs border-blue-500/40 bg-blue-50 dark:bg-blue-950/30 text-blue-700">
                  Salidas: <strong>{todayLogs.filter(l => l.status === 'completed').length}</strong>
                </Badge>
                <Badge variant="outline" className="text-xs border-stone-300 dark:border-stone-700">
                  Horas Totales: <strong>{Math.round(totalHoursWorkedToday * 10) / 10} hs</strong>
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-2">
            {todayLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-semibold text-sm">Aún no hay registros de asistencia cargados hoy.</p>
                <p className="mt-1">Los ingresos y egresos registrados en tranquera se listarán aquí en tiempo real.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayLogs.map(log => {
                  const isPresent = log.status === 'in_progress';
                  const checkInTime = log.checkIn ? format(new Date(log.checkIn), 'HH:mm') : '--:--';
                  const checkOutTime = log.checkOut ? format(new Date(log.checkOut), 'HH:mm') : null;

                  return (
                    <div 
                      key={log.id}
                      className="p-3 rounded-2xl border bg-card hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border shrink-0">
                          <AvatarImage src={getRoleAvatar(((log as any).personnelRole || log.role || 'Personal') as any)} />
                          <AvatarFallback className="font-bold text-xs">
                            {log.personnelName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-foreground">{log.personnelName}</h4>
                            {isPresent ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                                🟢 Presente en Finca
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 text-[10px] px-1.5 py-0">
                                ✓ Salida Registrada
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                            <span>{(log as any).personnelRole || log.role || 'Personal'}</span>
                            {log.dni && <span>• DNI: {log.dni}</span>}
                            <span>• Método: {log.method === 'scan_gate' ? 'Escáner QR' : 'Manual'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="flex items-center gap-1 font-mono font-medium text-foreground">
                            <span>{checkInTime} hs</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{checkOutTime ? `${checkOutTime} hs` : 'Activo'}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {isPresent ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">En jornada</span>
                            ) : (
                              <span>Jornada: <strong className="text-foreground">{log.hoursWorked || 0} hs</strong></span>
                            )}
                          </div>
                        </div>

                        {isPresent && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmExitLog(log)}
                            className="h-8 text-xs text-blue-600 hover:text-blue-700 border-blue-300 dark:border-blue-800"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-1" />
                            Salida
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CONTENIDO DE PESTAÑA 3: MI CREDENCIAL DIGITAL */}
      {activeTab === 'my-credential' && (
        <UserCredentialView 
          user={currentUser} 
          onOpenScanner={() => setIsScannerOpen(true)} 
        />
      )}

      {/* MODAL DE CONFIRMACIÓN PARA MARCAR SALIDA (EVITAR TOQUES ACCIDENTALES) */}
      <AlertDialog open={!!confirmExitLog} onOpenChange={(open) => !open && setConfirmExitLog(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
              <LogOut className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              ¿Confirmar registro de salida?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Estás por registrar la salida de <strong>{confirmExitLog?.personnelName}</strong> ({confirmExitLog?.role}).
              {confirmExitLog?.checkIn && (
                <span className="block mt-1 font-medium text-foreground">
                  Ingresó a las {format(new Date(confirmExitLog.checkIn), 'HH:mm')} hs. Se computará la jornada trabajada hasta este momento.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isSubmittingExit} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmExit();
              }}
              disabled={isSubmittingExit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {isSubmittingExit ? 'Registrando...' : 'Confirmar Salida'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escáner de Asistencia en Tranquera con Aprobación */}
      <AttendanceScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  );
}
