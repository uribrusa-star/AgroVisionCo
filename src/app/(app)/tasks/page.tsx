
'use client';

import React, { useContext, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppDataContext } from '@/context/app-data-context.tsx';
import type { Task, TaskStatus } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Calendar as CalendarIcon, MoreHorizontal, ArrowRight, Flag, Wrench, PlusCircle, Trash2, GripVertical, Box, LayoutGrid, List, Search, ChevronsUpDown, Check, ChevronDown, ChevronUp, Eye, Info } from 'lucide-react';
import { cn, getRoleAvatar } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// DND Kit Imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TaskSchema = z.object({
    title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
    assignedToId: z.string().min(1, "Debe asignar la tarea a un usuario."),
    dueDate: z.date().optional(),
    priority: z.enum(['baja', 'media', 'alta']).default('media'),
    batchIds: z.array(z.string()).optional(),
    materials: z.array(z.object({ 
        supplyId: z.string().min(1, "Debe seleccionar un material."),
        quantity: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
     })).optional(),
});

type TaskFormValues = z.infer<typeof TaskSchema>;


function TaskDetailsDialog({
    task,
    isOpen,
    onClose,
    onUpdateStatus,
    canUpdateStatus,
    isPending,
    assignablePeople = [],
}: {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
    canUpdateStatus: boolean;
    isPending: boolean;
    assignablePeople?: { id: string; name: string; role: string }[];
}) {
    if (!task) return null;

    const priorityInfo = {
        alta: { label: 'Alta Prioridad', color: 'bg-red-500/10 text-red-600 border-red-300 dark:border-red-800' },
        media: { label: 'Prioridad Media', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-300 dark:border-yellow-800' },
        baja: { label: 'Baja Prioridad', color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800' },
    }[task.priority || 'media'];

    const statusInfo = {
        pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-700 border-amber-300' },
        'in-progress': { label: 'En Progreso', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
        completed: { label: 'Completada', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' },
    }[task.status];

    const assignedPerson = assignablePeople.find(u => u.id === task.assignedTo.id);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="w-[95vw] sm:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader className="space-y-2 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs font-semibold", priorityInfo.color)}>
                            {priorityInfo.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs font-semibold", statusInfo.color)}>
                            {statusInfo.label}
                        </Badge>
                        {task.dueDate && (
                            <Badge variant="outline" className={cn("text-xs", isPast(new Date(task.dueDate)) && task.status !== 'completed' ? "bg-red-500/10 text-red-600 border-red-300" : "bg-muted text-muted-foreground")}>
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {isPast(new Date(task.dueDate)) && task.status !== 'completed'
                                    ? `Vencida (${format(new Date(task.dueDate), 'dd/MM/yyyy')})`
                                    : `Vence: ${format(new Date(task.dueDate), 'dd/MM/yyyy')}`
                                }
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className="text-base sm:text-xl font-bold text-foreground leading-snug pt-1">
                        {task.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Lotes asociados */}
                    {((task.batchIds && task.batchIds.length > 0) || task.batchId) && (
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Box className="h-3.5 w-3.5 text-primary" /> Lote(s) de Aplicación
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {(task.batchIds && task.batchIds.length > 0 ? task.batchIds : [task.batchId]).map(id => id && (
                                    <Badge key={id} variant="secondary" className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 font-medium">
                                        Lote: {id}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Descripción completa */}
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Descripción e Instrucciones
                        </span>
                        <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed select-text">
                            {task.description}
                        </div>
                    </div>

                    {/* Materiales e Insumos */}
                    {task.materials && task.materials.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5 text-muted-foreground" /> Insumos / Materiales Requeridos
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {task.materials.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-background border rounded-lg text-xs">
                                        <span className="font-semibold text-foreground truncate pr-2">{m.name}</span>
                                        {m.quantity ? (
                                            <Badge variant="outline" className="text-[10px] bg-muted shrink-0">
                                                {m.quantity} un.
                                            </Badge>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Responsable y Plazo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-muted/20 border rounded-xl flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                    {(assignedPerson?.name || task.assignedTo.name || '?').charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Asignado a</p>
                                <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {assignedPerson?.name || task.assignedTo.name}
                                </p>
                                {assignedPerson?.role && (
                                    <p className="text-[10px] text-muted-foreground truncate">{assignedPerson.role}</p>
                                )}
                            </div>
                        </div>

                        {task.dueDate && (
                            <div className="p-3 bg-muted/20 border rounded-xl flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CalendarIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Plazo de Entrega</p>
                                    <p className="text-xs sm:text-sm font-bold text-foreground">
                                        {format(new Date(task.dueDate), "d 'de' MMMM, yyyy", { locale: es })}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {isPast(new Date(task.dueDate))
                                            ? `Venció hace ${formatDistanceToNow(new Date(task.dueDate), { locale: es })}`
                                            : `Vence en ${formatDistanceToNow(new Date(task.dueDate), { locale: es })}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t mt-2">
                    {canUpdateStatus && (
                        <>
                            {task.status === 'pending' && (
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                    onClick={() => {
                                        onUpdateStatus(task.id, 'in-progress');
                                        onClose();
                                    }}
                                    disabled={isPending}
                                >
                                    <span>Iniciar Tarea</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            )}
                            {task.status === 'in-progress' && (
                                <Button
                                    type="button"
                                    className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                    onClick={() => {
                                        onUpdateStatus(task.id, 'completed');
                                        onClose();
                                    }}
                                    disabled={isPending}
                                >
                                    <Check className="h-4 w-4" />
                                    <span>Completar Tarea</span>
                                </Button>
                            )}
                            {task.status === 'completed' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto flex-1 gap-1.5"
                                    onClick={() => {
                                        onUpdateStatus(task.id, 'in-progress');
                                        onClose();
                                    }}
                                    disabled={isPending}
                                >
                                    <span>Reabrir Tarea</span>
                                </Button>
                            )}
                        </>
                    )}
                    <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const SortableTaskCard = ({ task, isOverlay = false, onViewDetails }: { task: Task, isOverlay?: boolean, onViewDetails?: (task: Task) => void }) => {
    const { users, currentUser, updateTaskStatus, deleteTask } = useContext(AppDataContext);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const assignedUser = users.find(u => u.id === task.assignedTo.id);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const handleUpdateStatus = (newStatus: TaskStatus) => {
        startTransition(() => {
            updateTaskStatus(task.id, newStatus);
            toast({
                title: 'Tarea Actualizada',
                description: `La tarea "${task.title}" se ha movido a "${newStatus === 'in-progress' ? 'En Progreso' : newStatus === 'pending' ? 'Pendiente' : 'Completado'}".`,
            });
        });
    }
    
    const handleDelete = () => {
        startTransition(() => {
            deleteTask(task.id);
            toast({
                title: 'Tarea Eliminada',
                description: `La tarea "${task.title}" ha sido eliminada.`,
                variant: 'destructive'
            });
        });
    }

    const canUpdateStatus = currentUser?.id === task.assignedTo.id || currentUser?.role === 'Productor' || currentUser?.role === 'Encargado' || currentUser?.role === 'SuperAdmin';
    const canDeleteTask = currentUser?.role === 'Productor' || currentUser?.role === 'Encargado' || currentUser?.role === 'SuperAdmin' || currentUser?.id === task.createdBy.id;
    
    const priorityInfo = {
        alta: { label: 'Alta', color: 'bg-red-500', iconColor: 'text-red-500', borderColor: 'border-l-red-500' },
        media: { label: 'Media', color: 'bg-yellow-500', iconColor: 'text-yellow-500', borderColor: 'border-l-yellow-500' },
        baja: { label: 'Baja', color: 'bg-blue-500', iconColor: 'text-blue-500', borderColor: 'border-l-blue-500' },
    }[task.priority || 'media'];

    return (
        <div ref={setNodeRef} style={style} className={cn(isOverlay && "z-50 shadow-2xl scale-105")}>
            <Card 
                {...attributes} 
                {...listeners}
                className={cn("hover:shadow-md transition-shadow relative overflow-hidden group border-l-4 cursor-grab active:cursor-grabbing", priorityInfo.borderColor)}
            >
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle 
                           className="text-sm font-bold flex items-center gap-2 cursor-pointer hover:text-primary transition-colors flex-1"
                           onPointerDown={(e) => e.stopPropagation()}
                           onClick={(e) => {
                               e.stopPropagation();
                               onViewDetails?.(task);
                           }}
                           title="Toca para ver detalles de la tarea"
                        >
                           <Flag className={cn("h-3.5 w-3.5 shrink-0", priorityInfo.iconColor)} />
                           <span className="line-clamp-2">{task.title}</span>
                        </CardTitle>
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isPending}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {onViewDetails && (
                                        <>
                                            <DropdownMenuItem onSelect={() => onViewDetails(task)}>
                                                <Eye className="mr-2 h-4 w-4 text-primary" />
                                                <span>Ver detalles</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuLabel>Mover a</DropdownMenuLabel>
                                    {task.status !== 'pending' && canUpdateStatus && <DropdownMenuItem onSelect={() => handleUpdateStatus('pending')}><ArrowRight className="mr-2 h-4 w-4" />Pendiente</DropdownMenuItem>}
                                    {task.status !== 'in-progress' && canUpdateStatus && <DropdownMenuItem onSelect={() => handleUpdateStatus('in-progress')}><ArrowRight className="mr-2 h-4 w-4" />En Progreso</DropdownMenuItem>}
                                    {task.status !== 'completed' && canUpdateStatus && <DropdownMenuItem onSelect={() => handleUpdateStatus('completed')}><ArrowRight className="mr-2 h-4 w-4" />Completado</DropdownMenuItem>}
                                    {canDeleteTask && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Continuar y Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    {((task.batchIds && task.batchIds.length > 0) || task.batchId) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {(task.batchIds && task.batchIds.length > 0 ? task.batchIds : [task.batchId]).map(id => id && (
                                <Badge key={id} variant="outline" className="text-[10px] py-0 px-1 bg-primary/5 text-primary border-primary/20">
                                    <Box className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                                    Lote: {id}
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pb-3 space-y-2.5">
                    <div>
                        <p className={cn("leading-relaxed transition-all", !isExpanded && "line-clamp-2")}>
                            {task.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5" onPointerDown={(e) => e.stopPropagation()}>
                            {task.description && task.description.length > 70 ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(prev => !prev);
                                    }}
                                    className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                    {isExpanded ? (
                                        <>
                                            <span>Ver menos</span>
                                            <ChevronUp className="h-3 w-3" />
                                        </>
                                    ) : (
                                        <>
                                            <span>Ver más</span>
                                            <ChevronDown className="h-3 w-3" />
                                        </>
                                    )}
                                </button>
                            ) : <div />}

                            {onViewDetails && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetails(task);
                                    }}
                                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:underline ml-auto"
                                    title="Ver todos los detalles"
                                >
                                    <Eye className="h-3 w-3 text-primary" />
                                    <span>Detalles</span>
                                </button>
                            )}
                        </div>
                    </div>
                     {task.materials && task.materials.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Wrench className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                                {task.materials.map((m, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px]">
                                        {m.name}
                                        {m.quantity ? ` (${m.quantity})` : ''}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                {canUpdateStatus && !isOverlay && (
                    <div className="px-4 pb-3 pt-0" onPointerDown={(e) => e.stopPropagation()}>
                        {task.status === 'pending' && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="w-full h-8 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200/80 transition-all flex items-center justify-center gap-1.5 shadow-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus('in-progress');
                                }}
                                disabled={isPending}
                            >
                                <span>Iniciar Tarea</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {task.status === 'in-progress' && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border-dashed shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus('pending');
                                    }}
                                    disabled={isPending}
                                    title="Regresar a Pendiente"
                                >
                                    ←
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="flex-1 h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus('completed');
                                    }}
                                    disabled={isPending}
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Completar Tarea</span>
                                </Button>
                            </div>
                        )}
                        {task.status === 'completed' && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center gap-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus('in-progress');
                                }}
                                disabled={isPending}
                            >
                                <span>Reabrir tarea</span>
                            </Button>
                        )}
                    </div>
                )}
                 <CardFooter className="flex justify-between items-center text-[10px] pb-3">
                        <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={assignedUser ? getRoleAvatar(assignedUser.role) : undefined} />
                                <AvatarFallback className="text-[10px]">{(assignedUser?.name || task.assignedTo?.name || '?').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-muted-foreground">{assignedUser?.name || task.assignedTo?.name}</span>
                        </div>
                        {task.status === 'completed' ? (
                            <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="h-3 w-3" />
                                <span>Completada</span>
                            </div>
                        ) : task.dueDate ? (
                            <div className={cn("flex items-center gap-1", isPast(new Date(task.dueDate)) ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                <CalendarIcon className="h-3 w-3" />
                                <span>{isPast(new Date(task.dueDate)) ? 'Vencida hace ' + formatDistanceToNow(new Date(task.dueDate), { locale: es }) : 'Vence en ' + formatDistanceToNow(new Date(task.dueDate), { locale: es })}</span>
                            </div>
                        ) : null}
                    </CardFooter>
            </Card>
        </div>
    )
}

const KanbanColumn = ({ id, title, tasks, onViewDetails }: { id: TaskStatus, title: string, tasks: Task[], onViewDetails?: (task: Task) => void }) => {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <Card ref={setNodeRef} className="bg-muted/30 border-none shadow-none flex flex-col min-h-[500px]">
            <CardHeader className="py-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                        {title}
                        <Badge variant="secondary" className="rounded-full h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                            {tasks.length}
                        </Badge>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-2 space-y-3">
                <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.length > 0 ? (
                        tasks.map(task => <SortableTaskCard key={task.id} task={task} onViewDetails={onViewDetails} />)
                    ) : (
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl h-32 flex flex-col items-center justify-center bg-muted/10">
                            <p className="text-sm text-muted-foreground font-medium">Arrastra una tarea aquí</p>
                        </div>
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    );
}

export default function TasksPage() {
    const { tasks, users, currentUser, addTask, updateTaskStatus, supplies, batches, collectors, packers } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [filterType, setFilterType] = useState('all');
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(TaskSchema),
        defaultValues: { title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', batchIds: [], materials: [{supplyId: '', quantity: 0}] },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "materials"
    });

    if (!currentUser) return null;
    const canCreateTasks = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Encargado' || currentUser.role === 'SuperAdmin';

    const assignablePeople = useMemo(() => {
        const list: { id: string; name: string; role: string }[] = [];
        (users || []).forEach(u => list.push({ id: u.id, name: u.name, role: u.role }));
        (collectors || []).forEach(c => {
            if (!list.some(item => item.id === c.id)) {
                list.push({ id: c.id, name: c.name, role: 'Recolector' });
            }
        });
        (packers || []).forEach(p => {
            if (!list.some(item => item.id === p.id)) {
                list.push({ id: p.id, name: p.name, role: 'Embalador' });
            }
        });
        return list;
    }, [users, collectors, packers]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filterType === 'my-tasks' && task.assignedTo.id !== currentUser.id) return false;
            if (filterType === 'high-priority' && task.priority !== 'alta') return false;
            if (filterType === 'overdue' && (task.status === 'completed' || !task.dueDate || !isPast(new Date(task.dueDate)))) return false;
            if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [tasks, filterType, currentUser, searchQuery]);

    const categorizedTasks = useMemo(() => {
        const pending: Task[] = [];
        const inProgress: Task[] = [];
        const completed: Task[] = [];

        filteredTasks.forEach(task => {
            if (task.status === 'in-progress') inProgress.push(task);
            else if (task.status === 'completed') completed.push(task);
            else pending.push(task);
        });

        return { pending, inProgress, completed };
    }, [filteredTasks]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveTask(task);
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the status of the drop target
        let newStatus: TaskStatus | null = null;
        if (['pending', 'in-progress', 'completed'].includes(overId)) {
            newStatus = overId as TaskStatus;
        } else {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) newStatus = overTask.status;
        }

        const activeTask = tasks.find(t => t.id === activeId);
        
        if (activeTask && newStatus && activeTask.status !== newStatus) {
            startTransition(() => {
                updateTaskStatus(activeId, newStatus);
                toast({
                    title: 'Tarea Movida',
                    description: `Estado actualizado a ${newStatus === 'in-progress' ? 'En Progreso' : newStatus === 'pending' ? 'Pendiente' : 'Completado'}.`,
                });
            });
        }
    }

    const onAddTask = (values: TaskFormValues) => {
        const assignedPerson = assignablePeople.find(u => u.id === values.assignedToId);
        if (!assignedPerson || !currentUser) return;
        
        startTransition(() => {
            const validMaterials = values.materials
                ?.filter(m => m.supplyId && m.quantity > 0)
                .map(m => {
                    const supply = supplies.find(s => s.id === m.supplyId);
                    return {
                        supplyId: m.supplyId,
                        name: supply?.name || 'Desconocido',
                        quantity: m.quantity
                    };
                });

            const taskPayload: Omit<Task, 'id'> = {
                title: values.title,
                description: values.description,
                assignedTo: { id: assignedPerson.id, name: assignedPerson.name },
                createdBy: { id: currentUser.id, name: currentUser.name },
                status: 'pending',
                priority: values.priority,
                createdAt: new Date().toISOString(),
            };

            if (values.batchIds && values.batchIds.length > 0) {
                taskPayload.batchIds = values.batchIds;
            }
            if (validMaterials && validMaterials.length > 0) {
                taskPayload.materials = validMaterials;
            }
            if (values.dueDate) {
                taskPayload.dueDate = values.dueDate.toISOString();
            }

            addTask(taskPayload);
            toast({ title: "Tarea Creada", description: `La tarea "${values.title}" ha sido asignada a ${assignedPerson.name}.` });
            setIsAddDialogOpen(false);
            form.reset({ title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', batchIds: [], materials: [{supplyId: '', quantity: 0}] });
        });
    }

  return (
    <>
      <PageHeader
        title="Gestión de Tareas"
        description="Cree, asigne y siga el progreso de las tareas mediante el tablero interactivo."
      >
        {canCreateTasks && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="default" className="shadow-sm">Crear Nueva Tarea</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Tarea</DialogTitle>
                        <DialogDescription>Complete los detalles para asignar una nueva tarea al equipo.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onAddTask)} className="space-y-4 overflow-y-auto pr-6 flex-grow py-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="Ej. Revisar riego en Lote 005" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción de la Tarea</FormLabel><FormControl><Textarea {...field} placeholder="Proporcione instrucciones detalladas..." className="min-h-32" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="assignedToId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Responsable</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un responsable" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {assignablePeople.map(person => (
                                                    <SelectItem key={person.id} value={person.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{person.name}</span>
                                                            <span className="text-[11px] text-muted-foreground">({person.role})</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="batchIds" render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end">
                                        <FormLabel className="mb-2">Vincular a Lotes (Opcional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("justify-between w-full font-normal", !(field.value && field.value.length > 0) && "text-muted-foreground")} disabled={isPending}>
                                                        {field.value && field.value.length > 0 ? `${field.value.length} lote(s) seleccionado(s)` : "Seleccionar lotes"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-2">
                                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                                    {batches.map(batch => (
                                                        <div key={batch.id} className="flex items-center space-x-2 p-1 hover:bg-muted rounded cursor-pointer" onClick={() => {
                                                            const current = field.value || [];
                                                            const isSelected = current.includes(batch.id);
                                                            field.onChange(isSelected ? current.filter(id => id !== batch.id) : [...current, batch.id]);
                                                        }}>
                                                            <div className={cn("flex h-4 w-4 items-center justify-center rounded-sm border border-primary", (field.value || []).includes(batch.id) ? "bg-primary text-primary-foreground" : "opacity-50")}>
                                                                {(field.value || []).includes(batch.id) && <Check className="h-3 w-3" />}
                                                            </div>
                                                            <span className="text-sm">Lote {batch.id}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Límite</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isPending}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Sin fecha límite</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="priority" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prioridad</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="baja">Baja</SelectItem>
                                                <SelectItem value="media">Media</SelectItem>
                                                <SelectItem value="alta">Alta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <FormLabel className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4" /> Esenciales e Insumos (Opcional)
                                </FormLabel>
                                {fields.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`materials.${index}.supplyId`}
                                            render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione insumo..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {supplies.map(supply => <SelectItem key={supply.id} value={supply.id}>{supply.name} ({supply.stock} und.)</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`materials.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl><Input type="number" {...field} placeholder="Cant." className="w-20" disabled={isPending} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ supplyId: '', quantity: 0 })} disabled={isPending} className="w-full border-dashed"><PlusCircle className="mr-2 h-4 w-4" />Añadir Insumo Requerido</Button>
                            </div>
                            <DialogFooter className="pt-6">
                                <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={isPending} className="min-w-32">{isPending ? "Agendando..." : "Asignar Tarea"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}
      </PageHeader>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 mt-4">
          <div className="flex flex-wrap gap-2">
              <Badge variant={filterType === 'all' ? 'default' : 'secondary'} className="cursor-pointer text-xs py-1" onClick={() => setFilterType('all')}>Todas</Badge>
              <Badge variant={filterType === 'my-tasks' ? 'default' : 'secondary'} className="cursor-pointer text-xs py-1" onClick={() => setFilterType('my-tasks')}>Mis Tareas</Badge>
              <Badge variant={filterType === 'high-priority' ? 'default' : 'secondary'} className="cursor-pointer text-xs py-1" onClick={() => setFilterType('high-priority')}>Alta Prioridad</Badge>
              <Badge variant={filterType === 'overdue' ? 'default' : 'outline'} className="cursor-pointer text-xs py-1 text-red-600 border-red-200" onClick={() => setFilterType('overdue')}>Atrasadas</Badge>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Buscar tareas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex bg-background rounded-md p-1 border shadow-sm">
                  <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setViewMode('board')}><LayoutGrid className="h-4 w-4" /></Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
              </div>
          </div>
      </div>

      <div className="flex-grow">
        {viewMode === 'board' ? (
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KanbanColumn id="pending" title="Pendiente" tasks={categorizedTasks.pending} onViewDetails={setSelectedTaskDetail} />
                <KanbanColumn id="in-progress" title="En Progreso" tasks={categorizedTasks.inProgress} onViewDetails={setSelectedTaskDetail} />
                <KanbanColumn id="completed" title="Completado" tasks={categorizedTasks.completed} onViewDetails={setSelectedTaskDetail} />
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.4',
                        },
                    },
                }),
            }}>
                {activeTask ? (
                    <SortableTaskCard task={activeTask} isOverlay />
                ) : null}
            </DragOverlay>
        </DndContext>
        ) : (
            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 font-medium text-muted-foreground">Tarea</th>
                                <th className="p-4 font-medium text-muted-foreground">Estado</th>
                                <th className="p-4 font-medium text-muted-foreground">Prioridad</th>
                                <th className="p-4 font-medium text-muted-foreground">Responsable</th>
                                <th className="p-4 font-medium text-muted-foreground">Vencimiento</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredTasks.length > 0 ? filteredTasks.map(task => (
                                <tr key={task.id} className="hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setSelectedTaskDetail(task)}>
                                    <td className="p-4 font-medium flex items-center gap-2">
                                        <Flag className={cn("h-4 w-4 flex-shrink-0", task.priority === 'alta' ? 'text-red-500' : task.priority === 'media' ? 'text-yellow-500' : 'text-blue-500')} />
                                        <span className="truncate max-w-[200px] sm:max-w-xs">{task.title}</span>
                                    </td>
                                    <td className="p-4"><Badge variant="secondary">{task.status === 'in-progress' ? 'En Progreso' : task.status === 'completed' ? 'Completado' : 'Pendiente'}</Badge></td>
                                    <td className="p-4"><Badge variant="outline" className={task.priority === 'alta' ? 'text-red-500 border-red-200' : ''}>{task.priority}</Badge></td>
                                    <td className="p-4 flex items-center gap-2">
                                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{(assignablePeople.find(u => u.id === task.assignedTo.id)?.name || task.assignedTo.name || '?').charAt(0)}</AvatarFallback></Avatar>
                                        <span className="truncate max-w-[120px]">{assignablePeople.find(u => u.id === task.assignedTo.id)?.name || task.assignedTo.name}</span>
                                    </td>
                                    <td className="p-4">
                                        {task.status === 'completed' ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                                <Check className="h-3.5 w-3.5" /> Completada
                                            </span>
                                        ) : task.dueDate ? (
                                            <span className={isPast(new Date(task.dueDate)) ? 'text-red-500 font-medium' : ''}>
                                                {new Date(task.dueDate).toLocaleDateString()}
                                                {isPast(new Date(task.dueDate)) && ' (Vencida)'}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTaskDetail(task);
                                            }}
                                            className="h-7 px-2 text-xs text-primary gap-1"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Detalles</span>
                                        </Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No se encontraron tareas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        )}
      </div>

      <TaskDetailsDialog
          task={selectedTaskDetail}
          isOpen={!!selectedTaskDetail}
          onClose={() => setSelectedTaskDetail(null)}
          onUpdateStatus={(taskId, newStatus) => {
              updateTaskStatus(taskId, newStatus);
              setSelectedTaskDetail(prev => prev && prev.id === taskId ? { ...prev, status: newStatus } : null);
              toast({
                  title: 'Tarea Actualizada',
                  description: `Estado actualizado a ${newStatus === 'in-progress' ? 'En Progreso' : newStatus === 'pending' ? 'Pendiente' : 'Completado'}.`,
              });
          }}
          canUpdateStatus={
              selectedTaskDetail 
                  ? Boolean(currentUser?.id === selectedTaskDetail.assignedTo.id || currentUser?.role === 'Productor' || currentUser?.role === 'Encargado' || currentUser?.role === 'SuperAdmin')
                  : false
          }
          isPending={isPending}
          assignablePeople={assignablePeople}
      />
    </>
  );
}
