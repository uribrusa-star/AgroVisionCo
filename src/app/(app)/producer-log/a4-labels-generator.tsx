'use client';

import React, { useContext, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { generateA4TraceabilitySheetPDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { QrCode, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function A4LabelsGenerator() {
  const { collectorPaymentLogs, batches, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const logsWithBatch = (collectorPaymentLogs || []).map(log => {
    const batch = (batches || []).find(b => b.id === log.batchId);
    return {
      ...log,
      batchNumber: batch?.batchNumber || 'N/A'
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDownloadSheet = async (log: typeof logsWithBatch[0]) => {
    setDownloadingId(log.id);
    try {
      await generateA4TraceabilitySheetPDF(
        log.batchNumber,
        log.date,
        log.traceabilityId,
        establishmentData?.producer || 'AgroVista',
        establishmentData?.location?.locality || '',
        '/logo.png'
      );
      toast({
        title: "Planilla A4 Descargada",
        description: `Se generó la hoja con 8 etiquetas para el Lote ${log.batchNumber}.`,
      });
    } catch (e) {
      console.error("Error generating A4 labels sheet:", e);
      toast({
        title: "Error",
        description: "No se pudo generar la planilla A4.",
        variant: "destructive"
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (logsWithBatch.length === 0) {
    return null;
  }

  return (
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
  );
}
