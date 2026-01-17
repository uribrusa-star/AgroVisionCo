

'use client';

import React, { useContext, useMemo, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { ArrowDownCircle, ArrowUpCircle, Calendar, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

function TransactionHistoryComponent() {
  const { loading, transactions, deleteTransaction, currentUser } = useContext(AppDataContext);
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor';

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
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading && (
                        <TableRow>
                        <TableCell colSpan={3}>
                            <Skeleton className="h-8 w-full" />
                        </TableCell>
                        </TableRow>
                    )}
                    {!loading && sortedTransactions.length === 0 && (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center">No hay transacciones registradas.</TableCell>
                        </TableRow>
                    )}
                    {!loading && sortedTransactions.map((transaction) => (
                        <TableRow key={transaction.id} onClick={() => handleRowClick(transaction)} className="cursor-pointer">
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {transaction.type === 'Ingreso' 
                                        ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> 
                                        : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                                    }
                                    <div>
                                        <p className="font-medium truncate max-w-[120px] sm:max-w-none">{transaction.description}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-ES')}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{transaction.category}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${transaction.type === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.type === 'Ingreso' ? '+' : '-'} ${transaction.amount.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
        </Card>

        <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
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
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" disabled={isPending}>
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Eliminar</span>
                                      </Button>
                                  </AlertDialogTrigger>
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
    </>
  )
}

export const TransactionHistory = React.memo(TransactionHistoryComponent);
