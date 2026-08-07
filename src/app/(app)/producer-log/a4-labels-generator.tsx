'use client';

import React, { useContext, useState, useRef } from 'react';
import Image from 'next/image';
import QRCode from "react-qr-code";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { generateA4SheetFromImageDataUrl } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { QrCode, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function A4LabelsGenerator() {
  const { collectorPaymentLogs, batches, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<typeof logsWithBatch[0] | null>(null);
  const hiddenLabelRef = useRef<HTMLDivElement>(null);

  const logsWithBatch = (collectorPaymentLogs || []).map(log => {
    const batch = (batches || []).find(b => b.id === log.batchId);
    return {
      ...log,
      batchNumber: batch?.batchNumber || 'N/A'
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDownloadSheet = async (log: typeof logsWithBatch[0]) => {
    setDownloadingId(log.id);
    setActiveLog(log);

    toast({
      title: "Generando Planilla A4",
      description: `Capturando etiqueta de lote ${log.batchNumber}...`,
    });

    try {
      // Wait for React to mount the activeLog inside hiddenLabelRef
      await new Promise(resolve => setTimeout(resolve, 150));

      if (hiddenLabelRef.current) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(hiddenLabelRef.current, {
          scale: 3,
        });

        const dataUrl = canvas.toDataURL('image/png');
        generateA4SheetFromImageDataUrl(dataUrl, log.batchNumber);

        toast({
          title: "Éxito",
          description: `Planilla A4 descargada con 8 etiquetas idénticas para el Lote ${log.batchNumber}.`,
        });
      }
    } catch (e) {
      console.error("Error generating A4 labels sheet:", e);
      toast({
        title: "Error",
        description: "No se pudo generar la planilla A4.",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
      setActiveLog(null);
    }
  };

  if (logsWithBatch.length === 0) {
    return null;
  }

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://agrovista.com.ar';

  return (
    <>
      {/* Hidden offscreen label DOM container for html2canvas high-res capture */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {activeLog && (
          <div 
            ref={hiddenLabelRef}
            style={{ width: '500px', height: '340px' }}
            className="p-5 border-2 border-stone-200 rounded-lg shadow-sm bg-white text-stone-800 flex flex-col justify-between relative overflow-hidden shrink-0"
          >
            {/* Botanical Background Watermark */}
            <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
              <Image 
                src="/botanical-strawberry.png" 
                alt="Strawberry Botanical Watermark" 
                width={380} 
                height={380} 
                className="object-contain" 
              />
            </div>

            <div className="flex justify-between items-stretch h-full gap-4 relative z-10">
              {/* Left Column (Brand & Batch Details) */}
              <div className="flex flex-col justify-between flex-1 pr-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Image src="/logo.png" alt="AgroVista Logo" width={28} height={28} className="h-7 w-auto object-contain" />
                    <div>
                      <h3 className="text-lg font-bold text-[#2d4a22] leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>AgroVista</h3>
                      {establishmentData?.location?.locality && (
                        <p className="text-[10px] text-stone-500 font-medium tracking-wider uppercase">
                          {establishmentData.location.locality}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="my-2">
                    <p className="text-xs text-stone-500 italic">Establecimiento:</p>
                    <p className="text-xl font-bold text-[#2d4a22]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {establishmentData?.producer || 'AgroVista'}
                    </p>
                  </div>
                  
                  <p className="text-[11px] font-bold text-stone-700 tracking-wider uppercase mt-1">
                    CONOZCA LA HISTORIA DE SU FRUTILLA
                  </p>
                </div>

                <div className="mt-auto space-y-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <p className="text-sm text-stone-800">Lote: <b className="text-black text-base">{activeLog.batchNumber}</b></p>
                  <p className="text-sm text-stone-800">Fecha: <b className="text-black text-base">{new Date(activeLog.date).toLocaleDateString('es-ES')}</b></p>
                  <p className="text-[10px] text-stone-600 font-mono tracking-tight mt-1">{activeLog.traceabilityId}</p>
                </div>
              </div>

              {/* Right Column (QR) */}
              <div className="w-[180px] flex flex-col items-center justify-center z-10 pb-2">
                <div className="p-2 border-2 border-[#2d4a22] rounded-sm shadow-sm relative bg-white">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#2d4a22] -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#2d4a22] translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#2d4a22] -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#2d4a22] translate-x-1 translate-y-1"></div>
                  
                  <QRCode value={`${originUrl}/trace/${activeLog.traceabilityId}`} size={130} bgColor="transparent" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-lg shadow-black/5 bg-white dark:bg-stone-900 overflow-hidden">
        <CardHeader className="bg-emerald-950 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <QrCode className="h-5 w-5 text-emerald-400" />
                Impresión de Planillas de Etiquetas A4 (8x)
              </CardTitle>
              <CardDescription className="text-emerald-200/80 text-xs mt-1">
                Selecciona una cosecha para descargar una planilla A4 con 8 etiquetas idénticas del mismo lote para pegar en cajones.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-900/50 hidden sm:flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" /> 8 por Hoja
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {logsWithBatch.slice(0, 10).map((log) => (
              <div 
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        Lote: {log.batchNumber}
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-stone-200/60 dark:bg-stone-700 font-mono">
                        {log.traceabilityId}
                      </Badge>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-3">
                      <span>{format(new Date(log.date), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                      <span>•</span>
                      <span>Recolector: <strong className="text-stone-700 dark:text-stone-300">{log.collectorName}</strong></span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{log.kilograms} kg</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleDownloadSheet(log)}
                  disabled={downloadingId === log.id}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm sm:shrink-0 w-full sm:w-auto h-9"
                >
                  {downloadingId === log.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Descargar Planilla A4 (8x)
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

