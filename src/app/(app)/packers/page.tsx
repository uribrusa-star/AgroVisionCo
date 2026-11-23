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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Packer, PackagingLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { WorkerQRCardDialog } from '@/components/worker-qr-card-dialog';
import { generateCrewBadgesPDF } from '@/lib/export-crew-badges-pdf';
import { saveOrSharePdf } from '@/lib/pdf-generator';

const PackerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  dni: z.string().optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type PackerFormValues = z.infer<typeof PackerSchema>;

export default function PackersPage() {
  const { 
    loading, 
    packers, 
    packagingLogs, 
    addPacker, 
    editPacker, 
    deletePacker, 
    currentUser, 
    establishmentData 
  } = React.useContext(AppDataContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPacker, setSelectedPacker] = useState<Packer | null>(null);
  const [editingPacker, setEditingPacker] = useState<Packer | null>(null);
  const [qrModalPacker, setQrModalPacker] = useState<Packer | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrintingBadges, setIsPrintingBadges] = useState(false);

  const [selectedPackagingDetail, setSelectedPackagingDetail] = useState<PackagingLog | null>(null);
  const [isPdfPending, startPdfTransition] = useTransition();
  const isGeneratingRef = React.useRef(false);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const addForm = useForm<PackerFormValues>({
    resolver: zodResolver(PackerSchema),
    defaultValues: { name: '', dni: '', phone: '', emergencyContactName: '', emergencyContactPhone: '', address: '', notes: '' },
  });

  const editForm = useForm<PackerFormValues>({
    resolver: zodResolver(PackerSchema),
    defaultValues: { name: '', dni: '', phone: '', emergencyContactName: '', emergencyContactPhone: '', address: '', notes: '' },
  });

  useEffect(() => {
    if (isAddDialogOpen) {
      addForm.reset({ name: '', dni: '', phone: '', emergencyContactName: '', emergencyContactPhone: '', address: '', notes: '' });
    }
  }, [isAddDialogOpen, addForm]);

  useEffect(() => {
    if (editingPacker && isEditDialogOpen) {
      editForm.reset({
        name: editingPacker.name,
        dni: editingPacker.dni || '',
        phone: editingPacker.phone || '',
        emergencyContactName: editingPacker.emergencyContactName || '',
        emergencyContactPhone: editingPacker.emergencyContactPhone || '',
        address: editingPacker.address || '',
        notes: editingPacker.notes || ''
      });
    }
  }, [editingPacker, isEditDialogOpen, editForm]);

  const establishmentName = establishmentData?.producer || establishmentData?.name || 'Don José';

  const filteredPackers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return packers;
    return packers.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.dni && p.dni.includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }, [packers, searchQuery]);

  const getPackerHistory = (packerId: string) => {
    return [...packagingLogs]
      .filter(log => log.packerId === packerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleGenerateReceiptForPackagingRecord = (log: PackagingLog) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setTimeout(() => { isGeneratingRef.current = false; }, 3000);
    if (!log || !establishmentData) return;

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
        doc.text(`Fecha: ${new Date(log.date).toLocaleDateString('es-AR')}`, 195, 60, { align: 'right' });

        const bodyY = 80;
        doc.setFontSize(12);
        doc.text(`Por medio del presente, se deja constancia de que ${log.packerName} ha recibido el pago por las labores de embalaje detalladas a continuación:`, 15, bodyY, { maxWidth: 180 });

        const tableBody = [
          ['Labor Realizada', 'Embalaje de Fruta'],
          ['Modalidad de Pago', 'Por Hora Trabajada'],
          ['Horas Trabajadas', `${log.hoursWorked} hs`],
          ['Tarifa por Hora', `$${log.costPerHour.toLocaleString('es-AR', { minimumFractionDigits: 2 })}/h`],
          ['Kilos Embalados (Referencia)', `${log.kilogramsPackaged.toLocaleString('es-AR')} kg`],
          ['Rendimiento de Sesión', `${log.hoursWorked > 0 ? (log.kilogramsPackaged / log.hoursWorked).toFixed(1) : '0.0'} kg/h`],
          ['Total Pagado', `$${log.payment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`]
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
        doc.text('Firma del Embalador/a: _________________________', 15, finalY + 30);
        doc.text(`Aclaración: ${log.packerName}`, 15, finalY + 40);

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Este es un comprobante no válido como factura.', 105, 280, { align: 'center' });

        const fileName = `Recibo_Embalaje_${log.packerName.replace(/\s+/g, '_')}_${new Date(log.date).toISOString().slice(0, 10)}.pdf`;
        await saveOrSharePdf(doc, fileName, 'Recibo de Pago de Embalaje');
        toast({ title: '¡Recibo Listo!', description: 'El comprobante ha sido generado correctamente.' });
      } catch (error) {
        console.error("Error al generar recibo PDF:", error);
        toast({ title: "Error", description: "No se pudo generar el comprobante PDF.", variant: "destructive" });
      }
    });
  };

  const handleDelete = (packerId: string) => {
    startTransition(async () => {
        await deletePacker(packerId);
        toast({ title: "Embalador Eliminado", description: "El embalador y sus datos asociados han sido eliminados." });
    });
  };

  const onAddSubmit = (values: PackerFormValues) => {
    const newName = values.name.trim();
    if (packers.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
      addForm.setError('name', { type: 'manual', message: 'Ya existe un embalador con este nombre.' });
      return;
    }
    
    startTransition(async () => {
        await addPacker({
          name: newName,
          dni: values.dni?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          emergencyContactName: values.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          status: 'active',
          avatar: `${Math.floor(Math.random() * 1000)}`,
          totalPackaged: 0,
          hoursWorked: 0,
          packagingRate: 0,
          joinDate: new Date().toISOString(),
        });
        toast({ title: "Embalador Agregado", description: `Se ha agregado a ${newName} con su credencial QR lista.` });
        setIsAddDialogOpen(false);
        addForm.reset();
    });
  };

  const onEditSubmit = async (values: PackerFormValues) => {
    if (!editingPacker) return;

    startTransition(async () => {
      try {
        await editPacker({
          ...editingPacker,
          name: values.name.trim(),
          dni: values.dni?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          emergencyContactName: values.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: values.emergencyContactPhone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
        });
        toast({ title: "Embalador Actualizado", description: `Los datos de ${values.name} se guardaron correctamente.` });
        setIsEditDialogOpen(false);
        setEditingPacker(null);
      } catch (e) {
        toast({ title: "Error", description: "No se pudieron actualizar los datos del embalador.", variant: "destructive" });
      }
    });
  };

  const handlePrintAllBadges = async () => {
    try {
      setIsPrintingBadges(true);
      await generateCrewBadgesPDF({
        workers: packers,
        type: 'packer',
        establishmentName
      });
      toast({
        title: "Credenciales Generadas",
        description: `Se descargó el archivo con los carnets de ${packers.length} embaladores listos para imprimir.`,
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
        title="Gestión de Embaladores"
        description="Vea y gestione su equipo de embalaje con credenciales QR."
      >
        <div className="flex items-center gap-2 flex-wrap">
          {packers.length > 0 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrintAllBadges}
              disabled={isPrintingBadges}
              className="gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Printer className="h-4 w-4" />
              {isPrintingBadges ? "Generando Carnets..." : "Imprimir Credenciales QR"}
            </Button>
          )}

          {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <Plus className="h-4 w-4" /> Agregar Embalador
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Embalador</DialogTitle>
                        <DialogDescription>
                            Complete los detalles para agregar un nuevo embalador.
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
                                            <Input {...field} placeholder="Ej. María Gómez" disabled={isPending} />
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
                                              <Input {...field} placeholder="Ej. 35987654" disabled={isPending} />
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
                                        <FormLabel className="text-xs font-semibold">Observaciones</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej. Galpón central" disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
            Mostrando {filteredPackers.length} de {packers.length} embaladores
          </div>
        </div>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Todos los Embaladores</CardTitle>
            <CardDescription>Gestión de personal de empaque y credenciales con código QR.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`mob-skel-${i}`} className="h-32 w-full rounded-xl" />
                ))}

                {!loading && filteredPackers.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                    No se encontraron embaladores que coincidan con la búsqueda.
                  </div>
                )}

                {!loading && filteredPackers.map((packer) => {
                    const packerLogs = packagingLogs.filter(log => log.packerId === packer.id);
                    
                    const calculatedTotalPackaged = packerLogs.length > 0
                      ? packerLogs.reduce((sum, log) => sum + log.kilogramsPackaged, 0)
                      : packer.totalPackaged;
                      
                    const calculatedHoursWorked = packerLogs.length > 0
                      ? packerLogs.reduce((sum, log) => sum + log.hoursWorked, 0)
                      : packer.hoursWorked;
                      
                    const calculatedPackagingRate = calculatedHoursWorked > 0
                      ? calculatedTotalPackaged / calculatedHoursWorked
                      : (packer.packagingRate || 0);

                    const cleanPhone = packer.phone?.replace(/[^0-9]/g, '');

                    return (
                    <div 
                      key={packer.id} 
                      className="bg-card border border-border/70 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all gap-3 cursor-pointer hover:border-emerald-500/50 group"
                      onClick={() => { setSelectedPacker(packer); setIsHistoryOpen(true); }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="h-10 w-10 border-2 border-emerald-500/30 shrink-0">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${packer.avatar || packer.name}`} alt={packer.name} />
                                    <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold">{packer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-foreground text-sm truncate group-hover:text-emerald-600 transition-colors">
                                      {packer.name}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {packer.dni ? `DNI: ${packer.dni}` : 'Sin DNI'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  title="Ver Credencial con Código QR"
                                  onClick={() => setQrModalPacker(packer)}
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
                                          <DropdownMenuItem onSelect={() => setQrModalPacker(packer)}>
                                              <QrCode className="h-3.5 w-3.5 mr-2" /> Ver Credencial QR
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => { setSelectedPacker(packer); setIsHistoryOpen(true); }}>
                                              Ver Historial
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => { setEditingPacker(packer); setIsEditDialogOpen(true); }}>
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
                                              if (confirm(`¿Estás seguro de eliminar al embalador ${packer.name}?`)) {
                                                handleDelete(packer.id);
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

                        {packer.phone && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <a 
                              href={`https://wa.me/${cleanPhone}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline hover:text-emerald-600"
                            >
                              {packer.phone}
                            </a>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border/40 text-center">
                            <div className="bg-emerald-500/10 rounded-lg p-1.5">
                                <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Embalado</span>
                                <span className="font-bold text-xs text-foreground">{calculatedTotalPackaged.toLocaleString('es-AR')} kg</span>
                            </div>
                            <div className="bg-muted/60 rounded-lg p-1.5">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase block">Rendimiento</span>
                                <span className="font-bold text-xs text-foreground">{calculatedPackagingRate.toFixed(1)} kg/h</span>
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
        isOpen={!!qrModalPacker}
        onOpenChange={(open) => !open && setQrModalPacker(null)}
        worker={qrModalPacker}
        type="packer"
        establishmentName={establishmentName}
      />

      {/* Modal de Edición de Datos */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Datos de Embalador</DialogTitle>
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
                      <FormControl><Input {...field} placeholder="Ej. 35987654" disabled={isPending} /></FormControl>
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
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedPacker && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle>Historial de Embalaje: {selectedPacker.name}</DialogTitle>
                    <DialogDescription>
                      {selectedPacker.dni ? `DNI: ${selectedPacker.dni} | ` : ''}
                      Estadísticas de empaque y registro detallado.
                    </DialogDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
                    onClick={() => setQrModalPacker(selectedPacker)}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Credencial QR
                  </Button>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 my-2">
                 <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Kilos Embalados</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {packagingLogs.filter(log => log.packerId === selectedPacker.id).reduce((sum, log) => sum + log.kilogramsPackaged, 0).toLocaleString('es-AR')} kg
                    </p>
                 </div>
                 <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Rendimiento</p>
                    <p className="text-2xl font-bold text-foreground">
                        {(() => {
                           const logs = packagingLogs.filter(log => log.packerId === selectedPacker.id);
                           const totalKg = logs.reduce((sum, log) => sum + log.kilogramsPackaged, 0);
                           const totalHrs = logs.reduce((sum, log) => sum + log.hoursWorked, 0);
                           return totalHrs > 0 ? (totalKg / totalHrs).toFixed(1) : selectedPacker.packagingRate?.toFixed(1) || '0.0';
                        })()} <span className="text-sm font-normal">kg/hr</span>
                    </p>
                 </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-0.5">
                  <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" /> 
                  Toque cualquier registro para ver los detalles completos y comprobante.
                </p>
                <div className="max-h-[50vh] overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead className="text-right">Kilos Embalados</TableHead>
                        <TableHead className="text-right">Liquidación</TableHead>
                        <TableHead className="w-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const history = getPackerHistory(selectedPacker.id);
                        if (history.length > 0) {
                          return history.map(log => (
                            <TableRow 
                              key={log.id}
                              className="cursor-pointer hover:bg-blue-500/10 transition-colors group"
                              onClick={() => setSelectedPackagingDetail(log)}
                              title="Presione para ver detalles del registro"
                            >
                              <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                                {new Date(log.date).toLocaleDateString('es-AR')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap">{log.hoursWorked} hs</TableCell>
                              <TableCell className="text-right font-medium text-xs sm:text-sm whitespace-nowrap">
                                {log.kilogramsPackaged.toLocaleString('es-AR')} kg
                              </TableCell>
                              <TableCell className="text-right font-semibold text-xs sm:text-sm text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                ${log.payment.toLocaleString('es-AR')}
                              </TableCell>
                              <TableCell className="text-muted-foreground p-1 text-right">
                                <ChevronRight className="h-4 w-4 inline-block group-hover:translate-x-0.5 transition-transform text-muted-foreground group-hover:text-blue-600" />
                              </TableCell>
                            </TableRow>
                          ));
                        }
                        return (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs sm:text-sm">
                              No se encontró historial de embalaje.
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle de Registro de Embalaje */}
      <Dialog 
        open={!!selectedPackagingDetail} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPackagingDetail(null);
            if (typeof document !== 'undefined') {
              setTimeout(() => {
                document.body.style.pointerEvents = '';
              }, 50);
            }
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-xl z-[70]">
          {selectedPackagingDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Info className="h-5 w-5 text-blue-600" /> Detalles del Registro de Embalaje
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Información detallada de la labor de embalaje y liquidación.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto px-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(selectedPackagingDetail.date).toLocaleString('es-AR', { 
                      dateStyle: 'long', 
                      timeStyle: 'short' 
                    })}
                  </span>
                </div>

                <Card className="shadow-none border-border/80 bg-muted/20">
                  <CardContent className="p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Modalidad</span>
                      <Badge variant="outline" className="text-xs font-semibold">
                        Labor de Embalaje
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Embalador/a</span>
                      <span className="font-semibold text-foreground">{selectedPackagingDetail.packerName}</span>
                    </div>

                    <hr className="border-border/60 my-1" />

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Kilos Embalados</span>
                      <span className="font-semibold text-foreground">
                        {selectedPackagingDetail.kilogramsPackaged.toLocaleString('es-AR')} kg
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Horas Trabajadas</span>
                      <span className="font-medium text-foreground">{selectedPackagingDetail.hoursWorked} hs</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tarifa por Hora</span>
                      <span className="font-medium text-foreground">
                        ${selectedPackagingDetail.costPerHour.toLocaleString('es-AR')} /h
                      </span>
                    </div>

                    {selectedPackagingDetail.hoursWorked > 0 && selectedPackagingDetail.kilogramsPackaged > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rendimiento Sesión</span>
                        <span className="font-medium text-foreground">
                          {(selectedPackagingDetail.kilogramsPackaged / selectedPackagingDetail.hoursWorked).toFixed(1)} kg/h
                        </span>
                      </div>
                    )}

                    <hr className="border-border/60 my-1" />

                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold text-blue-800 dark:text-blue-300 text-sm sm:text-base">
                        Total Liquidación
                      </span>
                      <span className="font-bold text-base sm:text-lg text-blue-700 dark:text-blue-400">
                        ${selectedPackagingDetail.payment.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full sm:w-auto flex-1 gap-1.5 text-xs border-blue-600/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  onClick={() => handleGenerateReceiptForPackagingRecord(selectedPackagingDetail)}
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
                    setSelectedPackagingDetail(null);
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
