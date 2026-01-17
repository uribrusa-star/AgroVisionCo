

'use client';

import React, { useContext, useState, useMemo, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlaskConical, MoreVertical, PlusCircle, Trash2 } from 'lucide-react';

import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Supply, SupplyType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


const SupplySchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.enum(['Fertilizante', 'Fungicida', 'Insecticida', 'Acaricida']),
  photoUrl: z.string().url("Debe ser una URL de imagen válida.").or(z.literal('')).optional(),
  activeIngredient: z.string().min(3, "La composición es requerida."),
  dose: z.string().min(1, "La dosis es requerida."),
  notes: z.string().optional(),
  stock: z.coerce.number().min(0, "El stock no puede ser negativo.").optional(),
  lowStockThreshold: z.coerce.number().min(0, "El umbral no puede ser negativo.").optional(),
});

type SupplyFormValues = z.infer<typeof SupplySchema>;

const SupplyDialog = ({
  open,
  onOpenChange,
  supply,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  onSave: (values: SupplyFormValues, id?: string) => void;
}) => {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(SupplySchema),
    defaultValues: supply ? {
      name: supply.name,
      type: supply.type,
      photoUrl: supply.photoUrl || '',
      activeIngredient: supply.info.activeIngredient,
      dose: supply.info.dose,
      notes: supply.info.notes || '',
      stock: supply.stock || 0,
      lowStockThreshold: supply.lowStockThreshold || 0,
    } : {
      name: '',
      type: 'Fertilizante',
      photoUrl: '',
      activeIngredient: '',
      dose: '',
      notes: '',
      stock: 0,
      lowStockThreshold: 0,
    }
  });

  React.useEffect(() => {
    if (open) {
      form.reset(supply ? {
        name: supply.name,
        type: supply.type,
        photoUrl: supply.photoUrl || '',
        activeIngredient: supply.info.activeIngredient,
        dose: supply.info.dose,
        notes: supply.info.notes || '',
        stock: supply.stock || 0,
        lowStockThreshold: supply.lowStockThreshold || 0,
      } : {
        name: '',
        type: 'Fertilizante',
        photoUrl: '',
        activeIngredient: '',
        dose: '',
        notes: '',
        stock: 0,
        lowStockThreshold: 0,
      });
    }
  }, [open, supply, form]);
  
  const handleSubmit = (values: SupplyFormValues) => {
    startTransition(() => {
        onSave(values, supply?.id);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{supply ? 'Editar Insumo' : 'Agregar Nuevo Insumo'}</DialogTitle>
          <DialogDescription>{supply ? 'Actualice los detalles de este insumo.' : 'Complete el formulario para agregar un nuevo insumo al inventario.'}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Comercial</FormLabel><FormControl><Input {...field} placeholder="Ej. Folisol" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tipo de Insumo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Fertilizante">Fertilizante</SelectItem>
                            <SelectItem value="Fungicida">Fungicida</SelectItem>
                            <SelectItem value="Insecticida">Insecticida</SelectItem>
                            <SelectItem value="Acaricida">Acaricida</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="activeIngredient" render={({ field }) => (<FormItem><FormLabel>Composición</FormLabel><FormControl><Input {...field} placeholder="Ej. N-P-K 10-5-30" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dose" render={({ field }) => (<FormItem><FormLabel>Dosis Recomendada</FormLabel><FormControl><Input {...field} placeholder="Ej. 5 L/ha" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock Actual (kg/L)</FormLabel><FormControl><Input type="number" {...field} placeholder="Ej. 50" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (<FormItem><FormLabel>Umbral Stock Bajo</FormLabel><FormControl><Input type="number" {...field} placeholder="Ej. 10" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="photoUrl" render={({ field }) => (<FormItem><FormLabel>URL de la Foto (Opcional)</FormLabel><FormControl><Input {...field} placeholder="https://ejemplo.com/foto.jpg" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas Adicionales (Opcional)</FormLabel><FormControl><Textarea {...field} placeholder="Ej. Aplicar en pre-floración" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4">
                <DialogClose asChild><Button variant="secondary" type="button">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Insumo'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


const SupplyDetailsDialog = ({ open, onOpenChange, supply, onEdit, onDelete }: { open: boolean, onOpenChange: (open: boolean) => void, supply: Supply | null, onEdit: (supply: Supply) => void, onDelete: (supplyId: string) => void }) => {
    if (!supply) return null;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                 <AlertDialog>
                    <DialogHeader>
                        <DialogTitle>{supply.name}</DialogTitle>
                        <DialogDescription>Detalles del insumo: {supply.type}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        {supply.photoUrl && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted cursor-pointer">
                                  <Image src={supply.photoUrl} alt={supply.name} fill className="object-contain" />
                              </div>
                            </DialogTrigger>
                             <DialogContent className="max-w-4xl h-[90vh] flex items-center justify-center p-2">
                                <DialogHeader>
                                  <DialogTitle className="sr-only">Imagen: {supply.name}</DialogTitle>
                                </DialogHeader>
                                <Image
                                  src={supply.photoUrl}
                                  alt={supply.name}
                                  width={1920}
                                  height={1080}
                                  className="object-contain max-h-full max-w-full"
                                />
                              </DialogContent>
                          </Dialog>
                        )}
                        <Table>
                            <TableBody>
                                <TableRow><TableCell className="font-medium text-muted-foreground">Composición</TableCell><TableCell>{supply.info.activeIngredient}</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium text-muted-foreground">Dosis</TableCell><TableCell>{supply.info.dose}</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium text-muted-foreground">Stock</TableCell><TableCell className={cn(supply.stock !== undefined && supply.lowStockThreshold !== undefined && supply.stock < supply.lowStockThreshold ? 'text-destructive font-bold' : '')}>{supply.stock !== undefined ? supply.stock.toFixed(3) : 'N/A'} kg/L</TableCell></TableRow>
                                <TableRow><TableCell className="font-medium text-muted-foreground">Umbral Stock Bajo</TableCell><TableCell>{supply.lowStockThreshold ?? 'N/A'} kg/L</TableCell></TableRow>
                                {supply.info.notes && <TableRow><TableCell className="font-medium text-muted-foreground">Notas</TableCell><TableCell className="whitespace-pre-wrap">{supply.info.notes}</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="flex-row justify-between w-full">
                         <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                         </AlertDialogTrigger>
                         <div className="flex gap-2">
                             <Button variant="outline" onClick={() => onEdit(supply)}>Editar</Button>
                             <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                         </div>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el insumo del inventario.</AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(supply.id)}>Continuar y Eliminar</AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                    </DialogFooter>
                 </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

export function Supplies() {
  const { loading, supplies, addSupply, editSupply, deleteSupply, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);

  if (!currentUser) return null;
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';

  const categorizedSupplies = useMemo(() => {
    return {
      Fertilizante: supplies.filter(s => s.type === 'Fertilizante'),
      Fungicida: supplies.filter(s => s.type === 'Fungicida'),
      Insecticida: supplies.filter(s => s.type === 'Insecticida'),
      Acaricida: supplies.filter(s => s.type === 'Acaricida'),
    };
  }, [supplies]);

  const handleSaveSupply = (values: SupplyFormValues, id?: string) => {
    const supplyData = {
        name: values.name,
        type: values.type as SupplyType,
        photoUrl: values.photoUrl,
        stock: values.stock,
        lowStockThreshold: values.lowStockThreshold,
        info: {
            activeIngredient: values.activeIngredient,
            dose: values.dose,
            notes: values.notes,
        },
    };

    if (id) {
        editSupply({ id, ...supplyData });
        toast({ title: 'Insumo Actualizado', description: `Se ha actualizado ${values.name}.` });
    } else {
        addSupply(supplyData);
        toast({ title: 'Insumo Agregado', description: `Se ha agregado ${values.name} al inventario.` });
    }
    setIsFormOpen(false);
    setSelectedSupply(null);
  }

  const handleDeleteSupply = (supplyId: string) => {
    deleteSupply(supplyId);
    toast({ title: 'Insumo Eliminado', description: 'El insumo ha sido eliminado del inventario.' });
    setIsDetailsOpen(false);
    setSelectedSupply(null);
  };

  const handleAddNew = () => {
    setSelectedSupply(null);
    setIsFormOpen(true);
  };
  
  const handleEdit = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  }
  
  const handleViewDetails = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsDetailsOpen(true);
  };
  
  const SupplyTable = ({ data }: { data: Supply[] }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Composición</TableHead>
                <TableHead className="text-right">Stock (kg/L)</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {loading && <tr><TableCell colSpan={3}><Skeleton className="h-10" /></TableCell></tr>}
            {!loading && data.length === 0 && <tr><TableCell colSpan={3} className="text-center text-muted-foreground">No hay insumos en esta categoría.</TableCell></tr>}
            {!loading && data.map(supply => {
                const isLowStock = supply.stock !== undefined && supply.lowStockThreshold !== undefined && supply.stock < supply.lowStockThreshold;
                return (
                    <TableRow key={supply.id} className="cursor-pointer" onClick={() => handleViewDetails(supply)}>
                        <TableCell className="font-medium">{supply.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{supply.info.activeIngredient}</TableCell>
                        <TableCell className={cn("text-right font-semibold", isLowStock && "text-destructive")}>
                            {supply.stock !== undefined ? supply.stock.toFixed(3) : 'N/A'}
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Insumos del Establecimiento</CardTitle>
            <CardDescription>Inventario de fertilizantes, fungicidas, insecticidas y acaricidas.</CardDescription>
        </div>
        {canManage && <Button size="sm" onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" />Agregar</Button>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="Fertilizante">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="Fertilizante">Fertilizantes</TabsTrigger>
            <TabsTrigger value="Fungicida">Fungicidas</TabsTrigger>
            <TabsTrigger value="Insecticida">Insecticidas</TabsTrigger>
            <TabsTrigger value="Acaricida">Acaricidas</TabsTrigger>
          </TabsList>
          <TabsContent value="Fertilizante"><SupplyTable data={categorizedSupplies.Fertilizante} /></TabsContent>
          <TabsContent value="Fungicida"><SupplyTable data={categorizedSupplies.Fungicida} /></TabsContent>
          <TabsContent value="Insecticida"><SupplyTable data={categorizedSupplies.Insecticida} /></TabsContent>
          <TabsContent value="Acaricida"><SupplyTable data={categorizedSupplies.Acaricida} /></TabsContent>
        </Tabs>
      </CardContent>

      <SupplyDialog open={isFormOpen} onOpenChange={setIsFormOpen} supply={selectedSupply} onSave={handleSaveSupply} />
      <SupplyDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} supply={selectedSupply} onEdit={handleEdit} onDelete={handleDeleteSupply} />
    </Card>
  );
}
