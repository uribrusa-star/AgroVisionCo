'use client';

import React, { useContext, useMemo, useTransition, useState, useRef } from 'react';
import Image from 'next/image';

import QRCode from "react-qr-code";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Info, Trash2, FileDown, QrCode, Edit2, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';
import type { CollectorPaymentLog } from '@/lib/types';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable: { finalY: number };
}

// Nueva función auxiliar para cargar el logo correctamente en cualquier dispositivo
const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function ProductionPaymentHistoryComponent() {
  const { loading, collectorPaymentLogs, deleteCollectorPaymentLog, harvests, currentUser, establishmentData } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<CollectorPaymentLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ kilograms: 0, hours: 0, ratePerKg: 0, batchNumber: '' });
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { editHarvest } = useContext(AppDataContext);

  if (!currentUser) return null;
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  const handleDelete = (logId: string) => {
    startTransition(async () => {
      await deleteCollectorPaymentLog(logId);
      toast({
        title: "Registro Eliminado",
        description: "El registro ha sido eliminado exitosamente.",
      });
      setSelectedLog(null);
    });
  }

  const handleEditSubmit = () => {
    if (!selectedLog) return;
    startTransition(async () => {
      await editHarvest(selectedLog.id, selectedLog.harvestId, editData);
      setIsEditing(false);
      setSelectedLog(null);
    });
  };

  const openEdit = () => {
      if (!selectedLog) return;
      const harvest = getHarvestForLog(selectedLog);
      setEditData({
          kilograms: selectedLog.kilograms,
          hours: selectedLog.hours,
          ratePerKg: selectedLog.ratePerKg,
          batchNumber: harvest?.batchNumber || ''
      });
      setIsEditing(true);
  };

  const sortedLogs = useMemo(() =>
    [...collectorPaymentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [collectorPaymentLogs]
  );

  const getHarvestForLog = (log: CollectorPaymentLog) => harvests.find(h => h.id === log.harvestId);

  const handleGenerateReceipt = () => {
    if (!selectedLog || !establishmentData) return;

    startPdfTransition(async () => {
      toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
      try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF() as jsPDFWithAutoTable;
        
        // MODIFICACIÓN: Carga del logo mediante Base64 para evitar errores en móviles
        try {
          const logoBase64 = await getBase64ImageFromUrl('/logo.png');
          doc.addImage(logoBase64, 'PNG', 15, 12, 15, 15);
        } catch (error) {
          console.error("Error al cargar el logo para el PDF:", error);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Establecimiento:', 40, 17);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(establishmentData.producer, 40, 24);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`${establishmentData.location.locality}, ${establishmentData.location.province}`, 40, 30);

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('RECIBO DE PAGO', 105, 50, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Fecha: ${new Date(selectedLog.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12);
        doc.text(`Por medio del presente, se deja constancia de que ${selectedLog.collectorName} ha recibido el pago por los servicios de cosecha detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

        const tableBody = [
          ['Lote Cosechado', getHarvestForLog(selectedLog)?.batchNumber || 'N/A'],
          ['Kilos Cosechados', `${selectedLog.kilograms.toLocaleString('es-AR')} kg`],
          ['Tarifa por Kg', `$${selectedLog.ratePerKg.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`],
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

        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.text('Firma del Recolector: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${selectedLog.collectorName}`, 15, finalY + 40);

        doc.save(`Recibo_Pago_${selectedLog.collectorName.replace(/\s+/g, '_')}.pdf`);
        toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado.' });

      } catch (error) {
        console.error("PDF error:", error);
        toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
      }
    });
  }

  const handlePrintLabel = async () => {
    if (!labelRef.current) return;
    toast({ title: 'Generando Etiqueta', description: 'Por favor espere...' });
    
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(labelRef.current, { scale: 3 });
        const dataUrl = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `etiqueta_${selectedLog?.collectorName || 'trazabilidad'}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: 'Éxito', description: 'Etiqueta descargada correctamente.' });
    } catch (error) {
        console.error("Error generating label:", error);
        toast({ title: 'Error', description: 'No se pudo generar la etiqueta.', variant: 'destructive' });
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', opacity: 0, zIndex: -100 }} aria-hidden="true">
        <div ref={logoRef} style={{ width: '96px', height: '96px' }}>
          <Image src="/logo.png" alt="Logo" width={96} height={96} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Historial de Producción y Pagos
          </CardTitle>
          <CardDescription>Haga clic en una fila para ver detalles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-auto pr-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : sortedLogs.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 bg-muted/20 rounded-xl border border-dashed">No hay registros.</div>
            ) : (
              <>
                {sortedLogs.slice(0, visibleCount).map(log => (
                  <div 
                    key={log.id} 
                    className="shrink-0 group flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer w-full min-w-0 overflow-hidden"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-center gap-3 min-w-0 w-full overflow-hidden">
                        <div className="shrink-0 flex items-center justify-center">
                            <Badge variant="secondary" className="w-10 h-10 p-0 flex items-center justify-center rounded-full shrink-0">
                                <Banknote className="h-5 w-5" />
                            </Badge>
                        </div>
                        <div className="min-w-0 flex flex-col justify-center flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-sm truncate leading-none">{log.collectorName}</span>
                                <span className="text-xs text-muted-foreground shrink-0 leading-none">{new Date(log.date).toLocaleDateString('es-AR')}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate leading-tight mt-1 w-full block">
                                Lote: <Badge variant="outline" className="text-[10px] px-1 py-0">{getHarvestForLog(log)?.batchNumber || "L???"}</Badge>
                                <span className="mx-1.5 opacity-50">•</span>
                                Pago total: <span className="font-bold text-foreground">${log.payment.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
                {sortedLogs.length > visibleCount && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2" 
                    onClick={() => setVisibleCount(prev => prev + 5)}
                  >
                    Mostrar más
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setSelectedLog(null);
              setIsEditing(false);
          }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl rounded-lg">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" /> Detalles del Registro
                </DialogTitle>
                <DialogDescription>Información detallada del pago.</DialogDescription>
              </DialogHeader>

              {isEditing ? (
                  <div className="grid gap-4 py-4 px-1 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Lote</Label>
                        <Input value={editData.batchNumber} onChange={e => setEditData({...editData, batchNumber: e.target.value})} disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label>Kilos</Label>
                        <Input type="number" step="0.1" value={editData.kilograms} onChange={e => setEditData({...editData, kilograms: parseFloat(e.target.value) || 0})} disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label>Horas Trabajadas</Label>
                        <Input type="number" step="0.5" value={editData.hours} onChange={e => setEditData({...editData, hours: parseFloat(e.target.value) || 0})} disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tarifa por Kg</Label>
                        <Input type="number" step="0.01" value={editData.ratePerKg} onChange={e => setEditData({...editData, ratePerKg: parseFloat(e.target.value) || 0})} disabled={isPending} />
                    </div>
                  </div>
              ) : (
                  <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto px-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(selectedLog.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </div>
                    <Card className="shadow-none border-muted">
                      <CardContent className="p-4 space-y-3 text-sm">
                        <div className="flex justify-between"><span>Lote</span><Badge variant="secondary">{getHarvestForLog(selectedLog)?.batchNumber || 'N/A'}</Badge></div>
                        <div className="flex justify-between"><span>Recolector</span><span className="font-semibold">{selectedLog.collectorName}</span></div>
                        <hr />
                        <div className="flex justify-between"><span>Kilos</span><span className="font-medium">{selectedLog.kilograms.toLocaleString()} kg</span></div>
                        <div className="flex justify-between"><span>Horas</span><span className="font-medium">{selectedLog.hours} hs</span></div>
                        <div className="flex justify-between"><span>Tarifa</span><span>${selectedLog.ratePerKg.toLocaleString()}</span></div>
                        <hr />
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-primary">Pago Total</span>
                          <span className="font-bold text-lg text-primary">${selectedLog.payment.toLocaleString('es-AR')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              )}

              {/* MODIFICACIÓN: Footer adaptativo para móviles */}
              <DialogFooter className="flex flex-col gap-3 w-full sm:flex-col pt-4">
                {isEditing ? (
                    <>
                        <Button onClick={handleEditSubmit} disabled={isPending} className="w-full order-1 shadow-sm">
                            {isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="secondary" className="w-full order-2 shadow-sm" disabled={isPending}>
                            Cancelar
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={() => setSelectedLog(null)} variant="secondary" className="w-full order-1 shadow-sm">
                        Cerrar
                        </Button>

                        {canManage && (
                            <div className="grid grid-cols-2 gap-2 w-full order-2">
                                <Button variant="outline" onClick={openEdit} className="w-full shadow-sm text-[11px] h-10 px-1 sm:text-sm">
                                    <Edit2 className="h-4 w-4 mr-1" /> Editar
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full shadow-sm text-[11px] h-10 px-1 sm:text-sm" disabled={isPending}>
                                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-[90vw] rounded-lg">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Volver</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(selectedLog.id)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 w-full order-3">
                        <Button 
                            variant="outline" 
                            onClick={handleGenerateReceipt} 
                            disabled={isPdfPending || !canManage}
                            className="w-full text-[11px] h-10 px-1 sm:text-sm"
                        >
                            <FileDown className="h-4 w-4 mr-1" />
                            {isPdfPending ? "..." : "Recibo"}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsLabelOpen(true)} 
                            disabled={!canManage}
                            className="w-full text-[11px] h-10 px-1 sm:text-sm"
                        >
                            <QrCode className="h-4 w-4 mr-1" />
                            Etiqueta
                        </Button>
                        </div>
                    </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta de Trazabilidad</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div ref={labelRef} className="bg-white text-black p-4 rounded-lg border">
                <div className="flex gap-3 items-center border-b pb-2 mb-2">
                  <img src="/logo.png" alt="Logo" width="40" height="40" style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }} />
                  <div className="text-left leading-tight">
                    <h3 className="font-bold text-sm">{establishmentData?.producer}</h3>
                    <p className="text-[10px] text-gray-500">{establishmentData?.location.locality}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1 text-[11px]">
                    <p>Lote: <b>{getHarvestForLog(selectedLog)?.batchNumber}</b></p>
                    <p>Fecha: <b>{new Date(selectedLog.date).toLocaleDateString()}</b></p>
                    <p className="text-[9px] text-gray-400 break-all font-mono">{selectedLog.traceabilityId}</p>
                  </div>
                  <div className="border p-1">
                    <QRCode value={`${window.location.origin}/trace/${selectedLog.traceabilityId}`} size={80} />
                  </div>
                </div>
              </div>
              <Button onClick={handlePrintLabel} className="w-full">Descargar Etiqueta (PNG)</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ProductionPaymentHistory = React.memo(ProductionPaymentHistoryComponent);
