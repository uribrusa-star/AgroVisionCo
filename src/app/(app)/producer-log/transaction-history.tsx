

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
