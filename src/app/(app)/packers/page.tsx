

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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Total Embalado</TableHead>
                  <TableHead className="hidden lg:table-cell">Productividad (kg/hr)</TableHead>
                  <TableHead className="hidden sm:table-cell">Se unió</TableHead>
                  {canManage && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                    {canManage && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                  </TableRow>
                ))}
                {!loading && packers.map((packer) => (
                  <TableRow key={packer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://picsum.photos/seed/${packer.avatar}/40/40`} alt={packer.name} />
                          <AvatarFallback>{packer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{packer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{packer.totalPackaged.toLocaleString('es-ES')} kg</TableCell>
                    <TableCell className="hidden lg:table-cell">{packer.packagingRate.toFixed(2)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{new Date(packer.joinDate).toLocaleDateString('es-ES')}</TableCell>
                     {canManage && (
                        <TableCell>
                            <AlertDialog>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPending}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
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
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-3xl">
          {selectedPacker && (
            <>
              <DialogHeader>
                <DialogTitle>Historial de Embalaje: {selectedPacker.name}</DialogTitle>
                <DialogDescription>
                  Revise todos los trabajos de embalaje para este embalador.
                </DialogDescription>
              </DialogHeader>
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

    