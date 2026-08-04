

'use client';

import { MoreHorizontal } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Packer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const PackerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
});

export default function PackersPage() {
  const { loading, packers, packagingLogs, addPacker, deletePacker, currentUser } = React.useContext(AppDataContext);
  const [selectedPacker, setSelectedPacker] = useState<Packer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof PackerSchema>>({
    resolver: zodResolver(PackerSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isAddDialogOpen) {
      form.reset({ name: '' });
    }
  }, [isAddDialogOpen, form]);

  const getPackerHistory = (packerId: string) => {
    return packagingLogs.filter(log => log.packerId === packerId);
  };

  const handleDelete = (packerId: string) => {
    startTransition(async () => {
        await deletePacker(packerId);
        toast({ title: "Embalador Eliminado", description: "El embalador y sus datos asociados han sido eliminados." });
    });
  };

  const onAddSubmit = (values: z.infer<typeof PackerSchema>) => {
    const newName = values.name.trim();
    if (packers.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
      form.setError('name', { type: 'manual', message: 'Ya existe un embalador con este nombre.' });
      return;
    }
    
    startTransition(async () => {
        await addPacker({
          name: newName,
          avatar: `${Math.floor(Math.random() * 1000)}`,
          totalPackaged: 0,
          hoursWorked: 0,
          packagingRate: 0,
          joinDate: new Date().toISOString(),
        });
        toast({ title: "Embalador Agregado", description: `Se ha agregado a ${newName} al sistema.` });
        setIsAddDialogOpen(false);
        form.reset({ name: '' });
    });
  };

  if (!currentUser) return null;
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Encargado';

  return (
    <>
      <PageHeader
        title="Gestión de Embaladores"
        description="Vea y gestione su equipo de embalaje."
      >
        {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>Agregar Nuevo Embalador</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Embalador</DialogTitle>
                        <DialogDescription>
                            Complete los detalles para agregar un nuevo embalador.
                            <br/>
                            <strong className="text-destructive">Importante:</strong> El nombre no podrá ser modificado una vez creado.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej. María López" disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isPending}>{isPending ? 'Agregando...' : 'Agregar Embalador'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}
      </PageHeader>
      
      <div className="w-full max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Todos los Embaladores</CardTitle>
            <CardDescription>Una lista de todos los embaladores en su organización.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-muted/20">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`mob-skel-${i}`} className="h-24 w-full rounded-xl" />
              ))}
              {!loading && packers.map((packer) => (
                  <div 
                    key={packer.id} 
                    className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all gap-4 cursor-pointer hover:border-primary/50"
                    onClick={() => { setSelectedPacker(packer); setIsHistoryOpen(true); }}
                  >
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                  <AvatarImage src={`https://picsum.photos/seed/${packer.avatar}/40/40`} alt={packer.name} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{packer.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <h3 className="font-bold text-foreground text-sm leading-tight">{packer.name}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">Se unió: {new Date(packer.joinDate).toLocaleDateString('es-ES')}</p>
                              </div>
                          </div>
                          {canManage && (
                              <div onClick={(e) => e.stopPropagation()}>
                                  <AlertDialog>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                          <DropdownMenuItem onSelect={() => { setSelectedPacker(packer); setIsHistoryOpen(true); }}>Ver Historial</DropdownMenuItem>
                                          <AlertDialogTrigger asChild>
                                              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Eliminar</DropdownMenuItem>
                                          </AlertDialogTrigger>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. Esto eliminará permanentemente al embalador y todos sus registros de embalaje asociados.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDelete(packer.id)}>Continuar</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                              </div>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                          <div className="bg-primary/5 rounded-lg p-2 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase text-center w-full">Total (kg)</span>
                              <span className="font-bold text-sm text-foreground">{packer.totalPackaged.toLocaleString('es-ES')}</span>
                          </div>
                          <div className="bg-muted rounded-lg p-2 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase text-center w-full">kg / hr</span>
                              <span className="font-bold text-sm text-foreground">{packer.packagingRate.toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-3xl">
          {selectedPacker && (
            <>
              <DialogHeader>
                <DialogTitle>Perfil de Embalador: {selectedPacker.name}</DialogTitle>
                <DialogDescription>
                  Estadísticas generales e historial de embalaje detallado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 my-2">
                 <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Kilos Totales</p>
                    <p className="text-2xl font-bold text-foreground">
                        {selectedPacker.totalPackaged.toLocaleString('es-ES')} kg
                    </p>
                 </div>
                 <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Productividad</p>
                    <p className="text-2xl font-bold text-foreground">
                        {selectedPacker.packagingRate.toFixed(2)} <span className="text-sm font-normal">kg/hr</span>
                    </p>
                 </div>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Kilos Embalados</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const history = getPackerHistory(selectedPacker.id);
                      if (history.length > 0) {
                        return history.map(log => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.date).toLocaleDateString('es-ES')}</TableCell>
                            <TableCell>{log.kilogramsPackaged.toLocaleString('es-ES')} kg</TableCell>
                            <TableCell>{log.hoursWorked.toLocaleString('es-ES')} hs</TableCell>
                            <TableCell className="text-right font-medium">${log.payment.toLocaleString('es-AR')}</TableCell>
                          </TableRow>
                        ));
                      }
                      return (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No se encontró historial de embalaje.</TableCell>
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

    