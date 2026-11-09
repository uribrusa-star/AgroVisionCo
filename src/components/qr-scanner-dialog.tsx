'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, AlertCircle, QrCode } from 'lucide-react';

interface QRScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

export function QRScannerDialog({
  isOpen,
  onOpenChange,
  onScanSuccess,
  title = "Escanear Credencial QR",
  description = "Apunte la cámara a la credencial del cosechero o embalador."
}: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    setHasCameraError(false);
    setErrorMessage('');
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no es soportada en este navegador o requiere conexión HTTPS.');
      }

      // Priorizar cámara trasera en móviles (facingMode: environment)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        startDetectionLoop();
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setHasCameraError(true);
      setErrorMessage(err.message || 'No se pudo acceder a la cámara. Verifique los permisos.');
    }
  };

  const startDetectionLoop = () => {
    // Verificar si el navegador soporta la API nativa de BarcodeDetector (Chrome, Edge, Android)
    const hasBarcodeDetector = 'BarcodeDetector' in window;

    if (hasBarcodeDetector) {
      // @ts-ignore
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      
      const detect = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameId.current = requestAnimationFrame(detect);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleDetectedCode(rawValue);
            return;
          }
        } catch {
          // continuar escaneando
        }

        animationFrameId.current = requestAnimationFrame(detect);
      };

      animationFrameId.current = requestAnimationFrame(detect);
    } else {
      // Fallback a canvas si no tiene BarcodeDetector nativo
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const detectCanvas = () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameId.current = requestAnimationFrame(detectCanvas);
          return;
        }

        // Si no hay BarcodeDetector nativo en navegadores antiguos, mostramos aviso amigable
        animationFrameId.current = requestAnimationFrame(detectCanvas);
      };

      animationFrameId.current = requestAnimationFrame(detectCanvas);
    }
  };

  const handleDetectedCode = (rawValue: string) => {
    stopCamera();
    onScanSuccess(rawValue);
    onOpenChange(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Camera className="h-5 w-5" />
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-emerald-500/40">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Guía visual de escaneo */}
          {isScanning && !hasCameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 border-2 border-emerald-400 rounded-2xl relative animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399]" />
              </div>
            </div>
          )}

          {/* Mensaje de error de cámara */}
          {hasCameraError && (
            <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-semibold text-sm">No se pudo iniciar la cámara</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button size="sm" variant="outline" onClick={startCamera} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </Button>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground">
          <span>Mantenga el código dentro del marco</span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
