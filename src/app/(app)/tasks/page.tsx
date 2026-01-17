

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
import { Calendar as CalendarIcon, MoreHorizontal, ArrowRight, Flag, Wrench, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const TaskSchema = z.object({
    title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
    assignedToId: z.string().min(1, "Debe asignar la tarea a un usuario."),
    dueDate: z.date().optional(),
    priority: z.enum(['baja', 'media', 'alta']).default('media'),
    materials: z.array(z.object({ 
        supplyId: z.string().min(1, "Debe seleccionar un material."),
        quantity: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0."),
     })).optional(),
});


type TaskFormValues = z.infer<typeof TaskSchema>;

const TaskCard = ({ task }: { task: Task }) => {
    const { users, currentUser, updateTaskStatus, deleteTask } = useContext(AppDataContext);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const assignedUser = users.find(u => u.id === task.assignedTo.id);

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
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                       <Flag className={cn("h-4 w-4", priorityInfo.iconColor)} />
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
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground pb-4 space-y-3">
                <p>{task.description}</p>
                 {task.materials && task.materials.length > 0 && (
                    <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                            {task.materials.map((m, i) => <Badge key={i} variant="secondary">{m.name}: {m.quantity} kg/L</Badge>)}
                        </div>
                    </div>
                )}
            </CardContent>
             <CardFooter className="flex justify-between items-center text-xs pb-4">
                     {assignedUser && (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={`https://picsum.photos/seed/${assignedUser.avatar}/24/24`} />
                                <AvatarFallback>{assignedUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{assignedUser.name}</span>
                        </div>
                    )}
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                        </div>
                    )}
                </CardFooter>
        </Card>
    )
}

export default function TasksPage() {
    const { tasks, users, currentUser, addTask, supplies } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(TaskSchema),
        defaultValues: { title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', materials: [{supplyId: '', quantity: 0}] },
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
                materials: validMaterials,
                createdAt: new Date().toISOString(),
                dueDate: values.dueDate?.toISOString(),
            });
            toast({ title: "Tarea Creada", description: `La tarea "${values.title}" ha sido asignada a ${assignedToUser.name}.` });
            setIsAddDialogOpen(false);
            form.reset({ title: '', description: '', assignedToId: '', dueDate: undefined, priority: 'media', materials: [{supplyId: '', quantity: 0}] });
        });
    }

  return (
    <>
      <PageHeader
        title="Gestión de Tareas"
        description="Cree, asigne y siga el progreso de las tareas del equipo."
      >
        {canCreateTasks && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button>Crear Nueva Tarea</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Tarea</DialogTitle>
                        <DialogDescription>Complete los detalles para asignar una nueva tarea.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onAddTask)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-6">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} placeholder="Ej. Revisar riego en Lote 005" disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} placeholder="Añadir detalles sobre la tarea..." disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="assignedToId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Asignar a</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un usuario" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {assignableUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha Límite</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isPending}>
                                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Opcional</span>}
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
                            <div className="space-y-4">
                                <FormLabel>Materiales Necesarios (Opcional)</FormLabel>
                                {fields.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`materials.${index}.supplyId`}
                                            render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un insumo..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {supplies.map(supply => <SelectItem key={supply.id} value={supply.id}>{supply.name} ({supply.stock} disp.)</SelectItem>)}
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
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ supplyId: '', quantity: 0 })} disabled={isPending}><PlusCircle className="mr-2 h-4 w-4" />Añadir Material</Button>
                            </div>
                            <DialogFooter className="pt-4">
                                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={isPending}>{isPending ? "Creando..." : "Crear Tarea"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-muted/30">
          <CardHeader><CardTitle>Pendiente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categorizedTasks.pending.length > 0 ? (
                categorizedTasks.pending.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay tareas pendientes.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader><CardTitle>En Progreso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categorizedTasks.inProgress.length > 0 ? (
                categorizedTasks.inProgress.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay tareas en progreso.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader><CardTitle>Completado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {categorizedTasks.completed.length > 0 ? (
                categorizedTasks.completed.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No hay tareas completadas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
