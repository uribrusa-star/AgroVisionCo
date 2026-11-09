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
  UserCheck 
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

  const getCollectorHistory = (collectorId: string) => {
    return harvests.filter(h => h.collector.id === collectorId);
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
          {selectedCollector && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle>Perfil de Recolector: {selectedCollector.name}</DialogTitle>
                    <DialogDescription>
                      {selectedCollector.dni ? `DNI: ${selectedCollector.dni} | ` : ''}
                      Estadísticas generales e historial de cosechas registrado.
                    </DialogDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
                    onClick={() => setQrModalCollector(selectedCollector)}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Credencial QR
                  </Button>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 my-2">
                 <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Kilos Totales</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {harvests.filter(h => h.collector.id === selectedCollector.id).reduce((sum, h) => sum + h.kilograms, 0).toLocaleString('es-AR')} kg
                    </p>
                 </div>
                 <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Productividad</p>
                    <p className="text-2xl font-bold text-foreground">
                        {(() => {
                           const collHarvests = harvests.filter(h => h.collector.id === selectedCollector.id);
                           const collLogs = (collectorPaymentLogs || []).filter(l => l.collectorId === selectedCollector.id);
                           const totalKg = collHarvests.reduce((sum, h) => sum + h.kilograms, 0);
                           const totalHrs = collLogs.reduce((sum, l) => sum + l.hours, 0);
                           return totalHrs > 0 ? (totalKg / totalHrs).toFixed(1) : selectedCollector.productivity?.toFixed(1) || '0.0';
                        })()} <span className="text-sm font-normal">kg/hr</span>
                    </p>
                 </div>
              </div>
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Lote(s)</TableHead>
                      <TableHead className="text-right">Kilogramos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const history = getCollectorHistory(selectedCollector.id);
                      if (history.length > 0) {
                        return history.map(h => (
                          <TableRow key={h.id}>
                            <TableCell>{new Date(h.date).toLocaleDateString('es-AR')}</TableCell>
                            <TableCell><Badge variant="outline">{h.batchNumber}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{h.kilograms} kg</TableCell>
                          </TableRow>
                        ));
                      }
                      return (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No se encontró historial de cosecha.</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
