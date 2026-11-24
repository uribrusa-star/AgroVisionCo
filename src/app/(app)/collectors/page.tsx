'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MoreHorizontal, 
  Search, 
  QrCode, 
  Phone, 
  Printer, 
  Plus, 
  Pencil, 
  AlertCircle, 
  FileSpreadsheet, 
  UserCheck,
  Calendar,
  Info,
  FileDown,
  ChevronRight,
  Loader2
} from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Collector } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { WorkerQRCardDialog } from '@/components/worker-qr-card-dialog';
import { generateCrewBadgesPDF } from '@/lib/export-crew-badges-pdf';
import { saveOrSharePdf } from '@/lib/pdf-generator';

const CollectorSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  dni: z.string().optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CollectorFormValues = z.infer<typeof CollectorSchema>;

export default function CollectorsPage() {
  const { 
    loading, 
    collectors, 
    harvests, 
    collectorPaymentLogs, 
    addCollector, 
    editCollector, 
    deleteCollector, 
    currentUser, 
    establishmentData 
  } = React.useContext(AppDataContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<Collector | null>(null);
  const [editingCollector, setEditingCollector] = useState<Collector | null>(null);
  const [qrModalCollector, setQrModalCollector] = useState<Collector | null>(null);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrintingBadges, setIsPrintingBadges] = useState(false);
  
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<{
    id: string;
    date: string;
    batchNumber: string;
    kilograms: number;
    hours: number;
    ratePerKg: number;
    ratePerHour?: number;
    paymentType: 'kilo' | 'hour';
    payment: number;
    traceabilityId: string;
    collectorName: string;
  } | null>(null);
  const [isPdfPending, startPdfTransition] = useTransition();
  const isGeneratingRef = React.useRef(false);
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const addForm = useForm<CollectorFormValues>({
    resolver: zodResolver(CollectorSchema),
    defaultValues: { 
      name: '', 
      dni: '', 
      phone: '', 
      emergencyContactName: '', 
      emergencyContactPhone: '', 
      address: '', 
      notes: '' 
    },
  });

  const editForm = useForm<CollectorFormValues>({
    resolver: zodResolver(CollectorSchema),
    defaultValues: { 
      name: '', 
      dni: '', 
      phone: '', 
      emergencyContactName: '', 
      emergencyContactPhone: '', 
      address: '', 
      notes: '' 
    },
  });

  useEffect(() => {
    if (isAddDialogOpen) {
      addForm.reset({ 
        name: '', 
        dni: '', 
        phone: '', 
        emergencyContactName: '', 
        emergencyContactPhone: '', 
        address: '', 
        notes: '' 
      });
    }
  }, [isAddDialogOpen, addForm]);

  useEffect(() => {
    if (editingCollector && isEditDialogOpen) {
      editForm.reset({
        name: editingCollector.name,
        dni: editingCollector.dni || '',
        phone: editingCollector.phone || '',
        emergencyContactName: editingCollector.emergencyContactName || '',
        emergencyContactPhone: editingCollector.emergencyContactPhone || '',
        address: editingCollector.address || '',
        notes: editingCollector.notes || ''
      });
    }
  }, [editingCollector, isEditDialogOpen, editForm]);

  const establishmentName = establishmentData?.producer || establishmentData?.name || 'Don José';

  // Filtrado reactivo por nombre o DNI (vital para 60+ empleados)
  const filteredCollectors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return collectors;
    return collectors.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.dni && c.dni.includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [collectors, searchQuery]);

  const getCollectorRecords = (collectorId: string) => {
    const collHarvests = harvests.filter(h => h.collector.id === collectorId);
    const collLogs = (collectorPaymentLogs || []).filter(l => l.collectorId === collectorId);

    const records = collHarvests.map(h => {
      const matchingLog = collLogs.find(l => l.harvestId === h.id || l.id === h.id);
      const paymentType: 'kilo' | 'hour' = matchingLog?.paymentType || 'kilo';
      const hours = matchingLog?.hours || 0;
      const ratePerKg = matchingLog?.ratePerKg || 0;
      const ratePerHour = matchingLog?.ratePerHour || 0;
      const payment = matchingLog?.payment ?? (paymentType === 'hour' ? hours * ratePerHour : h.kilograms * ratePerKg);

      return {
        id: h.id,
        date: h.date,
        batchNumber: h.batchNumber || 'Lote',
        kilograms: h.kilograms,
        hours: hours,
        ratePerKg: ratePerKg,
        ratePerHour: ratePerHour,
        paymentType: paymentType,
        payment: payment,
        traceabilityId: h.traceabilityId || matchingLog?.traceabilityId || '',
        collectorName: h.collector?.name || selectedCollector?.name || 'Recolector'
      };
    });

    collLogs.forEach(l => {
      if (!records.some(r => r.id === l.harvestId || r.id === l.id)) {
        records.push({
          id: l.id,
          date: l.date,
          batchNumber: 'Lote',
          kilograms: l.kilograms,
          hours: l.hours,
          ratePerKg: l.ratePerKg,
          ratePerHour: l.ratePerHour || 0,
          paymentType: (l.paymentType as 'kilo' | 'hour') || 'kilo',
          payment: l.payment,
          traceabilityId: l.traceabilityId || '',
          collectorName: l.collectorName || selectedCollector?.name || 'Recolector'
        });
      }
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleGenerateReceiptForCollectorRecord = (record: {
    collectorName: string;
    date: string;
    batchNumber: string;
    paymentType: 'kilo' | 'hour';
    hours: number;
    ratePerHour?: number;
    ratePerKg: number;
    kilograms: number;
    payment: number;
  }) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setTimeout(() => { isGeneratingRef.current = false; }, 3000);
    if (!record || !establishmentData) return;

    startPdfTransition(async () => {
      toast({ title: 'Generando Recibo', description: 'Por favor espere...' });
      try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF() as any;

        try {
          const res = await fetch('/logo.png');
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(base64, 'PNG', 15, 12, 18, 18);
        } catch (error) {
          console.error("Error al cargar logo:", error);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Establecimiento:', 40, 17);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(establishmentData.producer || establishmentData.name || 'Don José', 40, 24);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`${establishmentData.location?.locality || ''}, ${establishmentData.location?.province || ''}`, 40, 30);

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100); 
        doc.text('RECIBO DE PAGO', 105, 50, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Fecha: ${new Date(record.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12);
        doc.text(`Por medio del presente, se deja constancia de que ${record.collectorName} ha recibido el pago por los servicios de cosecha detallados a continuación:`, 15, bodyY, { maxWidth: 180 });

        const isHourPayment = record.paymentType === 'hour';
        const tableBody = isHourPayment ? [
          ['Lote Cosechado', record.batchNumber || 'N/A'],
          ['Modalidad de Pago', 'Por Hora Trabajada'],
          ['Horas Trabajadas', `${record.hours} hs`],
          ['Tarifa por Hora', `$${(record.ratePerHour || record.ratePerKg).toLocaleString('es-AR', { minimumFractionDigits: 2 })}/h`],
          ['Kilos Cosechados (Referencia)', `${record.kilograms.toLocaleString('es-AR')} kg`],
          ['Total Pagado', `$${record.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
        ] : [
          ['Lote Cosechado', record.batchNumber || 'N/A'],
          ['Modalidad de Pago', 'Por Kilo Cosechado'],
          ['Kilos Cosechados', `${record.kilograms.toLocaleString('es-AR')} kg`],
          ['Tarifa por Kg', `$${record.ratePerKg.toLocaleString('es-AR', { minimumFractionDigits: 2 })}/kg`],
          ['Horas Trabajadas (Referencia)', `${record.hours} hs`],
          ['Total Pagado', `$${record.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
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
        doc.text('Firma del Recolector: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${record.collectorName}`, 15, finalY + 40);

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        const fileName = `Recibo_Pago_${record.collectorName.replace(/\s+/g, '_')}_${new Date(record.date).toISOString().slice(0, 10)}.pdf`;
        await saveOrSharePdf(doc, fileName, 'Recibo de Pago');
        toast({ title: '¡Recibo Listo!', description: 'El comprobante ha sido generado correctamente.' });
      } catch (error) {
        console.error("Error al generar recibo PDF:", error);
        toast({ title: "Error", description: "No se pudo generar el comprobante PDF.", variant: "destructive" });
      }
    });
  };
  
  const handleDelete = (collectorId: string) => {
     startTransition(async () => {
        deleteCollector(collectorId);
        toast({ title: "Recolector Eliminado", description: "El recolector y sus datos asociados han sido eliminados." });
    });
  };
  
  const onAddSubmit = (values: CollectorFormValues) => {
    const newName = values.name.trim();
    if (collectors.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
      addForm.setError('name', { type: 'manual', message: 'Ya existe un recolector con este nombre.' });
      return;
    }
    
    startTransition(async () => {
        addCollector({
          name: newName,
          dni: values.dni?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          emergencyContactName: values.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          status: 'active',
          avatar: `${Math.floor(Math.random() * 1000)}`,
          totalHarvested: 0,
          hoursWorked: 0,
          productivity: 0,
          joinDate: new Date().toISOString(),
        });
        toast({ title: "Recolector Agregado", description: `Se ha agregado a ${newName} con su credencial QR lista.` });
        setIsAddDialogOpen(false);
        addForm.reset();
    });
  };

  const onEditSubmit = async (values: CollectorFormValues) => {
    if (!editingCollector) return;

    startTransition(async () => {
      try {
        await editCollector({
          ...editingCollector,
          name: values.name.trim(),
          dni: values.dni?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          emergencyContactName: values.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
        });
        toast({ title: "Recolector Actualizado", description: `Los datos de ${values.name} se guardaron correctamente.` });
        setIsEditDialogOpen(false);
        setEditingCollector(null);
      } catch (e) {
        toast({ title: "Error", description: "No se pudieron actualizar los datos del recolector.", variant: "destructive" });
      }
    });
  };

  const handlePrintAllBadges = async () => {
    try {
      setIsPrintingBadges(true);
      await generateCrewBadgesPDF({
        workers: collectors,
        type: 'collector',
        establishmentName
      });
      toast({
        title: "Credenciales Generadas",
        description: `Se descargó el archivo con los carnets de ${collectors.length} recolectores listos para imprimir.`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Ocurrió un problema al generar las credenciales.", variant: "destructive" });
    } finally {
      setIsPrintingBadges(false);
    }
  };

  if (!currentUser) return null;
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  return (
    <>
      <PageHeader
        title="Gestión de Recolectores"
        description="Gestione cuadrillas, credenciales QR y productividad de sus cosecheros."
      >
        <div className="flex items-center gap-2 flex-wrap">
          {collectors.length > 0 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrintAllBadges}
              disabled={isPrintingBadges}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
            >
              <Printer className="h-4 w-4" />
              {isPrintingBadges ? "Generando Carnets..." : "Imprimir Credenciales QR"}
            </Button>
          )}

          {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                      <Plus className="h-4 w-4" /> Agregar Recolector
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Recolector</DialogTitle>
                        <DialogDescription>
                            Complete los datos del trabajador. Se generará su código QR automáticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-3.5">
                            <FormField
                                control={addForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Nombre y Apellido *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej. Juan Pérez" disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                  control={addForm.control}
                                  name="dni"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel className="text-xs font-semibold">DNI / Documento</FormLabel>
                                          <FormControl>
                                              <Input {...field} placeholder="Ej. 38123456" disabled={isPending} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={addForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel className="text-xs font-semibold">Teléfono / WhatsApp</FormLabel>
                                          <FormControl>
                                              <Input {...field} placeholder="Ej. 3424123456" disabled={isPending} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>

                            <div className="p-3 border rounded-lg bg-muted/20 space-y-2.5">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase">Contacto de Emergencia</span>
                              <div className="grid grid-cols-2 gap-2.5">
                                <FormField
                                    control={addForm.control}
                                    name="emergencyContactName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input {...field} placeholder="Nombre Familiar" disabled={isPending} className="text-xs" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addForm.control}
                                    name="emergencyContactPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input {...field} placeholder="Tel. Emergencia" disabled={isPending} className="text-xs" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                              </div>
                            </div>

                            <FormField
                                control={addForm.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold">Observaciones / Cuadrilla</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej. Cuadrilla Norte, experto en cosecha" disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                  {isPending ? 'Guardando...' : 'Guardar y Generar QR'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>
      
      <div className="w-full max-w-7xl mx-auto space-y-4">
        {/* Barra de búsqueda y conteo rápido */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card shadow-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
            Mostrando {filteredCollectors.length} de {collectors.length} recolectores
          </div>
        </div>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Cuadrilla de Recolectores</CardTitle>
            <CardDescription>
              Seleccione una tarjeta para ver historial de cosechas o haga clic en el icono QR para ver y escanear su credencial.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`mob-skel-${i}`} className="h-32 w-full rounded-xl" />
              ))}
              
              {!loading && filteredCollectors.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                  No se encontraron recolectores que coincidan con la búsqueda.
                </div>
              )}

              {!loading && filteredCollectors.map((collector) => {
                  const collectorHarvests = harvests.filter(h => h.collector.id === collector.id);
                  const collectorLogs = (collectorPaymentLogs || []).filter(l => l.collectorId === collector.id);
                  
                  const calculatedTotalHarvested = collectorHarvests.length > 0
                    ? collectorHarvests.reduce((sum, h) => sum + h.kilograms, 0)
                    : collector.totalHarvested;
                    
                  const calculatedHoursWorked = collectorLogs.length > 0
                    ? collectorLogs.reduce((sum, l) => sum + l.hours, 0)
                    : collector.hoursWorked;
                    
                  const calculatedProductivity = calculatedHoursWorked > 0
                    ? calculatedTotalHarvested / calculatedHoursWorked
                    : (collector.productivity || 0);

                  const cleanPhone = collector.phone?.replace(/[^0-9]/g, '');

                  return (
                  <div 
                    key={collector.id} 
                    className="bg-card border border-border/70 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all gap-3 cursor-pointer hover:border-emerald-500/50 group"
                    onClick={() => { setSelectedCollector(collector); setIsHistoryOpen(true); }}
                  >
                      <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-10 w-10 border-2 border-emerald-500/30 shrink-0">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${collector.avatar || collector.name}`} alt={collector.name} />
                                  <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold">{collector.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                  <h3 className="font-bold text-foreground text-sm truncate group-hover:text-emerald-600 transition-colors">
                                    {collector.name}
                                  </h3>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {collector.dni ? `DNI: ${collector.dni}` : 'Sin DNI'}
                                  </p>
                              </div>
                          </div>

                          {/* Botón QR directo */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Ver Credencial con Código QR"
                                onClick={() => setQrModalCollector(collector)}
                              >
                                  <QrCode className="h-3.5 w-3.5" />
                              </Button>

                              {canManage && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => setQrModalCollector(collector)}>
                                            <QrCode className="h-3.5 w-3.5 mr-2" /> Ver Credencial QR
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => { setSelectedCollector(collector); setIsHistoryOpen(true); }}>
                                            Ver Historial
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => { setEditingCollector(collector); setIsEditDialogOpen(true); }}>
                                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar Datos
                                        </DropdownMenuItem>
                                        {cleanPhone && (
                                          <DropdownMenuItem onSelect={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
                                              <Phone className="h-3.5 w-3.5 mr-2 text-emerald-600" /> WhatsApp
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive focus:text-destructive" 
                                          onSelect={() => {
                                            if (confirm(`¿Estás seguro de eliminar al recolector ${collector.name}?`)) {
                                              handleDelete(collector.id);
                                            }
                                          }}
                                        >
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                          </div>
                      </div>

                      {/* Teléfono de contacto si existe */}
                      {collector.phone && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Phone className="h-3 w-3 text-emerald-600" />
                          <a 
                            href={`https://wa.me/${cleanPhone}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline hover:text-emerald-600"
                          >
                            {collector.phone}
                          </a>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border/40 text-center">
                          <div className="bg-emerald-500/10 rounded-lg p-1.5">
                              <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Cosechado</span>
                              <span className="font-bold text-xs text-foreground">{calculatedTotalHarvested.toLocaleString('es-AR')} kg</span>
                          </div>
                          <div className="bg-muted/60 rounded-lg p-1.5">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase block">Rendimiento</span>
                              <span className="font-bold text-xs text-foreground">{calculatedProductivity.toFixed(1)} kg/h</span>
                          </div>
                      </div>
                  </div>
                  );
              })}
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Credencial QR individual */}
      <WorkerQRCardDialog
        isOpen={!!qrModalCollector}
        onOpenChange={(open) => !open && setQrModalCollector(null)}
        worker={qrModalCollector}
        type="collector"
        establishmentName={establishmentName}
      />

      {/* Modal de Edición de Datos */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Datos de Recolector</DialogTitle>
            <DialogDescription>
              Actualice el nombre, DNI, teléfono o contacto de emergencia.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3.5">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Nombre y Apellido *</FormLabel>
                    <FormControl><Input {...field} disabled={isPending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">DNI</FormLabel>
                      <FormControl><Input {...field} placeholder="Ej. 38123456" disabled={isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Teléfono / WhatsApp</FormLabel>
                      <FormControl><Input {...field} placeholder="Ej. 3424123456" disabled={isPending} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-3 border rounded-lg bg-muted/20 space-y-2.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Contacto de Emergencia</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <FormField
                    control={editForm.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Nombre Familiar" disabled={isPending} className="text-xs" /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Tel. Emergencia" disabled={isPending} className="text-xs" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Observaciones</FormLabel>
                    <FormControl><Input {...field} disabled={isPending} /></FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Historial */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-4 sm:p-6 max-h-[92vh] flex flex-col overflow-hidden rounded-2xl">
          {selectedCollector && (
            <>
              <DialogHeader className="pr-8 sm:pr-10 space-y-2 text-left shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                  <div className="min-w-0 pr-1">
                    <DialogTitle className="text-base sm:text-xl font-bold truncate">
                      Perfil de Recolector: {selectedCollector.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {selectedCollector.dni ? `DNI: ${selectedCollector.dni} • ` : ''}
                      Estadísticas generales e historial de cosechas registrado.
                    </DialogDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto shrink-0 gap-1.5 border-primary/40 text-primary hover:bg-primary/5 text-xs h-8"
                    onClick={() => setQrModalCollector(selectedCollector)}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Credencial QR
                  </Button>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 my-1 shrink-0">
                 <div className="bg-emerald-500/10 rounded-xl p-2.5 sm:p-3 text-center border border-emerald-500/20">
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Kilos Totales</p>
                    <p className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate mt-0.5">
                        {harvests.filter(h => h.collector.id === selectedCollector.id).reduce((sum, h) => sum + h.kilograms, 0).toLocaleString('es-AR')} kg
                    </p>
                 </div>
                 <div className="bg-muted/60 rounded-xl p-2.5 sm:p-3 text-center border border-border/40">
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Productividad</p>
                    <p className="text-lg sm:text-2xl font-black text-foreground truncate mt-0.5">
                        {(() => {
                           const collHarvests = harvests.filter(h => h.collector.id === selectedCollector.id);
                           const collLogs = (collectorPaymentLogs || []).filter(l => l.collectorId === selectedCollector.id);
                           const totalKg = collHarvests.reduce((sum, h) => sum + h.kilograms, 0);
                           const totalHrs = collLogs.reduce((sum, l) => sum + l.hours, 0);
                           return totalHrs > 0 ? (totalKg / totalHrs).toFixed(1) : selectedCollector.productivity?.toFixed(1) || '0.0';
                        })()} <span className="text-xs sm:text-sm font-normal text-muted-foreground">kg/hr</span>
                    </p>
                 </div>
              </div>

              <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden flex flex-col">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-0.5 shrink-0">
                  <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> 
                  Toque cualquier registro para ver los detalles completos y comprobante.
                </p>
                <div className="max-h-[48vh] overflow-y-auto overflow-x-auto border rounded-xl w-full">
                  <Table className="w-full min-w-[320px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="py-2 px-2.5 sm:px-4 text-xs">Fecha</TableHead>
                        <TableHead className="py-2 px-2 sm:px-4 text-xs">Lote</TableHead>
                        <TableHead className="py-2 px-2.5 sm:px-4 text-right text-xs">Kilos</TableHead>
                        <TableHead className="py-2 px-2.5 sm:px-4 text-right text-xs">Liquidación</TableHead>
                        <TableHead className="py-2 px-1 w-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const history = getCollectorRecords(selectedCollector.id);
                        if (history.length > 0) {
                          return history.map(rec => (
                            <TableRow 
                              key={rec.id}
                              className="cursor-pointer hover:bg-emerald-500/10 transition-colors group"
                              onClick={() => setSelectedRecordDetail(rec)}
                              title="Presione para ver detalles del registro"
                            >
                              <TableCell className="py-2 px-2.5 sm:px-4 font-medium text-xs sm:text-sm whitespace-nowrap">
                                {new Date(rec.date).toLocaleDateString('es-AR')}
                              </TableCell>
                              <TableCell className="py-2 px-2 sm:px-4">
                                <Badge variant="outline" className="text-[10px] sm:text-xs group-hover:border-emerald-500/50 max-w-[90px] truncate block sm:inline-block">
                                  {rec.batchNumber}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 px-2.5 sm:px-4 text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                                {rec.kilograms.toLocaleString('es-AR')} kg
                              </TableCell>
                              <TableCell className="py-2 px-2.5 sm:px-4 text-right font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                ${rec.payment.toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell className="py-2 px-1 text-muted-foreground text-right">
                                <ChevronRight className="h-3.5 w-3.5 inline-block group-hover:translate-x-0.5 transition-transform text-muted-foreground group-hover:text-emerald-600" />
                              </TableCell>
                            </TableRow>
                          ));
                        }
                        return (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs sm:text-sm">
                              No se encontró historial de cosecha.
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter className="pt-2 shrink-0">
                  <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle de Registro de Cosecha */}
      <Dialog 
        open={!!selectedRecordDetail} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecordDetail(null);
            if (typeof document !== 'undefined') {
              setTimeout(() => {
                document.body.style.pointerEvents = '';
              }, 50);
            }
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-xl z-[70]">
          {selectedRecordDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Info className="h-5 w-5 text-emerald-600" /> Detalles del Registro de Cosecha
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Información detallada del trabajo realizado y liquidación.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto px-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(selectedRecordDetail.date).toLocaleString('es-AR', { 
                      dateStyle: 'long', 
                      timeStyle: 'short' 
                    })}
                  </span>
                </div>

                <Card className="shadow-none border-border/80 bg-muted/20">
                  <CardContent className="p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Modalidad de Pago</span>
                      <Badge variant="outline" className="text-xs font-semibold">
                        {selectedRecordDetail.paymentType === 'hour' ? 'Pago por Hora' : 'Pago por Kilo'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Lote</span>
                      <Badge variant="secondary" className="font-semibold">{selectedRecordDetail.batchNumber}</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Recolector</span>
                      <span className="font-semibold text-foreground">{selectedRecordDetail.collectorName}</span>
                    </div>

                    <hr className="border-border/60 my-1" />

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Kilos Cosechados</span>
                      <span className="font-semibold text-foreground">{selectedRecordDetail.kilograms.toLocaleString('es-AR')} kg</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Horas Trabajadas</span>
                      <span className="font-medium text-foreground">
                        {selectedRecordDetail.hours > 0 ? `${selectedRecordDetail.hours} hs` : 'No especificado'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {selectedRecordDetail.paymentType === 'hour' ? 'Tarifa por Hora' : 'Tarifa por Kg'}
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedRecordDetail.paymentType === 'hour'
                          ? `$${(selectedRecordDetail.ratePerHour || selectedRecordDetail.ratePerKg).toLocaleString('es-AR')} /h`
                          : `$${selectedRecordDetail.ratePerKg.toLocaleString('es-AR')} /kg`}
                      </span>
                    </div>

                    {selectedRecordDetail.hours > 0 && selectedRecordDetail.kilograms > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rendimiento Sesión</span>
                        <span className="font-medium text-foreground">
                          {(selectedRecordDetail.kilograms / selectedRecordDetail.hours).toFixed(1)} kg/h
                        </span>
                      </div>
                    )}

                    {selectedRecordDetail.traceabilityId && (
                      <div className="flex justify-between items-center pt-1 text-[11px]">
                        <span className="text-muted-foreground">Código Trazabilidad</span>
                        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                          {selectedRecordDetail.traceabilityId}
                        </Badge>
                      </div>
                    )}

                    <hr className="border-border/60 my-1" />

                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm sm:text-base">
                        Total Liquidación
                      </span>
                      <span className="font-bold text-base sm:text-lg text-emerald-700 dark:text-emerald-400">
                        ${selectedRecordDetail.payment.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full sm:w-auto flex-1 gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
                  onClick={() => handleGenerateReceiptForCollectorRecord(selectedRecordDetail)}
                  disabled={isPdfPending}
                >
                  {isPdfPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-3.5 w-3.5" /> Descargar Recibo PDF
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedRecordDetail(null);
                    if (typeof document !== 'undefined') {
                      setTimeout(() => {
                        document.body.style.pointerEvents = '';
                      }, 50);
                    }
                  }}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
