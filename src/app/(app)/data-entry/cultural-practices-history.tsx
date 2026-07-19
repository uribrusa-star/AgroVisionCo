
'use client';

import React, { useContext, useMemo, useState, useTransition, useRef } from 'react';
import Image from 'next/image';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { CulturalPracticeLog } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, HardHat, Info, Trash2, Watch, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

function CulturalPracticesHistoryComponent() {
  const { loading, culturalPracticeLogs, deleteCulturalPracticeLog, currentUser, establishmentData } = useContext(AppDataContext);
  const [selectedLog, setSelectedLog] = useState<CulturalPracticeLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const { toast } = useToast();
  const logoRef = useRef<HTMLDivElement>(null);

  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const sortedLogs = useMemo(() =>
    [...culturalPracticeLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [culturalPracticeLogs]
  );
  
  const handleDelete = (logId: string) => {
    startTransition(async () => {
      await deleteCulturalPracticeLog(logId);
      toast({
          title: "Registro Eliminado",
          description: "El registro de la labor ha sido eliminado exitosamente.",
      });
      setSelectedLog(null);
    });
  }
  
  const handleGenerateReceipt = () => {
    if (!selectedLog || !establishmentData) return;

    startPdfTransition(async () => {
      toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
      try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const html2canvas = (await import('html2canvas')).default;
        const doc = new jsPDF() as jsPDFWithAutoTable;
        let logoPngDataUri = '';

        if (logoRef.current) {
          const canvas = await html2canvas(logoRef.current, { backgroundColor: null, scale: 3 });
          logoPngDataUri = canvas.toDataURL('image/png');
        }
        
        if (logoPngDataUri) {
          doc.addImage(logoPngDataUri, 'PNG', 15, 12, 18, 18);
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Establecimiento:', 40, 17);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(establishmentData.producer, 40, 24);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`${establishmentData.location.locality}, ${establishmentData.location.province}`, 40, 30);
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE PAGO POR LABOR CULTURAL', 105, 50, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Fecha: ${new Date(selectedLog.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12);
        doc.text(`Por medio del presente, se deja constancia de que ${selectedLog.personnelName} ha recibido el pago por los servicios detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

        const tableBody = [
            ['Tipo de Labor', `${selectedLog.practiceType}`],
            ['Lotes', `${selectedLog.batchIds && selectedLog.batchIds.length > 0 ? selectedLog.batchIds.join(', ') : 'General'}`],
            ['Horas Trabajadas', `${selectedLog.hoursWorked.toLocaleString('es-AR')} hs`],
            ['Costo por Hora', `$${selectedLog.costPerHour.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
            ['Total Pagado', `$${selectedLog.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
        ];
        
        autoTable(doc, {
            startY: bodyY + 25,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [38, 70, 83] },
            styles: { fontSize: 12, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f8f9fa' } }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        doc.setFontSize(11);
        doc.text('Firma: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${selectedLog.personnelName}`, 15, finalY + 40);

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        doc.save(`Recibo_Labor_${selectedLog.personnelName.replace(' ', '_')}_${new Date(selectedLog.date).toLocaleDateString('sv-SE')}.pdf`);
        toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado exitosamente.' });
      
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({ title: 'Error', description: 'No se pudo generar el recibo en PDF.', variant: 'destructive'});
      }
    });
  }


  return (
    <>
      <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
          <div ref={logoRef} style={{width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <img src="/logo.png" alt="AgroVista Logo" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
          </div>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Labores Culturales</CardTitle>
          <CardDescription>Un registro de los últimos pagos por labores culturales. Haga clic para ver detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-auto pr-2">
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : sortedLogs.length === 0 ? (
                <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">No hay registros de labores.</div>
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
                                    <HardHat className="h-5 w-5" />
                                </Badge>
                            </div>
                            <div className="min-w-0 flex flex-col justify-center flex-1">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span className="font-semibold text-sm truncate leading-none">{log.personnelName}</span>
                                    <span className="font-bold text-sm shrink-0">${log.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate leading-tight mt-1 flex items-center justify-between w-full block">
                                    <span className="truncate flex-1">
                                        {new Date(log.date).toLocaleDateString('es-ES')} 
                                        <span className="mx-1.5 opacity-50">•</span> 
                                        {log.practiceType}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedLog && (
            <AlertDialog>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                   Detalles del Registro de Labor
                </DialogTitle>
                 <DialogDescription>
                    Revisión del registro de labor cultural y pago asociado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                  </div>
                  <Card>
                      <CardContent className="p-4 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Tipo de Labor</span>
                              <Badge variant="secondary">{selectedLog.practiceType}</Badge>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Personal</span>
                              <span className="font-semibold flex items-center gap-2"><HardHat className="h-4 w-4" /> {selectedLog.personnelName}</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Lotes</span>
                              <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                {selectedLog.batchIds && selectedLog.batchIds.length > 0 ? (
                                    selectedLog.batchIds.map(id => <Badge key={id} variant="outline">{id}</Badge>)
                                ) : (
                                    <Badge variant="outline">General</Badge>
                                )}
                              </div>
                           </div>
                            <hr />
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Horas Trabajadas</span>
                              <span className="font-semibold flex items-center gap-2"><Watch className="h-4 w-4"/> {selectedLog.hoursWorked.toLocaleString('es-ES')} hs</span>
                           </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Costo por Hora</span>
                              <span className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> {selectedLog.costPerHour.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                           </div>
                           <hr />
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Pago Total Calculado</span>
                              <span className="font-bold text-lg text-primary">${selectedLog.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                           </div>
                            <hr />
                           <div className="space-y-1">
                                <span className="text-sm text-muted-foreground">Notas</span>
                                <p className="font-semibold">{selectedLog.notes}</p>
                           </div>
                      </CardContent>
                  </Card>
              </div>

               <DialogFooter className="flex-row justify-between w-full pt-2">
                  <div className="flex gap-2">
                    {canManage ? (
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={isPending}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                            </Button>
                        </AlertDialogTrigger>
                    ) : <div />}
                     <Button variant="outline" onClick={handleGenerateReceipt} disabled={isPdfPending || !canManage}>
                        <FileDown className="h-4 w-4 mr-2" />
                        {isPdfPending ? "Generando..." : "Generar Recibo"}
                    </Button>
                  </div>
                  <Button onClick={() => setSelectedLog(null)} variant="secondary">Cerrar</Button>
                   <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de la labor y el pago asociado.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Continuar y Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </DialogFooter>
            </AlertDialog>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const CulturalPracticesHistory = React.memo(CulturalPracticesHistoryComponent);
