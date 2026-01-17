
'use client';

import React, { useContext, useMemo, useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, FileDown, HardHat, Info, Trash2 } from 'lucide-react';
import type { PackagingLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

function PackagingHistoryComponent() {
  const { loading, packagingLogs, deletePackagingLog, currentUser, establishmentData } = useContext(AppDataContext);
  const [selectedLog, setSelectedLog] = useState<PackagingLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const { toast } = useToast();
  const logoRef = useRef<HTMLDivElement>(null);


  const canManage = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado';

  const sortedLogs = useMemo(() =>
    [...(packagingLogs || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [packagingLogs]
  );
  
  const handleDelete = (logId: string) => {
    startTransition(async () => {
        await deletePackagingLog(logId);
        toast({
            title: "Registro Eliminado",
            description: "El registro de embalaje ha sido eliminado.",
        });
        setSelectedLog(null);
    });
  }

  const handleGenerateReceipt = () => {
    if (!selectedLog || !establishmentData) return;

    startPdfTransition(async () => {
      toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
      try {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        let logoPngDataUri = '';

        if (logoRef.current) {
          const canvas = await html2canvas(logoRef.current, { backgroundColor: null, scale: 3 });
          logoPngDataUri = canvas.toDataURL('image/png');
        }

        if (logoPngDataUri) {
          doc.addImage(logoPngDataUri, 'PNG', 15, 12, 18, 18);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(establishmentData.producer, 40, 22);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`${establishmentData.location.locality}, ${establishmentData.location.province}`, 40, 28);
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE PAGO POR EMBALAJE', 105, 50, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Fecha: ${new Date(selectedLog.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12);
        doc.text(`Por medio del presente, se deja constancia de que ${selectedLog.packerName} ha recibido el pago por los servicios de embalaje detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

        const tableBody = [
            ['Kilos Embalados', `${selectedLog.kilogramsPackaged.toLocaleString('es-AR')} kg`],
            ['Horas Trabajadas', `${selectedLog.hoursWorked.toLocaleString('es-AR')} hs`],
            ['Costo por Hora', `$${selectedLog.costPerHour.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
            ['Total Pagado', `$${selectedLog.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
        ];
        
        doc.autoTable({
            startY: bodyY + 25,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [38, 70, 83] },
            styles: { fontSize: 12, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f8f9fa' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(11);
        doc.text('Firma del Embalador: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${selectedLog.packerName}`, 15, finalY + 40);

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        doc.save(`Recibo_Embalaje_${selectedLog.packerName.replace(' ', '_')}_${new Date(selectedLog.date).toLocaleDateString('sv-SE')}.pdf`);
        toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado exitosamente.' });
      
      } catch (error) {
        console.error("PDF generation error:", error);
        toast({ title: 'Error', description: 'No se pudo generar el recibo en PDF.', variant: 'destructive'});
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Embalaje</CardTitle>
          <CardDescription>Un registro de los últimos trabajos de embalaje. Haga clic para ver detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-auto">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Embalador</TableHead>
                    <TableHead className="text-right">Kilos</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4}>
                          <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No hay registros de embalaje.</TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.map(log => (
                    <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
                      <TableCell>{new Date(log.date).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell className="font-medium">{log.packerName}</TableCell>
                      <TableCell className="text-right">{log.kilogramsPackaged.toLocaleString('es-ES')} kg</TableCell>
                      <TableCell className="text-right font-bold">${log.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden Logo for PDF generation */}
       <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
          <div ref={logoRef} style={{width: '96px', height: '96px'}}>
              <Image src="/logo.png" alt="AgroVision Logo" width={96} height={96} />
          </div>
       </div>

       <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                   Detalles del Registro de Embalaje
                </DialogTitle>
                 <DialogDescription>
                    Revisión del registro de embalaje y pago.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                  </div>
                  <Card>
                      <CardContent className="p-4 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Embalador</span>
                              <span className="font-semibold">{selectedLog.packerName}</span>
                           </div>
                            <hr />
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Kilos Embalados</span>
                              <span className="font-semibold">{selectedLog.kilogramsPackaged.toLocaleString('es-ES')} kg</span>
                           </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Horas Trabajadas</span>
                              <span className="font-semibold">{selectedLog.hoursWorked.toLocaleString('es-ES')} hs</span>
                           </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Costo por Hora</span>
                              <span className="font-semibold">${selectedLog.costPerHour.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                           </div>
                           <hr />
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Pago Total Calculado</span>
                              <span className="font-bold text-lg text-primary">${selectedLog.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                           </div>
                      </CardContent>
                  </Card>
              </div>

               <DialogFooter className="flex-row justify-between w-full pt-2">
                    <div className="flex gap-2">
                        {canManage ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" disabled={isPending}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Eliminar</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de embalaje y reajustará las estadísticas del embalador.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Continuar y Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : <div />}
                        <Button variant="outline" onClick={handleGenerateReceipt} disabled={isPdfPending || !canManage}>
                            <FileDown className="h-4 w-4 mr-2" />
                            {isPdfPending ? "Generando..." : "Generar Recibo"}
                        </Button>
                    </div>
                  <Button onClick={() => setSelectedLog(null)} variant="secondary">Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const PackagingHistory = React.memo(PackagingHistoryComponent);
