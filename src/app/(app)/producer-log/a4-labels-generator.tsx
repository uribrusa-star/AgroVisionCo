'use client';

import React, { useContext, useState, useRef } from 'react';
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
  const { collectorPaymentLogs, harvests, batches, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<typeof logsWithBatch[0] | null>(null);
  const hiddenLabelRef = useRef<HTMLDivElement>(null);

  const getBatchNumberForLog = (log: { harvestId?: string; batchId?: string }) => {
    if (log.harvestId) {
      const harvest = (harvests || []).find(h => h.id === log.harvestId);
      if (harvest?.batchNumber) return harvest.batchNumber;
    }
    if (log.batchId) {
      const batch = (batches || []).find(b => b.id === log.batchId);
      if (batch?.batchNumber) return batch.batchNumber;
    }
    return 'N/A';
  };

  const logsWithBatch = (collectorPaymentLogs || []).map(log => {
    return {
      ...log,
      batchNumber: getBatchNumberForLog(log)
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
      await new Promise(resolve => setTimeout(resolve, 200));

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
      {/* Hidden offscreen label DOM container - EXACT COPY of #traceability-label in production-payment-history.tsx */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        {activeLog && (
          <div 
            ref={hiddenLabelRef}
            id="traceability-label"
            className="relative overflow-hidden px-6 pt-4 pb-6 rounded-md border-2 border-stone-300 shadow-md flex shrink-0 bg-white"
            style={{ 
              width: '500px',
              minWidth: '500px',
              height: '340px',
              minHeight: '340px',
              color: '#333333',
            }}
          >
            {/* Botanical Background Watermark - standard img tag for html2canvas compatibility */}
            <img 
              src="/botanical-strawberry.png" 
              alt=""
              className="absolute right-[-12%] top-0 h-full w-[70%] object-contain opacity-25 pointer-events-none z-0"
              crossOrigin="anonymous"
            />

            {/* Left Column (Data) */}
            <div className="flex-1 flex flex-col justify-start z-10 pr-4">
              {/* Header Logo & Name */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                    <div className="flex flex-col justify-center">
                        <h2 className="text-2xl font-bold tracking-tight text-[#2d4a22]" style={{ fontFamily: "'Inter', sans-serif" }}>AgroVista</h2>
                        <p className="text-[11px] text-gray-600 tracking-[0.2em] uppercase mt-1">{establishmentData?.location?.locality}</p>
                    </div>
                </div>
                <div className="mt-2">
                    <p className="text-lg text-stone-600 font-serif" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Establecimiento:</p>
                    <h3 className="text-4xl text-[#2d4a22] drop-shadow-sm font-bold leading-none mt-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{establishmentData?.producer}</h3>
                </div>
              </div>

              {/* Call to Action Left */}
              <div className="mt-4 w-[85%]">
                  <p className="text-[15px] font-bold text-stone-700 uppercase tracking-widest leading-snug text-justify" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Conozca la historia de su frutilla
                  </p>
              </div>

              {/* Batch Data */}
              <div className="mt-auto space-y-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                <p className="text-sm text-stone-800">Lote: <b className="text-black text-base">{activeLog.batchNumber}</b></p>
                <p className="text-sm text-stone-800">Fecha: <b className="text-black text-base">{new Date(activeLog.date).toLocaleDateString('es-ES')}</b></p>
                <p className="text-[10px] text-stone-600 font-mono tracking-tight mt-1">{activeLog.traceabilityId}</p>
              </div>
            </div>

            {/* Right Column (QR) */}
            <div className="w-[180px] flex flex-col items-center justify-center z-10 pb-2">
              <div className="p-2 border-2 border-[#2d4a22] rounded-sm shadow-sm relative bg-white">
                {/* Decorative green corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#2d4a22] -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#2d4a22] translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#2d4a22] -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#2d4a22] translate-x-1 translate-y-1"></div>
                
                <QRCode value={`${originUrl}/trace/${activeLog.traceabilityId}`} size={130} bgColor="transparent" />
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-emerald-300" />
                      <span className="animate-pulse">Generando Pliego A4...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Descargar Pliego A4 (8x)
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

