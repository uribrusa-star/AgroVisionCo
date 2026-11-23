'use client';

import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, AlertCircle, Printer, Sparkles, CheckCircle2, User as UserIcon, FileDown, Loader2 } from 'lucide-react';
import type { Collector, Packer } from '@/lib/types';
import { saveOrSharePdf } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';

interface WorkerQRCardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  worker: (Collector | Packer) | null;
  type: 'collector' | 'packer';
  establishmentName?: string;
}

export function WorkerQRCardDialog({
  isOpen,
  onOpenChange,
  worker,
  type,
  establishmentName = 'AgroVista'
}: WorkerQRCardDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const qrCodeContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  if (!worker) return null;

  const isCollector = type === 'collector';
  const roleLabel = isCollector ? 'Recolector de Frutilla' : 'Embalador de Fruta';
  const totalKg = isCollector ? (worker as Collector).totalHarvested : (worker as Packer).totalPackaged;
  const rate = isCollector ? (worker as Collector).productivity : (worker as Packer).packagingRate;
  
  // Payload del QR estructurado para reconocimiento instantáneo
  const qrPayload = JSON.stringify({
    agroVistaWorker: true,
    type,
    id: worker.id,
    name: worker.name,
    dni: worker.dni || ''
  });

  const getQrSvgHtml = () => {
    const qrSvg = qrCodeContainerRef.current?.querySelector('svg') || document.getElementById('worker-qr-code-svg');
    return qrSvg?.outerHTML || '';
  };

  const getQrImageDataUrl = async (): Promise<string> => {
    const qrSvg = qrCodeContainerRef.current?.querySelector('svg') || document.getElementById('worker-qr-code-svg');
    if (!qrSvg) return '';

    return new Promise((resolve) => {
      try {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgDataBase64 = btoa(unescape(encodeURIComponent(svgData)));
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 0, 0, 400, 400);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        };
        img.onerror = () => resolve('');
        img.src = `data:image/svg+xml;base64,${svgDataBase64}`;
      } catch {
        resolve('');
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    toast({ title: 'Generando Credencial', description: 'Preparando carnet oficial en 1 sola hoja...' });

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const cardWidth = 90;
      const cardHeight = 135;
      const x = (pageWidth - cardWidth) / 2; // Centrado exacto: 60mm
      const y = 35; // Posición superior equilibrada

      // 1. Recuadro exterior con línea punteada para recortar
      doc.setDrawColor(5, 150, 105);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');
      doc.setLineDashPattern([], 0);

      // 2. Encabezado de la credencial (barra verde superior)
      doc.setFillColor(6, 78, 59);
      doc.roundedRect(x, y, cardWidth, 14, 3, 3, 'F');
      doc.rect(x, y + 10, cardWidth, 4, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AGROVISTA', x + 5, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(establishmentName.substring(0, 24), x + cardWidth - 5, y + 8, { align: 'right' });

      // 3. Sub-barra con rol del trabajador
      doc.setFillColor(240, 253, 244);
      doc.rect(x, y + 14, cardWidth, 7, 'F');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(roleLabel.toUpperCase(), x + cardWidth / 2, y + 18.5, { align: 'center' });

      // 4. Nombre y DNI
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      const displayName = worker.name.length > 22 ? worker.name.substring(0, 21) + '...' : worker.name;
      doc.text(displayName, x + cardWidth / 2, y + 27, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(worker.dni ? `DNI: ${worker.dni}` : 'Legajo Digital', x + cardWidth / 2, y + 32, { align: 'center' });

      // 5. Código QR (obtenido directamente del elemento SVG montado)
      const qrDataUrl = await getQrImageDataUrl();
      const qrSize = 48;
      const qrX = x + (cardWidth - qrSize) / 2;
      const qrY = y + 36;
      if (qrDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'S');
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // 6. Pie y datos de emergencia
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Escanear en balanza para registrar cosecha al instante', x + cardWidth / 2, y + 90, { align: 'center' });

      if (worker.phone) {
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(`Tel: ${worker.phone}`, x + cardWidth / 2, y + 95.5, { align: 'center' });
      }

      if (worker.emergencyContactPhone) {
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(`Emergencia: ${worker.emergencyContactName || 'Familiar'} (${worker.emergencyContactPhone})`, x + cardWidth / 2, y + 101, { align: 'center' });
      }

      // 7. Barra de estadísticas de rendimiento
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x + 4, y + 107, cardWidth - 8, 16, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x + 4, y + 107, cardWidth - 8, 16, 2, 2, 'S');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL', x + 18, y + 112, { align: 'center' });
      doc.text('HORAS', x + cardWidth / 2, y + 112, { align: 'center' });
      doc.text('RENDIMIENTO', x + cardWidth - 18, y + 112, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${(totalKg || 0).toLocaleString('es-AR')} kg`, x + 18, y + 118, { align: 'center' });
      doc.text(`${worker.hoursWorked || 0} hs`, x + cardWidth / 2, y + 118, { align: 'center' });
      doc.setTextColor(5, 150, 105);
      doc.text(`${Number((rate || 0).toFixed(1))} kg/h`, x + cardWidth - 18, y + 118, { align: 'center' });

      // Línea de corte
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('✄ Recorte por la línea punteada para plastificar el carnet', pageWidth / 2, y + cardHeight + 8, { align: 'center' });

      const fileName = `Credencial_${worker.name.replace(/\s+/g, '_')}.pdf`;
      await saveOrSharePdf(doc, fileName, `Credencial de ${worker.name}`);
      toast({ title: '¡Credencial Lista!', description: 'El archivo PDF de 1 página ha sido generado correctamente.' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'Error', description: 'No se pudo generar el carnet PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credencial - ${worker.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .print-page {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              margin: 0 auto;
              padding: 25mm 15mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
              overflow: hidden;
            }
            .badge-card {
              width: 85mm;
              height: 125mm;
              max-height: 125mm;
              border: 2px dashed #059669;
              border-radius: 12px;
              padding: 12px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              background: #fafaf9;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .header { border-bottom: 2px solid #059669; padding-bottom: 6px; }
            .header h2 { margin: 0; color: #065f46; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { margin: 2px 0 0; color: #64748b; font-size: 10px; }
            .role-badge { display: inline-block; background: #059669; color: white; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; margin: 6px 0; }
            .name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; }
            .dni { font-size: 11px; color: #475569; margin-bottom: 6px; }
            .qr-container { background: white; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; margin: 0 auto; }
            .qr-container svg { width: 42mm; height: 42mm; display: block; margin: 0 auto; }
            .footer-info { font-size: 8.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 5px; }
            .emergency { font-size: 8px; color: #b91c1c; font-weight: 600; margin-top: 2px; }
            .cut-hint { font-size: 8px; color: #94a3b8; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="badge-card">
              <div class="header">
                <h2>AGROVISTA</h2>
                <p>${establishmentName} &bull; Cuadrilla Oficial</p>
                <div class="role-badge">${roleLabel}</div>
              </div>

              <div>
                <div class="name">${worker.name}</div>
                <div class="dni">${worker.dni ? `DNI: ${worker.dni}` : 'Legajo Digital'}</div>
                <div class="qr-container">
                  ${getQrSvgHtml()}
                </div>
              </div>

              <div class="footer-info">
                <div>Escanee este código en la balanza para registrar cosecha al instante.</div>
                ${worker.emergencyContactPhone ? `<div class="emergency">Emergencias: ${worker.emergencyContactName || 'Familiar'} (${worker.emergencyContactPhone})</div>` : ''}
              </div>
            </div>
            <div class="cut-hint">✄ Recorte por la línea punteada para plastificar</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const cleanPhone = worker.phone?.replace(/[^0-9]/g, '');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden border-emerald-500/30 rounded-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="p-3.5 sm:p-4 pb-2.5 sm:pb-3 pr-12 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-emerald-300 shrink-0" />
              <DialogTitle className="text-white text-sm sm:text-base font-bold truncate">
                Credencial Digital del Empleado
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-white border-white/40 text-xs font-normal shrink-0">
              {establishmentName}
            </Badge>
          </div>
          <DialogDescription className="text-emerald-100/80 text-[11px] sm:text-xs mt-0.5">
            Identificación oficial para registro automático de pesadas mediante código QR.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3">
          {/* Tarjeta Visual de Credencial (Diseño equilibrado: horizontal en PC, apilado en móvil) */}
          <div 
            ref={cardRef}
            className="p-3.5 sm:p-5 rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

            {/* Cabecera interna de la Credencial */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
                  AgroVista Oficial
                </span>
                <p className="text-xs font-semibold text-foreground truncate max-w-[170px] sm:max-w-xs">
                  {establishmentName}
                </p>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold">
                {roleLabel}
              </Badge>
            </div>

            {/* Grid responsivo: 2 columnas en PC/Tablet para evitar que se vea alargada */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-5 items-center">
              
              {/* Columna Izquierda: Perfil, Contacto y Estadísticas */}
              <div className="sm:col-span-7 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-emerald-500 shadow-sm shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.avatar || worker.name}`} />
                    <AvatarFallback><UserIcon className="h-7 w-7 text-emerald-600" /></AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate max-w-[190px] sm:max-w-[240px]">
                      {worker.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {worker.dni && (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                          DNI: {worker.dni}
                        </span>
                      )}
                      {worker.status && (
                        <Badge variant={worker.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-5">
                          {worker.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Datos de contacto y emergencia */}
                {(worker.phone || worker.emergencyContactPhone) && (
                  <div className="w-full text-left text-xs space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                    {worker.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <a 
                          href={`https://wa.me/${cleanPhone}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" /> {worker.phone}
                        </a>
                      </div>
                    )}
                    {worker.emergencyContactPhone && (
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <AlertCircle className="h-3 w-3 shrink-0" /> Emergencia:
                        </span>
                        <span className="font-semibold text-[11px] truncate max-w-[160px]">
                          {worker.emergencyContactName || 'Familiar'}: {worker.emergencyContactPhone}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Estadísticas de campo compactas */}
                <div className="grid grid-cols-3 gap-1.5 w-full text-center text-xs">
                  <div className="bg-muted/40 p-1.5 rounded-lg border border-border/40">
                    <div className="text-[9px] text-muted-foreground font-medium uppercase">Total</div>
                    <div className="font-bold text-foreground text-xs sm:text-sm">{(totalKg || 0).toLocaleString('es-AR')} kg</div>
                  </div>
                  <div className="bg-muted/40 p-1.5 rounded-lg border border-border/40">
                    <div className="text-[9px] text-muted-foreground font-medium uppercase">Horas</div>
                    <div className="font-bold text-foreground text-xs sm:text-sm">{worker.hoursWorked || 0} hs</div>
                  </div>
                  <div className="bg-muted/40 p-1.5 rounded-lg border border-border/40">
                    <div className="text-[9px] text-muted-foreground font-medium uppercase">Rendimiento</div>
                    <div className="font-bold text-emerald-600 text-xs sm:text-sm">{Number((rate || 0).toFixed(1))} kg/h</div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Código QR Central */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-white/70 dark:bg-stone-900/50 border border-border/50 text-center">
                <div ref={qrCodeContainerRef} className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs inline-block mx-auto mb-1.5">
                  <QRCode
                    id="worker-qr-code-svg"
                    value={qrPayload}
                    size={130}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[170px]">
                  Apunte la cámara en la balanza para registrar cosecha al instante.
                </p>
              </div>

            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <Button 
              type="button" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs h-9 sm:h-10 text-xs sm:text-sm font-semibold"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generando Carnet...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> Descargar Carnet (PDF)
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handlePrint}
              className="w-full sm:w-auto gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-9 sm:h-10 text-xs sm:text-sm"
              title="Imprimir directamente"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            {cleanPhone && (
              <Button 
                type="button" 
                variant="outline"
                className="w-full sm:w-auto gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-9 sm:h-10 text-xs sm:text-sm"
                onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}
              >
                <Phone className="h-4 w-4" /> WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
