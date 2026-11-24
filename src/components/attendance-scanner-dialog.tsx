'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, QrCode, CheckCircle2, LogIn, LogOut, Clock, Users, AlertTriangle, RefreshCw, XCircle, ShieldCheck, Check, X } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { parseAndValidateAttendanceQR, DynamicQRPayload } from '@/lib/qr-security';
import { getRoleAvatar } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsQR from 'jsqr';

interface AttendanceScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingAttendanceApproval {
  data: DynamicQRPayload;
  actionType: 'in' | 'out';
  currentTimeStr: string;
  hoursWorked?: number;
  existingCheckInTime?: string;
  photoUrl?: string;
  isDynamic?: boolean;
}

// Audio feedback synthesizers using Web Audio API
const playSound = (type: 'in' | 'out' | 'detected' | 'error') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'detected') {
      // Soft high chirp when code is read
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'in') {
      // Pleasant double chime for IN
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'out') {
      // Deeper double chime for OUT
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12); // C5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Low buzz for ERROR / EXPIRED
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio context may be restricted by autoplay policy
  }
};

export function AttendanceScannerDialog({ isOpen, onOpenChange }: AttendanceScannerDialogProps) {
  const { attendanceLogs, recordAttendanceCheck, users, collectors, packers } = useContext(AppDataContext);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'scanner' | 'present' | 'history'>('scanner');
  const [cameraActive, setCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);
  
  // Pending approval state (Scanner pauses when populated, requires Encargado approval)
  const [pendingApproval, setPendingApproval] = useState<PendingAttendanceApproval | null>(null);
  
  // Success toast/flash after approval
  const [lastCheckResult, setLastCheckResult] = useState<{
    type: 'in' | 'out';
    name: string;
    role: string;
    hoursWorked?: number;
    time: string;
    isDynamic?: boolean;
    photo?: string;
  } | null>(null);

  const [lastScanError, setLastScanError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const recentlyScannedRef = useRef<Map<string, number>>(new Map());

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = attendanceLogs.filter(l => l.date === todayStr || (l.checkIn && l.checkIn.startsWith(todayStr)));
  const currentlyPresent = attendanceLogs.filter(l => l.status === 'in_progress');

  // Sync isPausedRef with pendingApproval / isSubmitting / lastScanError / lastCheckResult
  useEffect(() => {
    isPausedRef.current = !!pendingApproval || isSubmitting || !!lastScanError || !!lastCheckResult;
  }, [pendingApproval, isSubmitting, lastScanError, lastCheckResult]);

  // Start / stop camera
  useEffect(() => {
    if (isOpen && activeTab === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no es soportada en este navegador o requiere conexión segura HTTPS.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');

        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play caught:', e);
        }

        setCameraActive(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      console.error('Error starting attendance camera:', err);
      toast({
        title: 'Error de Cámara',
        description: err.message || 'No se pudo acceder a la cámara. Verifique los permisos de su dispositivo.',
        variant: 'destructive'
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setPendingApproval(null);
  };

  // Universal Scanner Loop: BarcodeDetector (Chrome/Android) + jsQR canvas fallback (iOS Safari / WebKit)
  const startDetectionLoop = () => {
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetector = null;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const detectFrame = async () => {
      const video = videoRef.current;

      if (!video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Si está pausado porque hay una aprobación pendiente o procesando, saltar frame
      if (isPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      let detectedCode: string | null = null;

      // 1. Intento con API nativa de Android/Chrome
      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedCode = barcodes[0].rawValue;
          }
        } catch {
          // Continuar al fallback de jsQR
        }
      }

      // 2. Detección universal mediante jsQR (funciona 100% en iOS Safari y navegadores sin BarcodeDetector)
      if (!detectedCode && video.videoWidth && video.videoHeight && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            detectedCode = code.data;
          }
        } catch {
          // Frame canvas error, continuar
        }
      }

      // Procesar código detectado
      if (detectedCode) {
        handleDetectedQR(detectedCode);
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  // Cuando la cámara detecta un QR, corta el escaneo y prepara la aprobación
  const handleDetectedQR = (rawCode: string) => {
    // Validar el código primero
    const validation = parseAndValidateAttendanceQR(rawCode);

    if (!validation.valid || !validation.data) {
      const now = Date.now();
      const lastErrTime = recentlyScannedRef.current.get(rawCode) || 0;
      if (now - lastErrTime > 5000) {
        recentlyScannedRef.current.set(rawCode, now);
        playSound('error');
        setLastScanError(validation.error || 'Código QR no reconocido como credencial oficial.');
      }
      return;
    }

    const { data, isDynamic } = validation;

    // Verificar cooldown de escaneo para esta persona (8 segundos para evitar re-escaneo accidental)
    const personKey = data.id || data.dni || data.name || rawCode;
    const now = Date.now();
    const lastScanTime = recentlyScannedRef.current.get(personKey) || recentlyScannedRef.current.get(rawCode) || 0;
    if (now - lastScanTime < 8000) {
      return; // Ignorar código recién aprobado de esta misma persona
    }

    // Pausar inmediatamente
    isPausedRef.current = true;
    playSound('detected');

    // Buscar foto/avatar
    let photoUrl = '';
    if (data.type === 'user' || data.agroVistaUser) {
      const u = users.find(x => x.id === data.id);
      photoUrl = u ? getRoleAvatar(u.role) : getRoleAvatar(data.role as any);
    } else if (data.type === 'collector') {
      const c = collectors.find(x => x.id === data.id);
      photoUrl = c?.avatar || '';
    } else if (data.type === 'packer') {
      const p = packers.find(x => x.id === data.id);
      photoUrl = p?.avatar || '';
    }

    // Comprobar si ya tiene un ingreso abierto en la quinta
    const existingOpenLog = attendanceLogs.find(l => 
      l.status === 'in_progress' &&
      ((data.id && l.personnelId && l.personnelId === data.id) ||
       (data.dni && l.dni && l.dni === data.dni) ||
       (l.personnelName.trim().toLowerCase() === data.name.trim().toLowerCase()))
    );

    const currentTimeStr = format(new Date(), 'HH:mm');

    if (existingOpenLog) {
      // SALIDA
      const checkInDate = new Date(existingOpenLog.checkIn);
      const diffHours = Math.max(0, (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60));
      const hoursWorked = Math.round(diffHours * 100) / 100;

      setPendingApproval({
        data,
        actionType: 'out',
        currentTimeStr,
        hoursWorked,
        existingCheckInTime: format(checkInDate, 'HH:mm'),
        photoUrl,
        isDynamic
      });
    } else {
      // INGRESO
      setPendingApproval({
        data,
        actionType: 'in',
        currentTimeStr,
        photoUrl,
        isDynamic
      });
    }
  };

  // El encargado presiona "Aprobar y Registrar"
  const handleApprove = async () => {
    if (!pendingApproval || isSubmitting) return;
    setIsSubmitting(true);

    const { data, photoUrl, isDynamic } = pendingApproval;
    const personKey = data.id || data.dni || data.name;

    try {
      const result = await recordAttendanceCheck({
        personnelId: data.id,
        personnelName: data.name,
        role: data.role || (data.type === 'collector' ? 'Recolector' : data.type === 'packer' ? 'Embalador' : 'Personal'),
        dni: data.dni,
        method: 'scan_gate'
      });

      // Añadir al registro de cooldown de escaneo para esta persona (8s)
      recentlyScannedRef.current.set(personKey, Date.now());
      if (data.id) recentlyScannedRef.current.set(data.id, Date.now());

      playSound(result.type);
      setPendingApproval(null);

      // Mostrar breve mensaje de éxito antes de reanudar
      setLastCheckResult({
        type: result.type,
        name: data.name,
        role: data.role || (data.type === 'collector' ? 'Recolector' : data.type === 'packer' ? 'Embalador' : 'Colaborador'),
        hoursWorked: result.hoursWorked,
        time: format(new Date(), 'HH:mm'),
        isDynamic,
        photo: photoUrl
      });

      setTimeout(() => {
        setLastCheckResult(null);
        setIsSubmitting(false);
        isPausedRef.current = false;
      }, 1100);

    } catch (err) {
      console.error('Error saving approved attendance check:', err);
      // Desbloquear de inmediato la interfaz para que el encargado pueda seguir trabajando
      setIsSubmitting(false);
      setPendingApproval(null);
      isPausedRef.current = false;
    }
  };

  // El encargado cancela / descarta la lectura
  const handleCancelApproval = () => {
    setPendingApproval(null);
    setLastScanError(null);
    // Añadir breve cooldown de 4s para no volver a tomar el mismo inmediatamente
    setTimeout(() => {
      isPausedRef.current = false;
    }, 400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-4 pb-2 bg-stone-900 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Control de Asistencia
                  <span className="text-xs font-normal text-stone-400">
                    Punto de Acceso
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-400">
                  Escanee el QR. El encargado aprueba el movimiento y continúa.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="border-stone-700 text-emerald-400 bg-stone-800 text-xs">
                <Users className="h-3.5 w-3.5 mr-1" />
                {currentlyPresent.length} en finca
              </Badge>
              {!isOnline && (
                <Badge variant="outline" className="border-amber-600/50 text-amber-300 bg-amber-950/60 text-[10px] px-1.5 py-0 font-medium">
                  Modo Offline
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 pt-2">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-3 mb-3">
              <TabsTrigger value="scanner" className="text-xs flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> Escáner Rápido
              </TabsTrigger>
              <TabsTrigger value="present" className="text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Presentes ({currentlyPresent.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Hoy ({todayLogs.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ESCÁNER EN VIVO */}
            <TabsContent value="scanner" className="mt-0 space-y-2">
              <div className="relative w-full h-[410px] sm:h-[450px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-stone-800 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser scan line overlay (visible solo cuando busca) */}
                {!pendingApproval && !lastCheckResult && !lastScanError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-52 h-52 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400/60 rounded-2xl flex items-center justify-center relative">
                      <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#10b981]" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-300 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Apunta la credencial digital o física al recuadro
                    </span>
                  </div>
                )}

                {/* MODAL DE APROBACIÓN POR EL ENCARGADO - ULTRA ADAPTADO A CELULARES */}
                {pendingApproval && (
                  <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 text-center overflow-y-auto z-40">
                    {/* Botón rápido de cierre en la esquina */}
                    <button
                      type="button"
                      onClick={handleCancelApproval}
                      disabled={isSubmitting}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
                      title="Descartar y volver a escanear"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="flex flex-col items-center w-full max-w-sm space-y-2 sm:space-y-3 my-auto">
                      {/* Avatar del Colaborador */}
                      <div className="relative">
                        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-emerald-500 shadow-lg">
                          <AvatarImage src={pendingApproval.photoUrl} />
                          <AvatarFallback className="text-lg sm:text-xl font-bold bg-primary text-primary-foreground">
                            {pendingApproval.data.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-stone-950" />
                      </div>

                      {/* Nombre y Cargo */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-[260px] sm:max-w-xs leading-tight">
                          {pendingApproval.data.name}
                        </h3>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-2 border-stone-700 text-stone-300">
                            {pendingApproval.data.role || (pendingApproval.data.type === 'collector' ? 'Recolector' : 'Colaborador')}
                          </Badge>
                          {pendingApproval.data.dni && (
                            <span className="text-[10px] text-stone-400 font-mono">DNI: {pendingApproval.data.dni}</span>
                          )}
                        </div>
                      </div>

                      {/* Botón Principal Interactivo y de Confirmación Directa */}
                      <div className="w-full">
                        {pendingApproval.actionType === 'in' ? (
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            className="w-full p-3 sm:p-3.5 rounded-2xl bg-primary hover:bg-primary/90 active:bg-primary text-primary-foreground shadow-lg active:scale-[0.98] transition-all border border-primary/40 flex flex-col items-center justify-center cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold tracking-wide text-primary-foreground">
                              <LogIn className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                              {isSubmitting ? 'GUARDANDO INGRESO...' : '✓ CONFIRMAR INGRESO'}
                            </div>
                            <div className="text-xs text-primary-foreground/90 font-medium mt-1">
                              Hora de llegada: <strong className="text-primary-foreground font-mono text-sm">{pendingApproval.currentTimeStr} hs</strong>
                            </div>
                            <span className="text-[10px] text-primary-foreground/80 mt-0.5">Toca aquí para aprobar el ingreso</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            className="w-full p-3 sm:p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg active:scale-[0.98] transition-all border border-blue-400 flex flex-col items-center justify-center cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold tracking-wide text-white">
                              <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                              {isSubmitting ? 'GUARDANDO SALIDA...' : '✓ CONFIRMAR SALIDA'}
                            </div>
                            <div className="text-xs text-blue-100 font-medium mt-1">
                              Salida: <strong className="text-white font-mono">{pendingApproval.currentTimeStr} hs</strong> (Ingresó {pendingApproval.existingCheckInTime} hs)
                            </div>
                            <div className="text-xs font-bold text-amber-300 mt-0.5">
                              Jornada calculada: <span className="font-mono">{pendingApproval.hoursWorked} horas</span>
                            </div>
                            <span className="text-[10px] text-blue-200 mt-0.5">Toca aquí para aprobar la salida</span>
                          </button>
                        )}
                      </div>

                      {/* Botones Secundarios */}
                      <div className="flex items-center justify-between w-full pt-1 px-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelApproval}
                          disabled={isSubmitting}
                          className="h-8 text-xs text-stone-400 hover:text-white hover:bg-stone-800 gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" /> Descartar
                        </Button>

                        {pendingApproval.isDynamic ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <ShieldCheck className="h-3 w-3" /> Token Dinámico
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">Credencial Oficial</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Banner de Éxito posterior a la aprobación */}
                {lastCheckResult && (
                  <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-150 z-30">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white truncate max-w-full">
                      {lastCheckResult.name}
                    </h3>
                    <p className="text-xs text-stone-300 mt-0.5">
                      {lastCheckResult.type === 'in' 
                        ? `✓ Ingreso registrado (${lastCheckResult.time} hs)`
                        : `✓ Salida registrada (${lastCheckResult.hoursWorked} hs trabajadas)`}
                    </p>
                    {!isOnline ? (
                      <span className="text-[10px] text-amber-300 mt-1.5 flex items-center gap-1 font-medium bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                        Guardado en dispositivo • Se subirá al volver la red
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 mt-1.5 font-medium">
                        Registrado correctamente
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 mt-1">Listo para el siguiente...</span>
                  </div>
                )}

                {/* Alerta de Error / Expirado */}
                {lastScanError && (
                  <div className="absolute inset-0 bg-rose-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 z-30">
                    <XCircle className="h-12 w-12 text-rose-500 mb-2" />
                    <h4 className="text-base font-bold text-white">Código no válido o expirado</h4>
                    <p className="text-xs text-rose-200 max-w-sm mt-1 mb-4">{lastScanError}</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setLastScanError(null);
                        isPausedRef.current = false;
                      }}
                      className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                    >
                      Reintentar Escaneo
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Detección inteligente con confirmación manual del encargado.</span>
                <Button variant="ghost" size="sm" onClick={() => startCamera()} className="h-7 text-xs gap-1">
                  <RefreshCw className="h-3 w-3" /> Reiniciar Cámara
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: QUIÉNES ESTÁN EN FINCA AHORA */}
            <TabsContent value="present" className="mt-0 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-semibold text-muted-foreground">Personal actualmente en el campo</span>
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-[11px]">
                  {currentlyPresent.length} trabajando
                </Badge>
              </div>

              {currentlyPresent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Users className="h-8 w-8 mx-auto opacity-40 mb-1" />
                  No hay personal activo en la quinta en este momento.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {currentlyPresent.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {att.personnelName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-foreground truncate">{att.personnelName}</p>
                          <p className="text-[11px] text-muted-foreground">{att.role}</p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            🟢 En finca
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Desde {format(new Date(att.checkIn), 'HH:mm')} hs ({formatDistanceToNow(new Date(att.checkIn), { locale: es })})
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] text-stone-600 border-dashed"
                          onClick={() => {
                            recordAttendanceCheck({
                              personnelId: att.personnelId,
                              personnelName: att.personnelName,
                              role: att.role,
                              method: 'manual'
                            });
                            toast({ title: 'Salida Registrada', description: `Se marcó salida manual para ${att.personnelName}.` });
                          }}
                        >
                          Marcar Salida
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: HISTORIAL DE HOY */}
            <TabsContent value="history" className="mt-0 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b">
                <span className="text-xs font-semibold text-muted-foreground">Registro total de la jornada de hoy</span>
                <span className="text-xs text-muted-foreground font-mono">{format(new Date(), 'PPP', { locale: es })}</span>
              </div>

              {todayLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Clock className="h-8 w-8 mx-auto opacity-40 mb-1" />
                  Aún no hay movimientos de asistencia registrados hoy.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {todayLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs">
                      <div>
                        <p className="font-bold text-foreground">{log.personnelName}</p>
                        <p className="text-[11px] text-muted-foreground">{log.role} {log.dni ? `(DNI: ${log.dni})` : ''}</p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-[11px] font-mono text-emerald-600">
                            Entrada: {format(new Date(log.checkIn), 'HH:mm')}
                          </span>
                          {log.checkOut && (
                            <span className="text-[11px] font-mono text-blue-600">
                              Salida: {format(new Date(log.checkOut), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        {log.totalHoursWorked ? (
                          <Badge variant="outline" className="text-[10px] mt-0.5 font-semibold text-primary">
                            Total: {log.totalHoursWorked} hs
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] mt-0.5 text-emerald-600 bg-emerald-50">
                            🟢 En curso
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
