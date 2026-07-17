'use client';

import React, { useContext, useMemo, useState, useTransition } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importación directa corregida
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, FileDown, Info, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PackagingLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Función para convertir el logo a Base64 de forma segura
const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return '';
  }
};

function PackagingHistoryComponent() {
  const { loading, packagingLogs, deletePackagingLog, currentUser, establishmentData } = useContext(AppDataContext);
  const [selectedLog, setSelectedLog] = useState<PackagingLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const { toast } = useToast();

  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const sortedLogs = useMemo(() =>
    [...(packagingLogs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [packagingLogs]
  );

  const handleDelete = (logId: string) => {
    startTransition(async () => {
      await deletePackagingLog(logId);
      toast({ title: "Registro Eliminado", description: "El registro ha sido eliminado." });
      setSelectedLog(null);
    });
  }

  const handleGenerateReceipt = () => {
    if (!selectedLog || !establishmentData) return;

    startPdfTransition(async () => {
      toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
      try {
        const doc = new jsPDF();
        
        // Carga del Logo
        const logoBase64 = await getBase64ImageFromUrl('/logo.png');
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, 12, 18, 18);
        }

        // Cabecera
        doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
        doc.text('Establecimiento:', 40, 17);
        
        doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(0);
        doc.text(establishmentData.producer, 40, 24);
        
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(150);
        doc.text(`${establishmentData.location.locality}, ${establishmentData.location.province}`, 40, 30);
        
        doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(0);
        doc.text('RECIBO DE PAGO POR EMBALAJE', 105, 50, { align: 'center' });

        doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(80);
        doc.text(`Fecha: ${new Date(selectedLog.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12).setTextColor(0);
        doc.text(`Por medio del presente, se deja constancia de que ${selectedLog.packerName} ha recibido el pago por los servicios de embalaje detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

        const tableBody = [
          ['Kilos Embalados', `${selectedLog.kilogramsPackaged.toLocaleString('es-AR')} kg`],
          ['Horas Trabajadas', `${selectedLog.hoursWorked.toLocaleString('es-AR')} hs`],
          ['Costo por Hora', `$${selectedLog.costPerHour.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
          ['Total Pagado', `$${selectedLog.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
        ];
        
        // SOLUCIÓN AL ERROR CRÍTICO: Usar autoTable como función independiente
        autoTable(doc, {
          startY: bodyY + 25,
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [38, 70, 83] },
          styles: { fontSize: 12, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f8f9fa' } }
        });

        // @ts-ignore - Obtener la posición final de la tabla
        const finalY = doc.lastAutoTable?.finalY || 150;

        doc.setFontSize(11).text('Firma del Embalador: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${selectedLog.packerName}`, 15, finalY + 40);

        doc.setFontSize(9).setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        doc.save(`Recibo_Embalaje_${selectedLog.packerName.replace(/\s+/g, '_')}.pdf`);
        toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado exitosamente.' });
      
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({ title: 'Error', description: 'No se pudo generar el recibo.', variant: 'destructive' });
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Historial de Embalaje
          </CardTitle>
          <CardDescription>Registro de trabajos realizados. Haz clic para ver detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-auto pr-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : sortedLogs.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">No hay registros de embalaje.</div>
            ) : (
              sortedLogs.map(log => (
                <div 
                  key={log.id} 
                  className="shrink-0 group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                      <div className="shrink-0 flex items-center justify-center">
                          <Badge variant="secondary" className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                              <Package className="h-5 w-5" />
                          </Badge>
                      </div>
                      <div className="min-w-0 flex flex-col justify-center flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-sm truncate leading-none">{log.packerName}</span>
                              <span className="text-xs text-muted-foreground shrink-0 leading-none">{new Date(log.date).toLocaleDateString('es-AR')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                              Pago total: <span className="font-bold text-foreground">${log.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                          </p>
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-lg">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> Detalles</DialogTitle>
                <DialogDescription>Revisión del registro y generación de comprobante.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <Card className="shadow-none border-muted">
                  <CardContent className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between"><span>Embalador</span><span className="font-semibold">{selectedLog.packerName}</span></div>
                    <div className="flex justify-between"><span>Kilos</span><span>{selectedLog.kilogramsPackaged} kg</span></div>
                    <div className="flex justify-between"><span>Horas</span><span>{selectedLog.hoursWorked} hs</span></div>
                    <hr />
                    <div className="flex justify-between items-center"><span className="font-bold">Total Pago</span><span className="text-lg font-bold text-primary">${selectedLog.payment.toLocaleString('es-AR')}</span></div>
                  </CardContent>
                </Card>
              </div>
              <DialogFooter className="flex flex-col gap-2 pt-2">
                <Button variant="outline" onClick={handleGenerateReceipt} disabled={isPdfPending} className="w-full">
                  <FileDown className="h-4 w-4 mr-2" /> {isPdfPending ? "Generando..." : "Descargar PDF"}
                </Button>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button variant="secondary" onClick={() => setSelectedLog(null)}>Cerrar</Button>
                  {canManage && (
                    <Button variant="destructive" onClick={() => handleDelete(selectedLog.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const PackagingHistory = React.memo(PackagingHistoryComponent);
