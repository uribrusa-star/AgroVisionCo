'use client';

import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, AlertCircle, Printer, Download, Sparkles, CheckCircle2, User as UserIcon } from 'lucide-react';
import type { Collector, Packer } from '@/lib/types';

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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credencial - ${worker.name}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
            .badge-card {
              width: 85mm;
              height: 120mm;
              border: 2px dashed #059669;
              border-radius: 12px;
              padding: 12px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              background: #fafaf9;
            }
            .header { border-bottom: 2px solid #059669; padding-bottom: 6px; }
            .header h2 { margin: 0; color: #065f46; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { margin: 2px 0 0; color: #64748b; font-size: 10px; }
            .role-badge { display: inline-block; background: #059669; color: white; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; margin: 6px 0; }
            .name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; }
            .dni { font-size: 11px; color: #475569; margin-bottom: 8px; }
            .qr-container { background: white; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; margin: 0 auto; }
            .qr-container svg { width: 45mm; height: 45mm; }
            .footer-info { font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
            .emergency { font-size: 8.5px; color: #b91c1c; font-weight: 600; margin-top: 2px; }
          </style>
        </head>
        <body>
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
                ${cardRef.current?.querySelector('svg')?.outerHTML || ''}
              </div>
            </div>

            <div class="footer-info">
              <div>Escanee este código en la balanza para registrar cosecha al instante.</div>
              ${worker.emergencyContactPhone ? `<div class="emergency">Emergencias: ${worker.emergencyContactName || 'Familiar'} (${worker.emergencyContactPhone})</div>` : ''}
            </div>
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
                <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-xs inline-block mx-auto mb-1.5">
                  <QRCode
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
          <div className="flex items-center gap-2 pt-1">
            <Button 
              type="button" 
              onClick={handlePrint}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs h-9 sm:h-10 text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4" /> Imprimir Carnet
            </Button>
            {cleanPhone && (
              <Button 
                type="button" 
                variant="outline"
                className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-9 sm:h-10 text-xs sm:text-sm"
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
