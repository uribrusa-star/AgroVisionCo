'use client';

import React, { useState, useContext, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, KeyRound, Plus, ShieldAlert, Clock, Search, QrCode, Phone, Activity, History, Sprout, Package, Scissors, UserX, CheckCircle2 } from 'lucide-react';
import { QRScannerDialog } from '@/components/qr-scanner-dialog';
import QRCode from 'react-qr-code';
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
  dni: z.string().optional(),
  phone: z.string().optional(),
});

export default function UsersPage() {
  const { users, currentUser, loading, updateUserPassword, auditLogs } = useContext(AppDataContext);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const { toast } = useToast();
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.dni && u.dni.includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }, [users, searchQuery]);


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
  

  const handleScanSuccess = (decodedText: string) => {
    let scannedId = '';
    let scannedEmail = '';

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id) scannedId = parsed.id;
      if (parsed.email) scannedEmail = parsed.email;
    } catch {
      scannedId = decodedText.trim();
    }

    const matched = users.find(u => 
      u.id === scannedId || 
      (scannedEmail && u.email?.toLowerCase() === scannedEmail.toLowerCase())
    );

    if (matched) {
      setDetailsUser(matched);
      setIsDetailsDialogOpen(true);
      setIsQRScannerOpen(false);
      toast({
        title: "Usuario Reconocido",
        description: `Accediendo al perfil y auditoría de ${matched.name}.`,
      });
    } else {
      toast({
        title: "Código no reconocido",
        description: "El QR escaneado no corresponde a ningún usuario del establecimiento.",
        variant: "destructive"
      });
    }
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
            dni: values.dni,
            phone: values.phone,
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
          <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsQRScannerOpen(true)}
                className="gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <QrCode className="h-4 w-4" />
                Escanear Credencial
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Empleado
              </Button>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Usuarios</CardTitle>
          <CardDescription>Una lista de todas las cuentas de usuario en su organización.</CardDescription>
        </CardHeader>
                <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card shadow-xs"
            />
          </div>
        </div>
        <CardContent className="p-0 sm:p-6">
          
          {/* Vista en tarjetas (Móvil y Escritorio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-muted/20">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`mob-skel-${i}`} className="h-20 w-full rounded-xl" />
              ))}
              {!loading && filteredUsers.map((user) => (
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
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                  <DialogTitle className="text-center font-bold text-lg">Credencial y Ficha de Usuario</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    Detalles de la cuenta y registro auditable de acciones realizadas.
                  </DialogDescription>
              </DialogHeader>
              {detailsUser && (() => {
                const userActions = (auditLogs || [])
                  .filter(log => log.userId === detailsUser.id || log.userName.toLowerCase() === detailsUser.name.toLowerCase())
                  .slice(0, 10);

                return (
                  <div className="flex flex-col items-center gap-4 py-2">
                      <div className="flex flex-col sm:flex-row items-center gap-5 w-full bg-muted/20 p-4 rounded-xl border">
                          <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md shrink-0">
                              <AvatarImage src={detailsUser.avatar?.startsWith('http') ? detailsUser.avatar : `https://picsum.photos/seed/${detailsUser.avatar}/120/120`} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">{detailsUser.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="text-center sm:text-left flex-1 min-w-0">
                              <div className="flex items-center justify-center sm:justify-start gap-2">
                                <h3 className="font-bold text-xl text-foreground truncate">{detailsUser.name}</h3>
                                <Badge variant={detailsUser.role === 'Productor' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                                    {detailsUser.role}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs truncate mt-0.5">{detailsUser.email || 'Sin correo registrado'}</p>
                              {detailsUser.dni && (
                                <p className="text-muted-foreground text-xs">DNI: <span className="font-mono font-medium text-foreground">{detailsUser.dni}</span></p>
                              )}
                              {detailsUser.phone && (
                                <p className="text-muted-foreground text-xs">Teléfono: <span className="font-medium text-foreground">{detailsUser.phone}</span></p>
                              )}
                          </div>
                          <div className="flex flex-col items-center bg-white p-2 rounded-xl border border-border shadow-xs shrink-0">
                              <QRCode
                                value={JSON.stringify({ agroVistaUser: true, id: detailsUser.id, name: detailsUser.name, role: detailsUser.role, email: detailsUser.email })}
                                size={85}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox="0 0 256 256"
                              />
                              <span className="text-[9px] font-mono text-muted-foreground mt-1">QR DE ACCESO</span>
                          </div>
                      </div>

                      {detailsUser.lastLoginAt && (
                          <div className="bg-muted/40 border p-2.5 rounded-lg w-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              <span>Última conexión activa: <strong className="text-foreground">{formatDistanceToNow(new Date(detailsUser.lastLoginAt), { addSuffix: true, locale: es })}</strong></span>
                          </div>
                      )}

                      {/* Historial de Auditoría: Últimas 10 acciones realizadas */}
                      <div className="w-full mt-1 space-y-2.5">
                          <div className="flex items-center justify-between border-b pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <History className="h-4 w-4 text-primary" /> Últimas 10 Acciones Realizadas
                              </h4>
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                {userActions.length} registradas
                              </span>
                          </div>

                          {userActions.length === 0 ? (
                              <div className="text-center py-6 px-4 border border-dashed rounded-xl bg-muted/10 text-muted-foreground space-y-1">
                                  <Activity className="h-6 w-6 mx-auto opacity-40 mb-1" />
                                  <p className="text-xs font-medium">Sin acciones registradas recientemente</p>
                                  <p className="text-[11px] text-muted-foreground/80">Cuando el usuario registre cosechas, embalajes, labores o gestione cuadrillas, aparecerán aquí.</p>
                              </div>
                          ) : (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {userActions.map((act) => {
                                    const getActionBadge = () => {
                                      switch(act.category) {
                                        case 'harvest':
                                          return <span className="p-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Sprout className="h-3.5 w-3.5" /></span>;
                                        case 'packaging':
                                          return <span className="p-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Package className="h-3.5 w-3.5" /></span>;
                                        case 'cultural':
                                          return <span className="p-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Scissors className="h-3.5 w-3.5" /></span>;
                                        case 'staff':
                                          return <span className="p-1 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><UserX className="h-3.5 w-3.5" /></span>;
                                        default:
                                          return <span className="p-1 rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"><Activity className="h-3.5 w-3.5" /></span>;
                                      }
                                    };

                                    return (
                                      <div key={act.id} className="flex items-start gap-2.5 p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors text-xs">
                                        <div className="shrink-0 mt-0.5">{getActionBadge()}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-foreground truncate">{act.action}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                                              {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: es })}
                                            </span>
                                          </div>
                                          <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">{act.description}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>
                );
              })()}
          </DialogContent>
      </Dialog>

      <QRScannerDialog
        isOpen={isQRScannerOpen}
        onOpenChange={setIsQRScannerOpen}
        onScanSuccess={handleScanSuccess}
        title="Escanear Credencial de Usuario"
        description="Apunte la cámara a la credencial digital de un usuario para consultar su perfil y últimas 10 actividades registradas."
      />

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