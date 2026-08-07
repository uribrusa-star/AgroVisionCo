'use client';

import React, { useState, useContext, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, KeyRound, Plus, ShieldAlert, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { PageHeader } from "@/components/page-header";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

const PasswordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const CreateUserSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  role: z.enum(['Ingeniero Agronomo', 'Encargado']),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export default function UsersPage() {
  const { users, currentUser, loading, updateUserPassword } = useContext(AppDataContext);
  const { toast } = useToast();
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const createForm = useForm<z.infer<typeof CreateUserSchema>>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { name: '', role: 'Encargado', password: '' },
  });
  
  const selectedRole = createForm.watch('role');

  if (currentUser?.role !== 'Productor') {
    return (
        <>
            <PageHeader title="Usuarios" description="Gestión de usuarios del sistema." />
            <Card>
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Solo el rol de 'Productor' puede gestionar usuarios.</p>
                </CardContent>
            </Card>
        </>
    );
  }

  const handleOpenPasswordDialog = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset();
    setIsPasswordDialogOpen(true);
  }

  const handleOpenDetails = (user: User) => {
    setDetailsUser(user);
    setIsDetailsDialogOpen(true);
  };
  
  const onPasswordSubmit = (values: z.infer<typeof PasswordSchema>) => {
    if(!selectedUser) return;

    startTransition(async () => {
      try {
        await updateUserPassword(selectedUser.id, values.newPassword);
        toast({
          title: "Contraseña Actualizada",
          description: `La contraseña para ${selectedUser.name} ha sido cambiada.`,
        });
        setIsPasswordDialogOpen(false);
        setSelectedUser(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la contraseña.",
          variant: "destructive",
        });
      }
    });
  }

  const onCreateSubmit = (values: z.infer<typeof CreateUserSchema>) => {
    startTransition(async () => {
      try {
        let targetEstablishmentId = currentUser.establishmentId;
        
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            role: values.role,
            password: values.password,
            producerId: currentUser.id,
            establishmentId: targetEstablishmentId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo crear el usuario');
        }

        toast({
          title: "Usuario Creado",
          description: `${values.name} ha sido agregado exitosamente. Su correo de acceso es: ${data.email}`,
        });
        
        setIsCreateDialogOpen(false);
        createForm.reset();
        
      } catch (error: any) {
        toast({
          title: "Error al crear usuario",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <PageHeader title="Usuarios" description="Vea y gestione los usuarios del sistema." />
          <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Empleado
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Usuarios</CardTitle>
          <CardDescription>Una lista de todas las cuentas de usuario en su organización.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          
          {/* Vista en tarjetas (Móvil y Escritorio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-muted/20">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`mob-skel-${i}`} className="h-20 w-full rounded-xl" />
              ))}
              {!loading && users.map((user) => (
                  <div 
                      key={`mob-${user.id}`} 
                      onClick={() => handleOpenDetails(user)} 
                      className="bg-card border border-border/60 rounded-xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                      <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                              <AvatarImage src={user.avatar?.startsWith('http') ? user.avatar : `https://picsum.photos/seed/${user.avatar}/40/40`} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                              <h3 className="font-bold text-foreground text-base leading-tight">{user.name}</h3>
                              <Badge variant={user.role === 'Productor' ? 'default' : 'secondary'} className="mt-1.5 text-[10px]">
                                  {user.role}
                              </Badge>
                          </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                          {user.role !== 'Productor' && (
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                          <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => handleOpenPasswordDialog(user)}>
                                          <KeyRound className="mr-2 h-4 w-4" />
                                          Cambiar Contraseña
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          )}
                      </div>
                  </div>
              ))}
          </div>


        </CardContent>
      </Card>
      
      {/* Dialog for user details */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                  <DialogTitle className="text-center">Perfil de Usuario</DialogTitle>
              </DialogHeader>
              {detailsUser && (
                  <div className="flex flex-col items-center gap-4 py-6">
                      <Avatar className="h-28 w-28 border-4 border-muted shadow-lg">
                          <AvatarImage src={detailsUser.avatar?.startsWith('http') ? detailsUser.avatar : `https://picsum.photos/seed/${detailsUser.avatar}/120/120`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-4xl">{detailsUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-center space-y-1">
                          <h3 className="font-bold text-2xl text-foreground">{detailsUser.name}</h3>
                          <p className="text-muted-foreground text-sm">{detailsUser.email || 'Sin correo registrado'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full mt-4">
                          <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Rol Asignado</p>
                              <Badge variant={detailsUser.role === 'Productor' ? 'default' : 'secondary'} className="px-3 py-1">
                                  {detailsUser.role}
                              </Badge>
                          </div>
                          <div className="bg-green-500/5 p-4 rounded-xl text-center border border-green-500/10">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Estado</p>
                              <p className="font-bold text-green-600 flex items-center justify-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                  Activo
                              </p>
                          </div>
                      </div>
                      {detailsUser.lastLoginAt && (
                          <div className="bg-muted/30 border border-border/50 p-3 rounded-lg w-full flex items-center justify-center gap-2 mt-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                  Última conexión: <span className="font-semibold text-foreground">{formatDistanceToNow(new Date(detailsUser.lastLoginAt), { addSuffix: true, locale: es })}</span>
                              </p>
                          </div>
                      )}
                  </div>
              )}
          </DialogContent>
      </Dialog>

      {/* Dialog for password change */}
       <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cambiar Contraseña para {selectedUser?.name}</DialogTitle>
                <DialogDescription>
                    Ingrese una nueva contraseña para la cuenta de este usuario.
                </DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                     <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nueva Contraseña</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Guardando..." : "Guardar Contraseña"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating staff / producer */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Agregar Nuevo Empleado</DialogTitle>
                <DialogDescription>
                    Crea una cuenta para que un Ingeniero o Encargado acceda a tu establecimiento.
                </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                     <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder={selectedRole === 'Productor' ? "Ej. Juan - Productor 03" : "Ej. Juan Pérez"} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={createForm.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rol de Usuario</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un rol" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Encargado">Encargado</SelectItem>
                                        <SelectItem value="Ingeniero Agronomo">Ingeniero Agrónomo</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contraseña (Mínimo 6 caracteres)</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creando..." : "Crear Cuenta"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}