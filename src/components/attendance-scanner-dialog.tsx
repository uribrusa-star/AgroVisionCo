'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, QrCode, CheckCircle2, LogIn, LogOut, Clock, Users, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { parseAndValidateAttendanceQR } from '@/lib/qr-security';
import { getRoleAvatar } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AttendanceScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Audio feedback synthesizers using Web Audio API
const playSound = (type: 'in' | 'out' | 'error') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'in') {
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
  const [isProcessing, setIsProcessing] = useState(false);
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
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = attendanceLogs.filter(l => l.date === todayStr);
  const currentlyPresent = todayLogs.filter(l => l.status === 'in_progress');

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
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err) {
      console.error('Error starting attendance camera:', err);
      toast({
        title: 'Error de Cámara',
        description: 'No se pudo acceder a la cámara. Verifique los permisos de su dispositivo.',
        variant: 'destructive'
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const startScanningLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || isProcessing) return;

      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      // Use native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleScannedCode(rawValue);
          }
        } catch {
          // Fallback or unsupported formats
        }
      }
    }, 450);
  };

  const handleScannedCode = async (rawCode: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const validation = parseAndValidateAttendanceQR(rawCode);

    if (!validation.valid || !validation.data) {
      playSound('error');
      setLastScanError(validation.error || 'Código QR no reconocido');
      setTimeout(() => {
        setLastScanError(null);
        setIsProcessing(false);
      }, 3000);
      return;
    }

    const { data, isDynamic } = validation;

    try {
      const result = await recordAttendanceCheck({
        personnelId: data.id,
        personnelName: data.name,
        role: data.role || (data.type === 'collector' ? 'Recolector' : data.type === 'packer' ? 'Embalador' : 'Personal'),
        dni: data.dni,
        method: 'scan_gate'
      });

      // Find user/collector/packer avatar
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

      playSound(result.type);
      setLastScanError(null);
      setLastCheckResult({
        type: result.type,
        name: data.name,
        role: data.role || (data.type === 'collector' ? 'Recolector' : data.type === 'packer' ? 'Embalador' : 'Colaborador'),
        hoursWorked: result.hoursWorked,
        time: format(new Date(), 'HH:mm'),
        isDynamic,
        photo: photoUrl
      });

      // Auto clear after 2.8s to let the next worker scan smoothly
      setTimeout(() => {
        setLastCheckResult(null);
        setIsProcessing(false);
      }, 2800);

    } catch (err) {
      console.error('Error processing attendance check:', err);
      playSound('error');
      setLastScanError('No se pudo registrar la asistencia.');
      setTimeout(() => {
        setLastScanError(null);
        setIsProcessing(false);
      }, 2500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-4 pb-2 bg-stone-900 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Control de Asistencia
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Tranquera / Puerta
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-400">
                  Escanee el QR para registrar entrada o salida automática
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-stone-700 text-emerald-400 bg-stone-800 text-xs">
              <Users className="h-3.5 w-3.5 mr-1" />
              {currentlyPresent.length} en finca
            </Badge>
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
            <TabsContent value="scanner" className="mt-0 space-y-3">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-stone-800 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser scan line overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-64 border-2 border-dashed border-emerald-400/60 rounded-2xl flex items-center justify-center relative">
                    <div className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#10b981]" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-300 mt-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    Apunta la credencial digital o física al recuadro
                  </span>
                </div>

                {/* Popup overlay on successful check IN/OUT */}
                {lastCheckResult && (
                  <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200 z-30">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-xl mb-3">
                      <AvatarImage src={lastCheckResult.photo} />
                      <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                        {lastCheckResult.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="text-xl font-bold text-white truncate max-w-full">
                      {lastCheckResult.name}
                    </h3>
                    <p className="text-xs text-stone-400 mb-3">{lastCheckResult.role}</p>

                    {lastCheckResult.type === 'in' ? (
                      <div className="flex flex-col items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-5 py-2.5 rounded-2xl">
                        <span className="flex items-center gap-2 text-base font-bold">
                          <LogIn className="h-5 w-5 text-emerald-400" /> ¡INGRESO REGISTRADO!
                        </span>
                        <span className="text-xs text-stone-300">Hora de llegada: <strong>{lastCheckResult.time} hs</strong></span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 px-5 py-2.5 rounded-2xl">
                        <span className="flex items-center gap-2 text-base font-bold">
                          <LogOut className="h-5 w-5 text-blue-400" /> ¡SALIDA REGISTRADA!
                        </span>
                        <span className="text-xs text-stone-300">Jornada cumplida: <strong>{lastCheckResult.hoursWorked} horas</strong></span>
                      </div>
                    )}

                    {lastCheckResult.isDynamic && (
                      <span className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Credencial Dinámica Antifraude Validada
                      </span>
                    )}
                  </div>
                )}

                {/* Popup error / expired screenshot */}
                {lastScanError && (
                  <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 z-30">
                    <XCircle className="h-14 w-14 text-rose-500 mb-2" />
                    <h4 className="text-base font-bold text-white">Alerta de Seguridad</h4>
                    <p className="text-xs text-rose-200 max-w-sm mt-1 mb-3">{lastScanError}</p>
                    <span className="text-[10px] text-stone-400">Reintentando escaneo en breve...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Detección inteligente: <strong>Ingreso</strong> (1er pase) / <strong>Salida</strong> (2do pase).</span>
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
