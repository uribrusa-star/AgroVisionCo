'use client';

import React, { useContext, useMemo, useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { ArrowDownCircle, ArrowUpCircle, Calendar, Trash2, Pencil, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Transaction } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const EditTransactionSchema = z.object({
  type: z.enum(['Ingreso', 'Gasto']),
  category: z.string().min(1, "La categoría es requerida."),
  description: z.string().min(3, "La descripción es requerida."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  date: z.string().min(1, "La fecha es requerida."),
  quantity: z.coerce.number().optional(),
  unit: z.string().optional(),
  pricePerUnit: z.coerce.number().optional(),
}).refine(data => {
  if (data.category === 'Insumos') {
    return data.quantity && data.quantity > 0 && data.unit && data.unit.length > 0;
  }
  return true;
}, {
  message: "La cantidad y la unidad son requeridas para la categoría 'Insumos'.",
  path: ['quantity'],
});

type EditTransactionFormValues = z.infer<typeof EditTransactionSchema>;

function TransactionHistoryComponent() {
  const { loading, transactions, deleteTransaction, editTransaction, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor';

  const editForm = useForm<EditTransactionFormValues>({
    resolver: zodResolver(EditTransactionSchema),
    defaultValues: {
      type: 'Gasto',
      category: '',
      description: '',
      amount: 0,
      date: '',
      quantity: 0,
      unit: 'kg',
      pricePerUnit: 0,
    },
  });

  const editType = editForm.watch('type');
  const editCategory = editForm.watch('category');
  const editAmount = editForm.watch('amount');
  const editQuantity = editForm.watch('quantity');

  const expenseCategories = ['Insumos', 'Mano de Obra', 'Mantenimiento', 'Servicios', 'Riego', 'Otro'];
  const incomeCategories = ['Venta Mayorista', 'Venta Minorista', 'Otro'];

  useEffect(() => {
    if (editCategory === 'Insumos' && editAmount && editQuantity && editQuantity > 0) {
      editForm.setValue('pricePerUnit', editAmount / editQuantity);
    } else {
      editForm.setValue('pricePerUnit', undefined);
    }
  }, [editAmount, editQuantity, editCategory, editForm]);

  const handleOpenEdit = (transaction: Transaction) => {
    const formattedDate = transaction.date ? new Date(transaction.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    editForm.reset({
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      date: formattedDate,
      quantity: transaction.quantity || 0,
      unit: transaction.unit || 'kg',
      pricePerUnit: transaction.pricePerUnit || 0,
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = (data: EditTransactionFormValues) => {
    if (!selectedTransaction) return;
    startTransition(() => {
      const updatedTx: Transaction = {
        ...selectedTransaction,
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date(data.date).toISOString(),
        quantity: data.quantity || undefined,
        unit: data.unit || undefined,
        pricePerUnit: data.pricePerUnit || undefined,
      };

      editTransaction(updatedTx);
      setSelectedTransaction(updatedTx);
      setIsEditDialogOpen(false);

      toast({
        title: "Transacción Actualizada",
        description: "El registro financiero ha sido modificado exitosamente.",
      });
    });
  };

  const sortedTransactions = useMemo(() => 
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [transactions]
  );
  
  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  }

  const handleDelete = (transactionId: string) => {
    startTransition(() => {
        deleteTransaction(transactionId);
        toast({
            title: "Transacción Eliminada",
            description: "El registro financiero ha sido eliminado exitosamente.",
        });
        setSelectedTransaction(null);
    });
  }

  return (
    <>
        <Card>
            <CardHeader>
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Un registro de los últimos gastos e ingresos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="flex flex-col gap-2 p-1">
                    {loading && (
                        <Skeleton className="h-16 w-full rounded-xl" />
                    )}
                    {!loading && sortedTransactions.length === 0 && (
                        <div className="text-center text-muted-foreground p-4">No hay transacciones registradas.</div>
                    )}
                    {!loading && sortedTransactions.map((transaction) => (
                        <div 
                            key={transaction.id} 
                            onClick={() => handleRowClick(transaction)} 
                            className="bg-card border rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {transaction.type === 'Ingreso' 
                                    ? <ArrowUpCircle className="h-8 w-8 text-green-500 bg-green-500/10 rounded-full p-1.5" /> 
                                    : <ArrowDownCircle className="h-8 w-8 text-red-500 bg-red-500/10 rounded-full p-1.5" />
                                }
                                <div>
                                    <p className="font-medium text-sm leading-tight max-w-[150px] sm:max-w-[200px] truncate">{transaction.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">{transaction.category}</Badge>
                                        <span className="text-[10px] text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-ES')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`text-right font-bold text-sm ${transaction.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'Ingreso' ? '+' : '-'} ${transaction.amount.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
        </Card>

        {/* Dialog Detalle Transacción */}
        <Dialog open={!!selectedTransaction && !isEditDialogOpen} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
            <DialogContent className="sm:max-w-md">
                {selectedTransaction && (
                    <AlertDialog>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {selectedTransaction.type === 'Ingreso' 
                                    ? <ArrowUpCircle className="h-5 w-5 text-green-500" /> 
                                    : <ArrowDownCircle className="h-5 w-5 text-red-500" />
                                }
                                Detalle de la Transacción
                            </DialogTitle>
                             <DialogDescription>
                                Revisión del movimiento financiero registrado.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(selectedTransaction.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</span>
                            </div>
                             <Card>
                                <CardContent className="p-4 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                                        <Badge variant={selectedTransaction.type === 'Ingreso' ? 'default' : 'destructive'}>{selectedTransaction.type}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Categoría</p>
                                        <p className="font-semibold">{selectedTransaction.category}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                                        <p className="font-semibold">{selectedTransaction.description}</p>
                                    </div>
                                     {selectedTransaction.quantity && selectedTransaction.unit && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Cantidad Comprada</p>
                                            <p className="font-semibold">{selectedTransaction.quantity} {selectedTransaction.unit}</p>
                                        </div>
                                     )}
                                     {selectedTransaction.pricePerUnit && (
                                         <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Precio por Unidad</p>
                                            <p className="font-semibold">${selectedTransaction.pricePerUnit.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                                        </div>
                                     )}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                                        <p className={`font-bold text-lg ${selectedTransaction.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedTransaction.type === 'Ingreso' ? '+' : '-'} ${selectedTransaction.amount.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                                        </p>
                                    </div>
                                </CardContent>
                             </Card>
                        </div>
                        <DialogFooter className="flex-row justify-between w-full pt-2">
                            {canManage ? (
                                <div className="flex items-center gap-2">
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" disabled={isPending}>
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Eliminar</span>
                                      </Button>
                                  </AlertDialogTrigger>
                                  <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => handleOpenEdit(selectedTransaction)}
                                      disabled={isPending}
                                  >
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Editar</span>
                                  </Button>
                                </div>
                            ) : <div />}
                            <Button onClick={() => setSelectedTransaction(null)} variant="secondary">Cerrar</Button>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la transacción de sus registros.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(selectedTransaction.id)}>Continuar y Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </DialogFooter>
                    </AlertDialog>
                )}
            </DialogContent>
        </Dialog>

        {/* Dialog Edición Transacción */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Editar Transacción
              </DialogTitle>
              <DialogDescription>
                Modifique los campos de este movimiento financiero.
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Movimiento</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            editForm.setValue('category', '');
                          }} 
                          value={field.value} 
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione Tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Gasto">Gasto (Egreso)</SelectItem>
                            <SelectItem value="Ingreso">Ingreso</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione Categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(editType === 'Ingreso' ? incomeCategories : expenseCategories).map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción o Concepto</FormLabel>
                      <FormControl>
                        <Input placeholder="ej. Fertilizante NPK, Venta 15 cajas..." {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto Total ($ ARS)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" placeholder="0.00" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha y Hora</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {editCategory === 'Insumos' && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg border">
                    <FormField
                      control={editForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad Comprada</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="10" {...field} disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidad de Medida</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unidad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="unidades">unidades</SelectItem>
                              <SelectItem value="bolsas">bolsas</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0 pt-3">
                  <Button type="button" variant="secondary" onClick={() => setIsEditDialogOpen(false)} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending} className="bg-[#2d4a22] hover:bg-[#1a2d13] text-white">
                    <Save className="h-4 w-4 mr-2" />
                    {isPending ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </>
  )
}

export const TransactionHistory = React.memo(TransactionHistoryComponent);
