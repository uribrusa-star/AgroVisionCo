'use client';

import React, { useState, useContext, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { UserCredentialView } from '@/components/user-credential-view';
import { AttendanceScannerDialog } from '@/components/attendance-scanner-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { QrCode, ScanLine, Users, Clock, UserCheck, ShieldAlert, UserCog, CheckCircle2, LogIn, LogOut, Calendar, ArrowRight, Trash2, FileSpreadsheet, Download, FileText, Search, Filter } from 'lucide-react';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleAvatar } from '@/lib/utils';
import { canUserManageAttendance, AttendanceLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { exportAttendanceToExcel, exportAttendanceToPDF } from '@/lib/export-attendance';

export default function AttendancePage() {
  const { currentUser, attendanceLogs, establishmentData, updateEstablishmentData, users, recordAttendanceCheck, deleteAttendanceLog } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active-personnel' | 'today-logs' | 'history'>('active-personnel');
  const [historyPeriod, setHistoryPeriod] = useState<'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all' | 'custom'>('this-week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyRoleFilter, setHistoryRoleFilter] = useState('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmExitLog, setConfirmExitLog] = useState<AttendanceLog | null>(null);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState<AttendanceLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Historial filtrado de asistencias
  const filteredHistoryLogs = useMemo(() => {
    const now = new Date();
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;

    if (historyPeriod === 'this-week') {
      startLimit = startOfWeek(now, { weekStartsOn: 1 });
      endLimit = endOfWeek(now, { weekStartsOn: 1 });
    } else if (historyPeriod === 'last-week') {
      const prevWeek = subWeeks(now, 1);
      startLimit = startOfWeek(prevWeek, { weekStartsOn: 1 });
      endLimit = endOfWeek(prevWeek, { weekStartsOn: 1 });
    } else if (historyPeriod === 'this-month') {
      startLimit = startOfMonth(now);
      endLimit = endOfMonth(now);
    } else if (historyPeriod === 'last-month') {
      const prevMonth = subMonths(now, 1);
      startLimit = startOfMonth(prevMonth);
      endLimit = endOfMonth(prevMonth);
    } else if (historyPeriod === 'custom') {
      if (customStartDate) startLimit = new Date(`${customStartDate}T00:00:00`);
      if (customEndDate) endLimit = new Date(`${customEndDate}T23:59:59`);
    }

    return (attendanceLogs || [])
      .filter(log => {
        // Filtro por fecha
        if (startLimit || endLimit) {
          const logDate = log.checkIn ? new Date(log.checkIn) : log.date ? new Date(`${log.date}T12:00:00`) : null;
          if (logDate) {
            if (startLimit && logDate < startLimit) return false;
            if (endLimit && logDate > endLimit) return false;
          }
        }

        // Filtro por rol
        if (historyRoleFilter !== 'all') {
          const role = (log as any).personnelRole || log.role;
          if (role !== historyRoleFilter) return false;
        }

        // Filtro por texto de búsqueda
        if (historySearch.trim()) {
          const query = historySearch.toLowerCase();
          const nameMatch = log.personnelName?.toLowerCase().includes(query);
          const dniMatch = log.dni?.toLowerCase().includes(query);
          if (!nameMatch && !dniMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.checkIn || a.date).getTime();
        const timeB = new Date(b.checkIn || b.date).getTime();
        return timeB - timeA;
      });
  }, [attendanceLogs, historyPeriod, customStartDate, customEndDate, historyRoleFilter, historySearch]);

  const historyMetrics = useMemo(() => {
    const uniqueCollaborators = new Set(filteredHistoryLogs.map(l => l.personnelName.trim().toLowerCase())).size;
    const totalHours = filteredHistoryLogs.reduce((acc, l) => acc + ((l as any).hoursWorked ?? l.totalHoursWorked ?? 0), 0);
    const completed = filteredHistoryLogs.filter(l => l.status === 'completed').length;
    const inProgress = filteredHistoryLogs.filter(l => l.status === 'in_progress').length;
    return {
      uniqueCollaborators,
      totalHours: Math.round(totalHours * 10) / 10,
      totalLogs: filteredHistoryLogs.length,
      completed,
      inProgress
    };
  }, [filteredHistoryLogs]);

  const getPeriodLabel = () => {
    switch (historyPeriod) {
      case 'this-week': return 'Esta_Semana';
      case 'last-week': return 'Semana_Anterior';
      case 'this-month': return 'Este_Mes';
      case 'last-month': return 'Mes_Anterior';
      case 'custom': return `Personalizado_${customStartDate || 'inicio'}_a_${customEndDate || 'fin'}`;
      default: return 'Historico_Completo';
    }
  };

  const handleExportExcel = async () => {
    if (filteredHistoryLogs.length === 0) {
      toast({
        title: "Sin registros para exportar",
        description: "No hay registros de asistencia en el período y filtros seleccionados.",
        variant: "destructive"
      });
      return;
    }
    setIsExportingExcel(true);
    try {
      await new Promise(r => setTimeout(r, 60));
      exportAttendanceToExcel(filteredHistoryLogs, getPeriodLabel(), establishmentData?.producer || 'AgroVista');
      toast({
        title: "Planilla Excel Generada",
        description: `Se descargó la planilla con ${filteredHistoryLogs.length} asistencias.`,
      });
    } catch (e) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel.",
        variant: "destructive"
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (filteredHistoryLogs.length === 0) {
      toast({
        title: "Sin registros para exportar",
        description: "No hay registros de asistencia en el período y filtros seleccionados.",
        variant: "destructive"
      });
      return;
    }
    setIsExportingPDF(true);
    try {
      await new Promise(r => setTimeout(r, 60));
      exportAttendanceToPDF(filteredHistoryLogs, getPeriodLabel(), establishmentData?.producer || 'AgroVista');
      toast({
        title: "Informe PDF Generado",
        description: `Se descargó el reporte con ${filteredHistoryLogs.length} asistencias.`,
      });
    } catch (e) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el informe PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Si el usuario no tiene permisos para gestionar la asistencia
  if (!canManageGate) {
    return (
      <>
        <div className="mb-4 pb-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Control de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Módulo de acceso y registro de asistencia del personal.
          </p>
        </div>

        <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
          <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-6 sm:p-8 rounded-3xl text-center shadow-md">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-9 w-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Acceso de Gestión Restringido</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
              El módulo de control y carga de asistencias solo está habilitado para el <strong>Productor</strong> y el <strong>usuario que él designe</strong> como responsable de asistencia.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Para registrar su propio ingreso, presente su credencial digital ante el escáner de asistencia.
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

  const handleDeleteLog = async () => {
    if (!deleteTargetLog) return;
    setIsDeleting(true);
    try {
      await deleteAttendanceLog(deleteTargetLog.id);
      toast({
        title: "Registro Eliminado",
        description: `Se eliminó el registro de asistencia de ${deleteTargetLog.personnelName}.`,
      });
      setDeleteTargetLog(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro de asistencia.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const currentManagerName = establishmentData?.attendanceManagerName || 
    (establishmentData?.attendanceManagerId && users.find(u => u.id === establishmentData.attendanceManagerId)?.name);

  return (
    <>
      {/* Cabecera de la sección */}
      <div className="mb-4 pb-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Control de Asistencia
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Gestión de accesos, asistencia y personal en finca.
        </p>
      </div>

      {/* Botón Principal: Escanear Asistencia Ocupando Todo el Ancho */}
      <div className="mb-4">
        <Button
          onClick={() => setIsScannerOpen(true)}
          className="w-full h-12 text-sm sm:text-base font-bold gap-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md rounded-2xl active:scale-[0.99] transition-all"
        >
          <ScanLine className="h-5 w-5" />
          <span>Escanear Asistencia</span>
          {presentNow.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-white/20 text-white hover:bg-white/30 text-xs px-2 py-0.5">
              {presentNow.length} presentes
            </Badge>
          )}
        </Button>
      </div>

      {/* Panel de Designación de Responsable (Solo visible para el Productor) */}
      {isProductor && (
        <Card className="mb-5 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
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
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Elige qué usuario (por ej. el Encargado) tendrá permiso para ver esta sección y hacer las cargas de asistencia del personal.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto">
              <Select
                value={establishmentData?.attendanceManagerId || 'none'}
                onValueChange={handleAssignManager}
                disabled={isAssigning}
              >
                <SelectTrigger className="w-full sm:w-[230px] h-9 text-xs bg-background">
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

      {/* Selector directo de pestañas: Presentes, Hoy e Historial */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-5 border-b pb-3 overflow-x-auto no-scrollbar">
        {/* Botón directo de Presentes */}
        <Button
          variant={activeTab === 'active-personnel' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('active-personnel')}
          className={`h-9 text-xs gap-1.5 rounded-xl font-medium shrink-0 transition-all ${
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
          className={`h-9 text-xs gap-1.5 rounded-xl font-medium shrink-0 transition-all ${
            activeTab === 'today-logs' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Hoy (Jornada)</span>
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

        {/* Botón directo de Historial y Planillas */}
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className={`h-9 text-xs gap-1.5 rounded-xl font-medium shrink-0 transition-all ${
            activeTab === 'history' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Historial y Planillas</span>
          <Badge 
            variant="secondary" 
            className={`ml-1 text-[10px] px-1.5 py-0 ${
              activeTab === 'history' 
                ? 'bg-emerald-700 text-white' 
                : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
            }`}
          >
            {(attendanceLogs || []).length}
          </Badge>
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
                <p className="mt-1">Utilice el escáner de asistencia cuando los trabajadores ingresen al establecimiento.</p>
                <Button 
                  size="sm" 
                  onClick={() => setIsScannerOpen(true)}
                  className="mt-4 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <ScanLine className="h-3.5 w-3.5" /> Abrir Escáner de Asistencia
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
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

          <CardContent className="p-3 sm:p-6 pt-2">
            {todayLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-semibold text-sm">Aún no hay registros de asistencia cargados hoy.</p>
                <p className="mt-1">Los ingresos y egresos registrados se listarán aquí en tiempo real.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayLogs.map(log => {
                  const isPresent = log.status === 'in_progress';
                  const checkInDate = log.checkIn ? new Date(log.checkIn) : null;
                  const checkOutDate = log.checkOut ? new Date(log.checkOut) : null;
                  const checkInTime = checkInDate ? format(checkInDate, 'HH:mm') : '--:--';
                  const checkOutTime = checkOutDate ? format(checkOutDate, 'HH:mm') : null;
                  const currentHours = checkInDate ? Math.round(Math.max(0, (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60)) * 10) / 10 : 0;

                  return (
                    <div 
                      key={log.id}
                      className="p-3 sm:p-3.5 rounded-2xl border bg-card hover:bg-muted/20 transition-all shadow-xs flex flex-col gap-2.5 text-xs"
                    >
                      {/* 1. Cabecera de la tarjeta: Colaborador + Estado + Botón Eliminar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-10 w-10 border border-border shrink-0">
                            <AvatarImage src={getRoleAvatar(((log as any).personnelRole || log.role || 'Personal') as any)} />
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {log.personnelName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">
                              {log.personnelName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                              <span>{(log as any).personnelRole || log.role || 'Personal'}</span>
                              {log.dni && <span>• DNI: {log.dni}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Estado y Acción de Borrado */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPresent ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-medium">
                              🟢 Presente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 text-[10px] px-2 py-0.5 font-medium">
                              ✓ Salida
                            </Badge>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTargetLog(log)}
                            className="h-7 w-7 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Eliminar registro de asistencia"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* 2. Bloque central de horarios y jornada */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <div className="flex items-center gap-1 text-foreground font-semibold">
                            <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{checkInTime} hs</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="flex items-center gap-1 font-semibold">
                            <LogOut className="h-3.5 w-3.5 text-blue-600" />
                            <span className={isPresent ? "text-emerald-600 font-sans text-xs" : "text-foreground"}>
                              {checkOutTime ? `${checkOutTime} hs` : 'En finca'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          {isPresent ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {currentHours} hs en curso
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Jornada: <strong className="text-foreground font-mono">{log.hoursWorked || 0} hs</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Pie de tarjeta: Método de registro y botón marcar salida si está activo */}
                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ScanLine className="h-3 w-3 text-muted-foreground/70" />
                          {log.method === 'scan_gate' ? 'Escáner QR' : 'Carga Manual'}
                        </span>

                        {isPresent && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmExitLog(log)}
                            className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-300 dark:border-blue-800 rounded-lg gap-1 font-medium"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>Marcar Salida</span>
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

      {/* CONTENIDO DE PESTAÑA 3: HISTORIAL Y PLANILLAS */}
      {activeTab === 'history' && (
        <Card className="rounded-2xl shadow-xs">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  Historial y Planillas de Asistencia
                </CardTitle>
                <CardDescription className="text-xs">
                  Consulta registros anteriores, filtra por semanas o meses y descarga planillas consolidadas.
                </CardDescription>
              </div>

              {/* Botones de Exportación */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || filteredHistoryLogs.length === 0}
                  className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isExportingExcel ? 'Generando...' : 'Exportar Excel'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF || filteredHistoryLogs.length === 0}
                  className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{isExportingPDF ? 'Generando...' : 'Exportar PDF'}</span>
                </Button>
              </div>
            </div>

            {/* Barra de Filtros de Período y Búsqueda */}
            <div className="mt-4 pt-3 border-t space-y-3">
              {/* Pills de Período Rápido */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                {[
                  { id: 'this-week', label: 'Esta Semana' },
                  { id: 'last-week', label: 'Semana Anterior' },
                  { id: 'this-month', label: 'Este Mes' },
                  { id: 'last-month', label: 'Mes Anterior' },
                  { id: 'all', label: 'Todo el Historial' },
                  { id: 'custom', label: 'Personalizado' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHistoryPeriod(item.id as any)}
                    className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 text-xs ${
                      historyPeriod === item.id
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Selector de Rango Personalizado si aplica */}
              {historyPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-muted/30 border text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Desde:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-7 px-2 rounded-lg border bg-background text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Hasta:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-7 px-2 rounded-lg border bg-background text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Filtros secundarios: Rol y Buscador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por colaborador o DNI..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/20"
                  />
                </div>

                <Select value={historyRoleFilter} onValueChange={setHistoryRoleFilter}>
                  <SelectTrigger className="h-8 text-xs bg-muted/20">
                    <SelectValue placeholder="Filtrar por rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="Recolector">Recolectores</SelectItem>
                    <SelectItem value="Encargado">Encargados</SelectItem>
                    <SelectItem value="Ingeniero Agronomo">Ingenieros Agrónomos</SelectItem>
                    <SelectItem value="Productor">Productores</SelectItem>
                    <SelectItem value="Personal">Personal General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tarjetas de Métricas del Período Filtrado */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Colaboradores</p>
                  <p className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-300">
                    {historyMetrics.uniqueCollaborators}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Jornadas Totales</p>
                  <p className="text-sm sm:text-base font-bold text-blue-800 dark:text-blue-300">
                    {historyMetrics.totalLogs}
                  </p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/20">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Horas Acumuladas</p>
                  <p className="text-sm sm:text-base font-bold text-amber-800 dark:text-amber-300">
                    {historyMetrics.totalHours} hs
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-6 pt-2">
            {filteredHistoryLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="font-semibold text-sm">No se encontraron asistencias en este período.</p>
                <p className="mt-1">Intenta seleccionar otro rango de fechas o limpiar los filtros.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistoryLogs.map((log) => {
                  const isPresent = log.status === 'in_progress';
                  const checkInDate = log.checkIn ? new Date(log.checkIn) : null;
                  const checkOutDate = log.checkOut ? new Date(log.checkOut) : null;
                  const checkInTime = checkInDate ? format(checkInDate, 'HH:mm') : '--:--';
                  const checkOutTime = checkOutDate ? format(checkOutDate, 'HH:mm') : null;
                  const hours = (log as any).hoursWorked ?? log.totalHoursWorked ?? 0;

                  return (
                    <div
                      key={log.id}
                      className="p-3 sm:p-3.5 rounded-2xl border bg-card hover:bg-muted/20 transition-all shadow-xs flex flex-col gap-2.5 text-xs"
                    >
                      {/* Cabecera */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-10 w-10 border border-border shrink-0">
                            <AvatarImage src={getRoleAvatar(((log as any).personnelRole || log.role || 'Personal') as any)} />
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {log.personnelName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">{log.personnelName}</h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                              <span>{(log as any).personnelRole || log.role || 'Personal'}</span>
                              {log.dni && <span>• DNI: {log.dni}</span>}
                              <span>• {log.date}</span>
                            </div>
                          </div>
                        </div>

                        {/* Estado y eliminar */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPresent ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-medium">
                              🟢 Presente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 text-[10px] px-2 py-0.5 font-medium">
                              ✓ {hours} hs
                            </Badge>
                          )}

                          {isProductor && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTargetLog(log)}
                              className="h-7 w-7 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Eliminar registro de asistencia"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Horarios */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <div className="flex items-center gap-1 text-foreground font-semibold">
                            <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{checkInTime} hs</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="flex items-center gap-1 font-semibold">
                            <LogOut className="h-3.5 w-3.5 text-blue-600" />
                            <span className={isPresent ? 'text-emerald-600 font-sans text-xs' : 'text-foreground'}>
                              {checkOutTime ? `${checkOutTime} hs` : 'En finca'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-muted-foreground">
                          {isPresent ? (
                            <span className="text-emerald-600 font-semibold">En curso</span>
                          ) : (
                            <span>Jornada: <strong className="text-foreground font-mono">{hours} hs</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Pie */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <ScanLine className="h-3 w-3 text-muted-foreground/70" />
                          {log.method === 'scan_gate' ? 'Escáner QR Asistencia' : 'Manual'}
                        </span>
                        {log.registeredBy?.name && (
                          <span className="text-[10px]">Por: {log.registeredBy.name}</span>
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

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR REGISTRO DE ASISTENCIA */}
      <AlertDialog open={!!deleteTargetLog} onOpenChange={(open) => !open && setDeleteTargetLog(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="h-11 w-11 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              ¿Eliminar registro de asistencia?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Estás por eliminar el registro de asistencia de <strong>{deleteTargetLog?.personnelName}</strong>. 
              {deleteTargetLog?.checkIn && (
                <span className="block mt-1 font-medium text-foreground">
                  Ingreso: {format(new Date(deleteTargetLog.checkIn), 'HH:mm')} hs
                  {deleteTargetLog.checkOut ? ` • Salida: ${format(new Date(deleteTargetLog.checkOut), 'HH:mm')} hs` : ' (Activo)'}.
                </span>
              )}
              <span className="block mt-1.5 text-rose-600 dark:text-rose-400 font-medium">
                Esta acción removerá el registro del historial de la jornada. Utilícela si se cometió una equivocación o carga duplicada.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteLog();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Registro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escáner de Asistencia con Aprobación */}
      <AttendanceScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
      />
    </>
  );
}
