'use client';

import React, { useContext, useMemo, useTransition, useState, useRef, useEffect } from 'react';
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
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const [labelScale, setLabelScale] = useState(1);
  const { editHarvest } = useContext(AppDataContext);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window !== 'undefined') {
        const screenWidth = window.innerWidth;
        if (screenWidth < 550) {
          // Adjust for dialog padding/margins on small screens (approx 32-40px total)
          const availableWidth = screenWidth - 40;
          setLabelScale(Math.min(1, availableWidth / 500));
        } else {
          setLabelScale(1);
        }
      }
    };
    
    updateScale();
    // Re-check after dialog animation finishes
    const timeout = setTimeout(updateScale, 300);
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateScale);
    };
  }, [isLabelOpen]);

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
          doc.addImage(logoBase64, 'PNG', 15, 12, 18, 18);
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
        // Usar un gris oscuro/medio para el título en lugar de negro puro
        doc.setTextColor(100); 
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

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        doc.save(`Recibo_Pago_${selectedLog.collectorName.replace(/\s+/g, '_')}.pdf`);
        toast({ title: '¡Recibo Generado!', description: 'El archivo PDF se ha descargado.' });

      } catch (error) {
        console.error("PDF error:", error);
        toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
      }
    });
  }

  const handlePrintLabel = async (action: 'download' | 'share' = 'download') => {
    if (!labelRef.current) return;
    toast({ title: action === 'share' ? 'Preparando...' : 'Generando Etiqueta', description: 'Por favor espere...' });
    
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(labelRef.current, { 
            scale: 3,
            onclone: (doc) => {
                const el = doc.getElementById('traceability-label');
                if (el) {
                    el.style.transform = 'none';
                }
            }
        });
        const dataUrl = canvas.toDataURL('image/png');
        
        if (action === 'share') {
            try {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const file = new File([blob], `etiqueta_${selectedLog?.collectorName || 'trazabilidad'}.png`, { type: 'image/png' });
                
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Etiqueta de Trazabilidad',
                    });
                    toast({ title: 'Éxito', description: 'Etiqueta compartida correctamente.' });
                } else {
                    toast({ title: 'Aviso', description: 'Tu dispositivo no soporta compartir directamente, se descargará en su lugar.' });
                    action = 'download'; // Fallback to download
                }
            } catch (e) {
                console.error("Share failed", e);
                // If user cancels share, it throws an AbortError, we shouldn't necessarily download.
                return;
            }
        }

        if (action === 'download') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            if (isIOS) {
                // iOS heavily restricts programmatic downloads via a-tags for data URIs.
                // The most reliable fallback is to open it in a new tab or prompt the user.
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                            <head><title>Etiqueta AgroVista</title></head>
                            <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background-color:#f3f4f6;font-family:sans-serif;">
                                <p style="padding:20px;text-align:center;color:#4b5563;">Mantén presionada la imagen para guardarla en Fotos.</p>
                                <img src="${dataUrl}" style="max-width:90%;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                            </body>
                        </html>
                    `);
                    toast({ title: 'Éxito', description: 'Mantén presionada la imagen en la nueva pestaña para guardarla.' });
                } else {
                     toast({ title: 'Aviso', description: 'Tu navegador bloqueó la ventana emergente. Intenta usar el botón Compartir y selecciona "Guardar Imagen".' });
                }
            } else {
                const link = document.createElement('a');
                link.download = `etiqueta_${selectedLog?.collectorName || 'trazabilidad'}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast({ title: 'Éxito', description: 'Etiqueta descargada correctamente.' });
            }
        }
    } catch (e) {
        console.error("Label generation failed", e);
        toast({ title: 'Error', description: 'No se pudo generar la etiqueta.', variant: 'destructive' });
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', opacity: 0, zIndex: -100 }} aria-hidden="true">
        <div ref={logoRef} style={{ width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} />
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
        <DialogContent className="max-w-[100vw] sm:max-w-[550px] p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle>Etiqueta de Trazabilidad</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div ref={labelContainerRef} className="w-full relative overflow-hidden transition-all duration-200" style={{ height: `${340 * labelScale}px` }}>
                <div className="absolute top-0 left-1/2 -ml-[250px]" style={{ transform: `scale(${labelScale})`, transformOrigin: 'top center', width: '500px', height: '340px' }}>
                  <div 
                    ref={labelRef} 
                    id="traceability-label"
                    className="relative overflow-hidden px-6 pt-4 pb-6 rounded-md border-2 border-stone-300 shadow-md flex shrink-0 bg-[#F7F4EB]"
                  style={{ 
                    width: '500px',
                    minWidth: '500px',
                    height: '340px',
                    minHeight: '340px',
                    color: '#333333',
                  }}
                >
                {/* Botanical Background Watermark - standard img tag for html2canvas iOS compatibility */}
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
                            <p className="text-[11px] text-gray-600 tracking-[0.2em] uppercase mt-1">{establishmentData?.location.locality}</p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-lg text-stone-600 font-serif" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Establecimiento:</p>
                        <h3 className="text-4xl text-[#a67c00] drop-shadow-sm font-bold leading-none mt-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{establishmentData?.producer}</h3>
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
                    <p className="text-sm text-stone-800">Lote: <b className="text-black text-base">{getHarvestForLog(selectedLog)?.batchNumber}</b></p>
                    <p className="text-sm text-stone-800">Fecha: <b className="text-black text-base">{new Date(selectedLog.date).toLocaleDateString('es-ES')}</b></p>
                    <p className="text-[10px] text-stone-600 font-mono tracking-tight mt-1">{selectedLog.traceabilityId}</p>
                  </div>
                </div>

                {/* Right Column (QR) */}
                <div className="w-[180px] flex flex-col items-center justify-center z-10 pb-2">
                  <div className="p-2 border-2 border-[#a67c00] rounded-sm shadow-sm relative">
                    {/* Decorative gold corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#a67c00] -translate-x-1 -translate-y-1"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#a67c00] translate-x-1 -translate-y-1"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#a67c00] -translate-x-1 translate-y-1"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#a67c00] translate-x-1 translate-y-1"></div>
                    
                    <QRCode value={`${window.location.origin}/trace/${selectedLog.traceabilityId}`} size={130} bgColor="transparent" />
                  </div>
                </div>
              </div>
              </div>
              </div>
              <div className="flex gap-2 w-full">
                {typeof navigator !== 'undefined' && !!navigator.share && (
                  <Button onClick={() => handlePrintLabel('share')} variant="outline" className="flex-1 border-[#2d4a22] text-[#2d4a22] hover:bg-[#2d4a22] hover:text-white transition-colors">
                    Compartir Etiqueta
                  </Button>
                )}
                <Button onClick={() => handlePrintLabel('download')} className="flex-1 bg-[#2d4a22] hover:bg-[#1f3317] text-white">
                  Descargar (PNG)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ProductionPaymentHistory = React.memo(ProductionPaymentHistoryComponent);
