
'use client';

import React, { useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { useToast } from '@/hooks/use-toast';

export function BatchHistory() {
  const { loading, batches, deleteBatch, currentUser, harvests } = useContext(AppDataContext);
  const { toast } = useToast();
  
  if (!currentUser) return null; // Guard clause
  const canManage = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado';

  const handleDelete = (batchId: string) => {
    deleteBatch(batchId);
    toast({
      title: "Lote Eliminado",
      description: `El lote ${batchId} ha sido eliminado exitosamente.`,
    });
  };
  
  const getBatchStatus = (batchId: string) => {
      // If there is any harvest for this batch, it is considered 'completed' for this view's logic
      // as we removed the explicit status change.
      return harvests.some(h => h.batchNumber === batchId) ? 'completed' : 'pending';
  }

  const sortedBatches = [...batches].sort((a, b) => new Date(b.preloadedDate).getTime() - new Date(a.preloadedDate).getTime());

  return (
    <Card>
        <CardHeader>
            <CardTitle>Historial de Lotes</CardTitle>
            <CardDescription>Registro de todos los lotes pre-cargados para la cosecha.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>ID Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Precarga</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedBatches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} className="text-center">No hay lotes registrados.</TableCell>
                    </TableRow>
                  )}
                  {!loading && sortedBatches.map((batch) => {
                      const status = getBatchStatus(batch.id);
                      return (
                        <TableRow key={batch.id}>
                            <TableCell className="font-medium">{batch.id}</TableCell>
                            <TableCell>
                              <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                                {status === 'completed' ? 'Cosechado' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(batch.preloadedDate).toLocaleDateString('es-ES')}</TableCell>
                            {canManage && (
                              <TableCell className="text-right">
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Eliminar Lote</span>
                                      </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  Esta acción no se puede deshacer. Esto eliminará permanentemente el lote. Si este lote ya fue cosechado, los registros de cosecha asociados no serán eliminados pero quedarán sin un lote válido.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDelete(batch.id)}>Continuar</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </TableCell>
                            )}
                        </TableRow>
                      )
                  })}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  )
}
