
'use client';

import React, { useContext, useMemo, useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar as CalendarIcon, MoreHorizontal, ArrowRight, Flag, Wrench, PlusCircle, Trash2, GripVertical, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    batchId: z.string().optional(),
    materials: z.array(z.object({ 
        supplyId: z.string().min(1, "Debe seleccionar un material."),
        quantity: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
     })).optional(),
});

type TaskFormValues = z.infer<typeof TaskSchema>;

const SortableTaskCard = ({ task, isOverlay = false }: { task: Task, isOverlay?: boolean }) => {
    const { users, currentUser, updateTaskStatus, deleteTask } = useContext(AppDataContext);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
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

    const canUpdateStatus = currentUser?.id === task.assignedTo.id || currentUser?.role === 'Productor';
    const canDeleteTask = currentUser?.role === 'Productor' || currentUser?.id === task.createdBy.id;
    
    const priorityInfo = {
        alta: { label: 'Alta', color: 'bg-red-500', iconColor: 'text-red-500' },
        media: { label: 'Media', color: 'bg-yellow-500', iconColor: 'text-yellow-500' },
        baja: { label: 'Baja', color: 'bg-blue-500', iconColor: 'text-blue-500' },
    }[task.priority || 'media'];

    return (
        <div ref={setNodeRef} style={style} className={cn(isOverlay && "z-50 shadow-2xl scale-105")}>
            <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
                <div 
                    {...attributes} 
                    {...listeners}
                    className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardHeader className="pl-10 pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                           <Flag className={cn("h-3.5 w-3.5", priorityInfo.iconColor)} />
                           {task.title}
                        </CardTitle>
                        <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isPending}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
                    {task.batchId && (
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 bg-primary/5 text-primary border-primary/20">
                                <Box className="h-2.5 w-2.5 mr-1" />
                                Lote: {task.batchId}
                            </Badge>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="pl-10 text-xs text-muted-foreground pb-4 space-y-3">
                    <p className="line-clamp-2">{task.description}</p>
                     {task.materials && task.materials.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Wrench className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                                {task.materials.map((m, i) => <Badge key={i} variant="secondary" className="text-[10px]">{m.name}</Badge>)}
                            </div>
                        </div>
                    )}
                </CardContent>
                 <CardFooter className="pl-10 flex justify-between items-center text-[10px] pb-3">
                         {assignedUser && (
                            <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={`https://picsum.photos/seed/${assignedUser.avatar}/20/20`} />
                                    <AvatarFallback className="text-[10px]">{assignedUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-muted-foreground">{assignedUser.name}</span>
                            </div>
                        )}
                        {task.dueDate && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                            </div>
                        )}
                    </CardFooter>
            </Card>
        </div>
    )
}

const KanbanColumn = ({ id, title, tasks }: { id: TaskStatus, title: string, tasks: Task[] }) => {
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
                        tasks.map(task => <SortableTaskCard key={task.id} task={task} />)
                    ) : (
                        <div className="border-2 border-dashed border-muted rounded-lg h-32 flex items-center justify-center">
                            <p className="text-xs text-muted-foreground font-medium">Vacío</p>
                        </div>
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    );
}

export default function TasksPage() {
    const { tasks, users, currentUser, addTask, updateTaskStatus, supplies, batches } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(TaskSchema),
        defaultValues: { title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', batchId: undefined, materials: [{supplyId: '', quantity: 0}] },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "materials"
    });

    if (!currentUser) return null;
    const canCreateTasks = currentUser.role === 'Productor' || currentUser.role === 'Ingeniero Agronomo';

    const assignableUsers = users;

    const categorizedTasks = useMemo(() => {
        const pending: Task[] = [];
        const inProgress: Task[] = [];
        const completed: Task[] = [];

        tasks.forEach(task => {
            if (task.status === 'in-progress') inProgress.push(task);
            else if (task.status === 'completed') completed.push(task);
            else pending.push(task);
        });

        return { pending, inProgress, completed };
    }, [tasks]);

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
        const assignedToUser = users.find(u => u.id === values.assignedToId);
        if (!assignedToUser || !currentUser) return;
        
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

            addTask({
                title: values.title,
                description: values.description,
                assignedTo: { id: assignedToUser.id, name: assignedToUser.name },
                createdBy: { id: currentUser.id, name: currentUser.name },
                status: 'pending',
                priority: values.priority,
                batchId: values.batchId === 'none' ? undefined : values.batchId,
                materials: validMaterials,
                createdAt: new Date().toISOString(),
                dueDate: values.dueDate?.toISOString(),
            });
            toast({ title: "Tarea Creada", description: `La tarea "${values.title}" ha sido asignada a ${assignedToUser.name}.` });
            setIsAddDialogOpen(false);
            form.reset({ title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', batchId: undefined, materials: [{supplyId: '', quantity: 0}] });
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
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un usuario" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {assignableUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="batchId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vincular a Lote (Opcional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={isPending}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Sin lote vinculado" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Sin lote vinculado</SelectItem>
                                                {batches.map(batch => <SelectItem key={batch.id} value={batch.id}>Lote {batch.id}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
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

      <div className="flex-grow">
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KanbanColumn id="pending" title="Pendiente" tasks={categorizedTasks.pending} />
                <KanbanColumn id="in-progress" title="En Progreso" tasks={categorizedTasks.inProgress} />
                <KanbanColumn id="completed" title="Completado" tasks={categorizedTasks.completed} />
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
      </div>
    </>
  );
}
