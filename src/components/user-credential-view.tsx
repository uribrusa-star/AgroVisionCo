'use client';

import React, { useState, useEffect, useRef, useContext } from 'react';
import QRCode from 'react-qr-code';
import { format, formatDistanceToNow, isSameDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ShieldCheck, RefreshCw, FileDown, Share2, Loader2, Clock, CheckCircle2, 
  MapPin, Phone, Mail, Award, History, Activity, CalendarDays, UserCheck, 
  ScanLine, AlertCircle, Sparkles, Building2, ChevronRight
} from 'lucide-react';

import { AppDataContext } from '@/context/app-data-context.tsx';
import type { User, AttendanceLog } from '@/lib/types';
import { buildDynamicUserQRPayload } from '@/lib/qr-security';
import { saveOrSharePdf } from '@/lib/pdf-generator';
import { getRoleAvatar } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserCredentialViewProps {
  user?: User;
  onOpenScanner?: () => void;
  compact?: boolean;
}

export function UserCredentialView({ user: propUser, onOpenScanner, compact = false }: UserCredentialViewProps) {
  const { 
    currentUser, 
    attendanceLogs, 
    establishmentData, 
    auditLogs, 
    tasks, 
    agronomistLogs, 
    phenologyLogs, 
    diagnosisLogs, 
    packagingLogs, 
    culturalPracticeLogs, 
    harvests,
    updateUserProfile
  } = useContext(AppDataContext);

  const { toast } = useToast();
  const user = propUser || currentUser;

  const [qrTick, setQrTick] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.phone) {
      setPhoneInput(user.phone);
    }
  }, [user?.phone]);

  const handleSavePhone = async () => {
    if (!user) return;
    setIsSavingPhone(true);
    try {
      await updateUserProfile(user.id, { phone: phoneInput.trim() });
      setIsEditingPhone(false);
      toast({
        title: "WhatsApp Guardado",
        description: "El número de contacto ha sido actualizado correctamente.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el número de teléfono.",
        variant: "destructive"
      });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = phoneInput || user?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      setIsEditingPhone(true);
      toast({
        title: "Cargar WhatsApp",
        description: "Por favor carga primero el número de teléfono con código de área.",
      });
      return;
    }
    const text = `Hola ${user?.name || ''}, te comparto tu credencial oficial de acceso AgroVista.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Timer de renovación de 60 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = 60 - (nowSeconds % 60);
      setSecondsRemaining(remaining);
      if (remaining === 60 || remaining === 1) {
        setQrTick(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setQrTick(prev => prev + 1);
    setSecondsRemaining(60);
    toast({
      title: "QR Actualizado",
      description: "Se ha renovado el token dinámico de tu credencial.",
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <AlertCircle className="h-10 w-10 mb-2 text-muted-foreground/60" />
        <p>No se encontró información del usuario.</p>
      </div>
    );
  }

  // Comprobar estado de asistencia del usuario
  const userAttendanceLogs = (attendanceLogs || []).filter(l => 
    (user.id && l.personnelId === user.id) ||
    (user.dni && l.dni && l.dni === user.dni) ||
    (l.personnelName && user.name && l.personnelName.trim().toLowerCase() === user.name.trim().toLowerCase())
  ).sort((a, b) => new Date(b.checkIn || b.date).getTime() - new Date(a.checkIn || a.date).getTime());

  const currentOpenSession = userAttendanceLogs.find(l => l.status === 'in_progress');

  // Estadísticas de asistencia
  const now = new Date();
  const todayDateStr = format(now, 'yyyy-MM-dd');
  const todayLogs = userAttendanceLogs.filter(l => l.date === todayDateStr || (l.checkIn && isSameDay(new Date(l.checkIn), now)));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekLogs = userAttendanceLogs.filter(l => new Date(l.date) >= weekStart);
  const monthStart = startOfMonth(now);
  const monthLogs = userAttendanceLogs.filter(l => new Date(l.date) >= monthStart);

  const hoursWorkedToday = todayLogs.reduce((acc, l) => acc + (l.totalHoursWorked || 0), 0);
  const hoursWorkedWeek = weekLogs.reduce((acc, l) => acc + (l.totalHoursWorked || 0), 0);
  const daysPresentMonth = new Set(monthLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd'))).size;

  // Acciones y actividades para la Ficha
  const rawActions: { id: string; action: string; description: string; category: string; timestamp: string }[] = [];

  (auditLogs || []).forEach(log => {
    if (!log) return;
    const logUserLower = (log.userName || '').toLowerCase();
    const userNameLower = (user.name || '').toLowerCase();
    if (logUserLower && userNameLower && (logUserLower.includes(userNameLower) || userNameLower.includes(logUserLower))) {
      rawActions.push({
        id: `audit_${log.id}`,
        action: log.action || 'Acción en Sistema',
        description: log.details || '',
        category: log.category || 'general',
        timestamp: log.timestamp || new Date().toISOString()
      });
    }
  });

  if (user.role === 'Ingeniero Agronomo') {
    (agronomistLogs || []).forEach(log => {
      rawActions.push({
        id: `agro_${log.id}`,
        action: 'Aplicación Fitosanitaria',
        description: `Recetó ${log.product} (${log.targetPest}) en Lote ${log.batchId}`,
        category: 'agronomist',
        timestamp: log.date
      });
    });
    (phenologyLogs || []).forEach(log => {
      rawActions.push({
        id: `pheno_${log.id}`,
        action: 'Muestreo Fenológico',
        description: `Etapa: ${log.stage} en Lote ${log.batchId}`,
        category: 'agronomist',
        timestamp: log.date
      });
    });
    (diagnosisLogs || []).forEach(log => {
      rawActions.push({
        id: `diag_${log.id}`,
        action: 'Diagnóstico IA',
        description: `Diagnóstico: ${log.diagnosisResult?.title || 'Análisis foliar'}`,
        category: 'agronomist',
        timestamp: log.createdAt || log.date || new Date().toISOString()
      });
    });
  }

  if (user.role === 'Encargado') {
    (packagingLogs || []).forEach(log => {
      rawActions.push({
        id: `pack_${log.id}`,
        action: 'Supervisión de Embalaje',
        description: `Registró ${log.boxesPackaged} cajas embaladas para ${log.packerName}`,
        category: 'packaging',
        timestamp: log.date
      });
    });
    (culturalPracticeLogs || []).forEach(log => {
      rawActions.push({
        id: `cult_${log.id}`,
        action: 'Labor Cultural',
        description: `Registró ${log.practiceType} para ${log.personnelName}`,
        category: 'cultural',
        timestamp: log.date
      });
    });
    (harvests || []).slice(0, 10).forEach(h => {
      rawActions.push({
        id: `harv_${h.id}`,
        action: 'Supervisión de Cosecha',
        description: `Pesada de ${h.kilograms} kg (${h.collector?.name || 'Recolector'}, Lote ${h.batchNumber})`,
        category: 'harvest',
        timestamp: h.date
      });
    });
  }

  (tasks || []).forEach(t => {
    const isAssigned = (t.assignedTo?.id && user.id && t.assignedTo.id === user.id) ||
      (t.assignedTo?.name && user.name && t.assignedTo.name.toLowerCase() === user.name.toLowerCase());
    const isCreator = (t.createdBy?.id && user.id && t.createdBy.id === user.id) ||
      (t.createdBy?.name && user.name && t.createdBy.name.toLowerCase() === user.name.toLowerCase());

    if (isAssigned || isCreator) {
      rawActions.push({
        id: `task_${t.id}_${t.status}`,
        action: t.status === 'completed' ? 'Tarea Completada' : isCreator ? 'Creación de Tarea' : 'Tarea Asignada',
        description: `${t.title} (${t.status === 'completed' ? 'Finalizada' : t.status === 'in-progress' ? 'En Progreso' : 'Pendiente'})`,
        category: 'general',
        timestamp: t.createdAt || new Date().toISOString()
      });
    }
  });

  const seenKeys = new Set<string>();
  const userActions = rawActions.filter(act => {
    const key = `${act.action}_${act.description}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  // Generador de imagen base64 del QR para PDF
  const getQrImageDataUrl = async (): Promise<string | null> => {
    if (!qrContainerRef.current) return null;
    const svg = qrContainerRef.current.querySelector('svg');
    if (!svg) return null;

    return new Promise((resolve) => {
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = `data:image/svg+xml;base64,${svg64}`;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = image64;
    });
  };

  // Descargar Credencial en PDF (1 Hoja)
  const handleDownloadCredentialPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    toast({ title: 'Generando Credencial', description: 'Preparando carnet oficial en 1 sola hoja...' });

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const cardWidth = 90;
      const cardHeight = 135;
      const x = (pageWidth - cardWidth) / 2;
      const y = 35;

      const establishmentName = establishmentData?.producer || 'AgroVista';

      doc.setDrawColor(5, 150, 105);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');
      doc.setLineDashPattern([], 0);

      doc.setFillColor(6, 78, 59);
      doc.roundedRect(x, y, cardWidth, 14, 3, 3, 'F');
      doc.rect(x, y + 10, cardWidth, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AGROVISTA', x + 5, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(establishmentName.substring(0, 24), x + cardWidth - 5, y + 8, { align: 'right' });

      doc.setFillColor(240, 253, 244);
      doc.rect(x, y + 14, cardWidth, 7, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text((user.role || '').toUpperCase(), x + cardWidth / 2, y + 18.5, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      const displayName = user.name.length > 22 ? user.name.substring(0, 21) + '...' : user.name;
      doc.text(displayName, x + cardWidth / 2, y + 27, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(user.dni ? `DNI: ${user.dni}` : 'Credencial Digital Oficial', x + cardWidth / 2, y + 32, { align: 'center' });

      const qrDataUrl = await getQrImageDataUrl();
      const qrSize = 48;
      const qrX = x + (cardWidth - qrSize) / 2;
      const qrY = y + 36;
      if (qrDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Escanear al ingresar para registrar asistencia', x + cardWidth / 2, y + 90, { align: 'center' });

      if (user.phone) {
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Tel: ${user.phone}`, x + cardWidth / 2, y + 96, { align: 'center' });
      }

      if (user.email) {
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Email: ${user.email}`, x + cardWidth / 2, y + 101, { align: 'center' });
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(x + 1, y + cardHeight - 12, cardWidth - 2, 11, 'F');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('CREDENCIAL OFICIAL DE ACCESO Y ASISTENCIA', x + cardWidth / 2, y + cardHeight - 7, { align: 'center' });
      doc.text('AgroVista Co. - Trazabilidad y Gestión de Personal', x + cardWidth / 2, y + cardHeight - 3.5, { align: 'center' });

      const safeName = user.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Credencial_${safeName}.pdf`;
      const pdfBlob = doc.output('blob');

      await saveOrSharePdf(pdfBlob, filename, `Credencial de ${user.name}`);
      toast({ title: 'Credencial Descargada', description: `Se generó el carnet de ${user.name} en 1 hoja.` });
    } catch (err) {
      console.error('Error generating user card pdf:', err);
      toast({ title: 'Error', description: 'No se pudo generar la credencial en PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const dynamicQrPayload = buildDynamicUserQRPayload(user);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {/* Banner de Estado de Asistencia en Tiempo Real */}
      <div className={`p-4 rounded-2xl border transition-all ${
        currentOpenSession 
          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-sm' 
          : 'bg-muted/40 border-border text-muted-foreground'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
              currentOpenSession 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-muted text-muted-foreground border'
            }`}>
              {currentOpenSession ? (
                <UserCheck className="h-6 w-6 animate-pulse" />
              ) : (
                <Clock className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  currentOpenSession ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`} />
                <h3 className="font-bold text-base text-foreground">
                  {currentOpenSession ? 'Presente en la Quinta' : 'Fuera del Establecimiento'}
                </h3>
                <Badge variant={currentOpenSession ? 'default' : 'secondary'} className={`text-[10px] ${
                  currentOpenSession ? 'bg-emerald-600 hover:bg-emerald-600' : ''
                }`}>
                  {currentOpenSession ? 'Turno en curso' : 'Sin ingreso activo'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentOpenSession 
                  ? `Ingreso registrado hoy a las ${format(new Date(currentOpenSession.checkIn), 'HH:mm')} hs (hace ${formatDistanceToNow(new Date(currentOpenSession.checkIn), { locale: es })})`
                  : userAttendanceLogs.length > 0 && userAttendanceLogs[0].checkOut
                    ? `Última salida registrada: ${format(new Date(userAttendanceLogs[0].checkOut!), "dd/MM/yyyy 'a las' HH:mm")} hs`
                    : 'Presente su credencial en el escáner de asistencia para iniciar su jornada.'}
              </p>
            </div>
          </div>

          {/* Si el usuario puede escanear en puerta (Encargado o Productor) */}
          {(user.role === 'Encargado' || user.role === 'Productor') && onOpenScanner && (
            <Button 
              onClick={onOpenScanner}
              size="sm"
              className="w-full sm:w-auto h-9 font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <ScanLine className="h-4 w-4" />
              Abrir Escáner de Asistencia
            </Button>
          )}
        </div>
      </div>

      {/* Grid Principal: Credencial Dinámica + Métricas de Asistencia */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Tarjeta Visual de Credencial (Diseño Tarjeta de Acceso) */}
        <div className="md:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-sm rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-b from-card to-muted/30 p-5 shadow-lg relative overflow-hidden">
            {/* Cabecera de la credencial */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  AV
                </div>
                <div>
                  <h4 className="font-extrabold text-xs tracking-wider uppercase text-foreground">AGROVISTA</h4>
                  <p className="text-[9px] text-muted-foreground leading-none">{establishmentData?.producer || 'Establecimiento'}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40">
                {user.role}
              </Badge>
            </div>

            {/* Datos del Usuario y Avatar */}
            <div className="flex items-center gap-3.5 mb-4">
              <Avatar className="h-16 w-16 border-2 border-emerald-500/30 shadow-md shrink-0">
                <AvatarImage src={getRoleAvatar(user.role)} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg text-foreground truncate leading-snug">{user.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{user.email || 'Acceso por credencial'}</p>
                {user.dni && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    DNI: <span className="font-mono font-medium text-foreground">{user.dni}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Código QR Dinámico de Alto Contraste */}
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-slate-200 shadow-inner my-2" ref={qrContainerRef}>
              <div className="p-1 bg-white">
                <QRCode
                  value={dynamicQrPayload}
                  size={190}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                />
              </div>

              {/* Indicador de Antifraude y Contador de Renovación */}
              <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold font-mono">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>TOKEN SEGURO (60s)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                  <Clock className="h-3 w-3" />
                  <span>Renueva en {secondsRemaining}s</span>
                </div>
              </div>
            </div>

            {/* Barra de progreso de renovación de 60s */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1 mb-4">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 60) * 100}%` }}
              />
            </div>

            {/* Botón de Actualizar Manual y Recomendación */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <p className="text-[10px] text-muted-foreground leading-tight flex-1">
                Muestre este QR al registrar asistencia. Brillo recomendado al 80%.
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleManualRefresh}
                className="h-7 px-2.5 text-[11px] gap-1 shrink-0 hover:border-emerald-500 hover:text-emerald-700"
              >
                <RefreshCw className="h-3 w-3" />
                Renovar
              </Button>
            </div>

            {/* Sección de WhatsApp y Contacto (reemplaza descarga PDF) */}
            <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  WhatsApp de Contacto:
                </span>
                {!isEditingPhone ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingPhone(true)}
                    className="h-6 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    {phoneInput ? 'Editar número' : '+ Cargar número'}
                  </Button>
                ) : null}
              </div>

              {isEditingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="Ej: +54 9 11 1234 5678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 h-8 text-xs px-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSavePhone}
                    disabled={isSavingPhone}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    {isSavingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhoneInput(user?.phone || '');
                      setIsEditingPhone(false);
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {phoneInput ? phoneInput : <span className="italic text-muted-foreground/60">Sin WhatsApp cargado</span>}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenWhatsApp}
                    className="h-7 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
                  >
                    <Share2 className="h-3 w-3" />
                    Abrir WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel Lateral: Métricas de Horas y Accesos */}
        <div className="md:col-span-6 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Resumen de Asistencia Personal
              </CardTitle>
              <CardDescription className="text-xs">
                Cálculo automático de horas en base a ingresos y salidas registradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Hoy</p>
                  <p className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
                    {hoursWorkedToday.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">hs</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {currentOpenSession ? '🟢 En curso' : 'Jornada lista'}
                  </p>
                </div>

                <div className="bg-muted/30 border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Esta Semana</p>
                  <p className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
                    {hoursWorkedWeek.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">hs</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Acumulado lun-dom</p>
                </div>

                <div className="bg-muted/30 border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Este Mes</p>
                  <p className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
                    {daysPresentMonth} <span className="text-xs font-normal text-muted-foreground">días</span>
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Presentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pestañas: Historial de Asistencias vs Ficha de Actividades */}
          <Card className="overflow-hidden">
            <Tabs defaultValue="attendance" className="w-full">
              <div className="border-b px-4 pt-2 bg-muted/20">
                <TabsList className="grid grid-cols-2 w-full max-w-xs h-8">
                  <TabsTrigger value="attendance" className="text-xs">
                    <Clock className="h-3 w-3 mr-1.5" />
                    Asistencias
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="text-xs">
                    <Activity className="h-3 w-3 mr-1.5" />
                    Ficha de Acciones
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Pestaña 1: Historial de Asistencias */}
              <TabsContent value="attendance" className="p-4 m-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground">Últimos Movimientos de Asistencia</h4>
                  <span className="text-[10px] text-muted-foreground font-mono">{userAttendanceLogs.length} registros</span>
                </div>

                {userAttendanceLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <Clock className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground/50" />
                    Aún no hay registros de asistencia para este usuario.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {userAttendanceLogs.slice(0, 15).map(log => {
                      const isInProgress = log.status === 'in_progress';
                      return (
                        <div 
                          key={log.id} 
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                            isInProgress 
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                              : 'bg-card border-border/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isInProgress ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              {isInProgress ? <UserCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-foreground truncate">
                                {format(new Date(log.date), "EEEE d 'de' MMMM", { locale: es })}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Entrada: <span className="font-medium text-foreground">{format(new Date(log.checkIn), 'HH:mm')} hs</span>
                                {log.checkOut && (
                                  <> • Salida: <span className="font-medium text-foreground">{format(new Date(log.checkOut), 'HH:mm')} hs</span></>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {isInProgress ? (
                              <Badge variant="outline" className="text-[9px] bg-emerald-100 dark:bg-emerald-900 border-emerald-300 text-emerald-800 dark:text-emerald-300 animate-pulse">
                                En curso
                              </Badge>
                            ) : (
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {(log.totalHoursWorked || 0).toFixed(2)} hs
                                </span>
                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Completado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Pestaña 2: Ficha de Acciones / Auditoría */}
              <TabsContent value="activities" className="p-4 m-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground">Últimas 10 Acciones Registradas</h4>
                  <span className="text-[10px] text-muted-foreground font-mono">{userActions.length} actividades</span>
                </div>

                {userActions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <Activity className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground/50" />
                    Sin actividad reciente registrada en el sistema.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {userActions.map(act => (
                      <div key={act.id} className="p-2.5 rounded-xl border bg-card border-border/80 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground text-xs">{act.action}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{act.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
