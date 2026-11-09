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
      <DialogContent className="max-w-md p-0 overflow-hidden border-emerald-500/30">
        <DialogHeader className="p-4 pb-2 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <DialogTitle className="text-white text-base">Credencial Digital del Empleado</DialogTitle>
            </div>
            <Badge variant="outline" className="text-white border-white/30 text-xs font-normal">
              {establishmentName}
            </Badge>
          </div>
          <DialogDescription className="text-emerald-100/80 text-xs">
            Esta credencial permite identificar al trabajador y escanear sus cargas de cosecha al instante.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Tarjeta Visual de Credencial */}
          <div 
            ref={cardRef}
            className="p-4 rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900 dark:to-emerald-950/20 shadow-sm text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

            <div className="flex items-center justify-between pb-2 border-b border-border/50 text-left">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
                  AgroVista Oficial
                </span>
                <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                  {establishmentName}
                </p>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
                {roleLabel}
              </Badge>
            </div>

            <div className="my-4 flex flex-col items-center">
              <Avatar className="h-16 w-16 border-2 border-emerald-500 shadow-sm mb-2">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.avatar || worker.name}`} />
                <AvatarFallback><UserIcon className="h-8 w-8 text-emerald-600" /></AvatarFallback>
              </Avatar>

              <h3 className="text-lg font-bold text-foreground leading-tight">
                {worker.name}
              </h3>
              
              <div className="flex items-center gap-2 mt-1">
                {worker.dni && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md">
                    DNI: {worker.dni}
                  </span>
                )}
                {worker.status && (
                  <Badge variant={worker.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {worker.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Código QR Central */}
            <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs inline-block mx-auto mb-2">
              <QRCode
                value={qrPayload}
                size={140}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              Apunte la cámara en la pantalla de cosecha para asignar la pesada automáticamente.
            </p>

            {/* Datos de contacto y emergencia */}
            {(worker.phone || worker.emergencyContactPhone) && (
              <div className="mt-3 pt-3 border-t border-border/60 text-left text-xs space-y-1 bg-muted/30 p-2.5 rounded-lg">
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
                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Emergencia:</span>
                    <span className="font-semibold">{worker.emergencyContactName || 'Familiar'}: {worker.emergencyContactPhone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Estadísticas de campo */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-border/60 text-center text-xs">
              <div className="bg-muted/40 p-1.5 rounded-md">
                <div className="text-[10px] text-muted-foreground">Total Cosechado</div>
                <div className="font-bold text-foreground">{(totalKg || 0).toLocaleString('es-AR')} kg</div>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-md">
                <div className="text-[10px] text-muted-foreground">Horas</div>
                <div className="font-bold text-foreground">{worker.hoursWorked || 0} hs</div>
              </div>
              <div className="bg-muted/40 p-1.5 rounded-md">
                <div className="text-[10px] text-muted-foreground">Rendimiento</div>
                <div className="font-bold text-emerald-600">{Number((rate || 0).toFixed(1))} kg/h</div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2 pt-1">
            <Button 
              type="button" 
              onClick={handlePrint}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
            >
              <Printer className="h-4 w-4" /> Imprimir Carnet
            </Button>
            {cleanPhone && (
              <Button 
                type="button" 
                variant="outline"
                className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
