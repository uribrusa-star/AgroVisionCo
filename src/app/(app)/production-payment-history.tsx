

'use client';

import React, { useContext, useMemo, useTransition, useState, useRef } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import QRCode from "react-qr-code";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, HardHat, Info, Trash2, Weight, FileDown, QrCode } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import type { CollectorPaymentLog } from '@/lib/types';

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

function ProductionPaymentHistoryComponent() {
  const { loading, collectorPaymentLogs, deleteCollectorPaymentLog, harvests, currentUser, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<CollectorPaymentLog | null>(null);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);


  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  const handleDelete = (logId: string) => {
    startTransition(async () => {
      await deleteCollectorPaymentLog(logId);
      toast({
          title: "Registro Eliminado",
          description: "El registro de producción y pago ha sido eliminado exitosamente.",
      });
      setSelectedLog(null); // Close the dialog after deletion
    });
  }

  const sortedLogs = useMemo(() =>
    [...collectorPaymentLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [collectorPaymentLogs]
  );
  
  const getHarvestForLog = (log: CollectorPaymentLog) => harvests.find(h => h.id === log.harvestId);

  const handleGenerateReceipt = () => {
    if (!selectedLog || !establishmentData) return;
    
    startPdfTransition(async () => {
        toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
        try {
            const doc = new jsPDF() as jsPDFWithAutoTable;
            let logoPngDataUri = '';

            if (logoRef.current) {
                const canvas = await html2canvas(logoRef.current, { backgroundColor: null });
                logoPngDataUri = canvas.toDataURL('image/png');
            }

            // Header
            if (logoPngDataUri) {
                doc.addImage(logoPngDataUri, 'PNG', 15, 12, 15, 15);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text(establishmentData.producer, 40, 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`${establishmentData.location.locality}, ${establishmentData.location.province}`, 40, 28);
            
            // Title
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('RECIBO DE PAGO', 105, 50, { align: 'center' });

            // Date
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            doc.text(`Fecha: ${new Date(selectedLog.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

            // Body
            const bodyY = 80;
            doc.setFontSize(12);
            doc.text(`Por medio del presente, se deja constancia de que ${selectedLog.collectorName} ha recibido el pago por los servicios de cosecha detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

            // Payment Details Table
            const tableBody = [
                ['Lote Cosechado', getHarvestForLog(selectedLog)?.batchNumber || 'N/A'],
                ['Kilos Cosechados', `${selectedLog.kilograms.toLocaleString('es-AR')} kg`],
                ['Tarifa por Kg', `$${selectedLog.ratePerKg.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
                ['Total Pagado', `$${selectedLog.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
            ];
            
            doc.autoTable({
                startY: bodyY + 25,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [38, 70, 83] }, // Primary color
                styles: { fontSize: 12, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: '#f8f9fa' },
                }
            });

            // Signature
            const finalY = (doc as any).lastAutoTable.finalY || 150;
            doc.setFontSize(11);
            doc.text('Firma del Recolector: _________________________', 15, finalY + 30);
            doc.text(`Aclaración: ${selectedLog.collectorName}`, 15, finalY + 40);

            // Footer
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

            doc.save(`Recibo_Pago_${selectedLog.collectorName.replace(' ', '_')}_${new Date(selectedLog.date).toLocaleDateString('sv-SE')}.pdf`);
            toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado exitosamente.' });
        
        } catch (error) {
            console.error("PDF generation error:", error);
            toast({ title: 'Error', description: 'No se pudo generar el recibo en PDF.', variant: 'destructive'});
        }
    });
  }

  const handlePrintLabel = async () => {
    if (!labelRef.current) return;
    toast({ title: 'Generando Etiqueta', description: 'Por favor espere...' });
    const canvas = await html2canvas(labelRef.current, {scale: 3});
    const dataUrl = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if(printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Etiqueta de Trazabilidad</title></head>
          <body style="margin:0; padding:0; display:flex; justify-content:center; align-items:center; height:100vh;">
            <img src="${dataUrl}" style="max-width:100%; max-height:100%;" />
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast({ title: 'Error', description: 'No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups.', variant: 'destructive' });
    }
  }


  return (
    <>
      {/* Hidden Logo for PDF generation */}
       <div style={{ position: 'fixed', opacity: 0, zIndex: -100, left: 0, top: 0, width: 'auto', height: 'auto' }} aria-hidden="true">
          <div ref={logoRef} style={{width: '96px', height: '96px'}}>
              <Image src="/logo.png" alt="AgroVision Logo" width={96} height={96} />
          </div>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Producción y Pagos</CardTitle>
          <CardDescription>Un registro de todas las cosechas y los pagos calculados. Haga clic en una fila para ver detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-auto">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Recolector</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={3}>
                          <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">No hay registros de producción.</TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedLogs.map(log => {
                    const harvest = getHarvestForLog(log);
                    const batchNum = harvest ? harvest.batchNumber : "L???";
                    return (
                      <TableRow key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer">
                        <TableCell><Badge variant="outline">{batchNum}</Badge></TableCell>
                        <TableCell className="font-medium">{log.collectorName}</TableCell>
                        <TableCell className="text-right font-bold">${log.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      

      <Dialog open={!!selectedLog} onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-xl">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                   Detalles del Registro
                </DialogTitle>
                 <DialogDescription>
                    Revisión del registro de producción y pago.
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
                              <span className="text-sm text-muted-foreground">Lote</span>
                              <Badge variant="outline">{getHarvestForLog(selectedLog)?.batchNumber || 'N/A'}</Badge>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Recolector</span>
                              <span className="font-semibold">{selectedLog.collectorName}</span>
                           </div>
                            <hr />
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Kilos Cosechados</span>
                              <span className="font-semibold">{selectedLog.kilograms.toLocaleString('es-ES')} kg</span>
                           </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Horas Trabajadas</span>
                              <span className="font-semibold">{selectedLog.hours.toLocaleString('es-ES')} hs</span>
                           </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Tarifa por Kg</span>
                              <span className="font-semibold">${selectedLog.ratePerKg.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
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
                    {canManage && (
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
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de producción y el pago asociado, y reajustará las estadísticas del recolector.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Continuar y Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button variant="outline" onClick={handleGenerateReceipt} disabled={isPdfPending || !canManage}>
                        <FileDown className="h-4 w-4 mr-2" />
                        {isPdfPending ? "Generando..." : "Generar Recibo"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsLabelOpen(true)} disabled={!canManage}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Generar Etiqueta
                    </Button>
                  </div>
                  <Button onClick={() => setSelectedLog(null)} variant="secondary">Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Label/QR Dialog */}
      <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
        <DialogContent className="max-w-md">
            {selectedLog && (
                <>
                    <DialogHeader>
                        <DialogTitle>Etiqueta de Trazabilidad</DialogTitle>
                        <DialogDescription>
                            Imprima esta etiqueta y péguela en el cajón o pallet correspondiente.
                        </DialogDescription>
                    </DialogHeader>
                    <div ref={labelRef} className="bg-white text-black p-4 rounded-lg">
                        <div className="flex gap-4 items-center border-b pb-2 mb-2">
                            <Image src="/logo.png" alt="AgroVision Logo" width={48} height={48} />
                            <div className="text-left">
                                <h3 className="font-bold text-lg">{establishmentData?.producer}</h3>
                                <p className="text-xs">{establishmentData?.location.locality}, {establishmentData?.location.province}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-full space-y-2">
                                <p className="text-xs">Lote: <span className="font-bold">{getHarvestForLog(selectedLog)?.batchNumber}</span></p>
                                <p className="text-xs">Cosecha: <span className="font-bold">{new Date(selectedLog.date).toLocaleDateString('es-AR')}</span></p>
                                <p className="text-xs">ID Trazabilidad:</p>
                                <p className="font-mono text-xs break-all">{selectedLog.traceabilityId}</p>
                            </div>
                             <div className="w-32 h-32 p-1 bg-white border flex items-center justify-center">
                                <QRCode 
                                    value={`${window.location.origin}/trace/${selectedLog.traceabilityId}`} 
                                    size={120} 
                                    viewBox={`0 0 120 120`}
                                />
                            </div>
                        </div>
                         <p className="text-center text-[8px] mt-2">Escanee el QR para ver el origen y la historia de este producto.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsLabelOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePrintLabel}>Imprimir Etiqueta</Button>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ProductionPaymentHistory = React.memo(ProductionPaymentHistoryComponent);
