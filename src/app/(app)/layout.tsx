'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HardHat, Leaf, LayoutDashboard, Check, Loader2, PackageSearch, Menu, Building, LogOut, LineChart, Map, KeyRound, Package, BookUser, ClipboardCheck, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { StrawberryIcon, NotebookPen } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppDataContext } from '@/context/app-data-context.tsx';
import { ConnectivityBanner } from '@/components/connectivity-banner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"


const allNavItems = [
  { href: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/establishment', label: 'Establecimiento', icon: Building, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/map', label: 'Mapa', icon: Map, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/tasks', label: 'Tareas', icon: ClipboardCheck, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/engineer-log', label: 'Bitácora del Agrónomo', icon: Leaf, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/predictions', label: 'Predicciones', icon: LineChart, roles: ['Productor', 'Ingeniero Agronomo'] },
  { href: '/data-entry', label: 'Entrada de Datos', icon: StrawberryIcon, roles: ['Productor', 'Encargado'] },
  { href: '/producer-log', label: 'Bitácora del Productor', icon: NotebookPen, roles: ['Productor'] },
  { href: '/collectors', label: 'Recolectores', icon: HardHat, roles: ['Productor', 'Encargado'] },
  { href: '/packers', label: 'Embaladores', icon: Package, roles: ['Productor', 'Encargado'] },
  { href: '/users', label: 'Usuarios', icon: BookUser, roles: ['Productor'] },
];

const PasswordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

const ProfileSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Por favor, ingrese un correo válido.").optional(),
  notificationEmail: z.string().email("Por favor, ingrese un correo de notificación válido.").or(z.literal("")).optional(),
});


function UserMenu() {
  const { currentUser, setCurrentUser, updateUserPassword, updateUserProfile } = React.useContext(AppDataContext);
  const router = useRouter();
  const { toast } = useToast();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const profileForm = useForm<z.infer<typeof ProfileSchema>>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: currentUser?.name || '', email: currentUser?.email || '', notificationEmail: currentUser?.notificationEmail || '' },
  });
  
  if(!currentUser) return null;
  
  const handleLogout = () => {
    setCurrentUser(null, false);
    fetch('/api/logout', { method: 'POST' }).then(() => {
        router.push('/');
    });
  }

  const onPasswordSubmit = (values: z.infer<typeof PasswordSchema>) => {
    if(!currentUser) return;
    startTransition(async () => {
        try {
            await updateUserPassword(currentUser.id, values.newPassword);
            toast({
                title: "Contraseña Actualizada",
                description: "Su contraseña ha sido cambiada exitosamente.",
            });
            setIsPasswordDialogOpen(false);
            passwordForm.reset();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar la contraseña.",
                variant: "destructive",
            });
        }
    });
  }

  const onProfileSubmit = (values: z.infer<typeof ProfileSchema>) => {
    if(!currentUser) return;
    startTransition(async () => {
        try {
            await updateUserProfile(currentUser.id, { name: values.name, notificationEmail: values.notificationEmail });
            toast({
                title: "Perfil Actualizado",
                description: "Su nombre y correo de notificaciones han sido actualizados.",
            });
            setIsProfileDialogOpen(false);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el perfil.",
                variant: "destructive",
            });
        }
    });
  };

  useEffect(() => {
    if (currentUser) {
        profileForm.reset({ name: currentUser.name, email: currentUser.email, notificationEmail: currentUser.notificationEmail || '' });
    }
  }, [currentUser, profileForm, isProfileDialogOpen]);
  
  return (
      <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="justify-start gap-2 w-full p-2 h-12">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://picsum.photos/seed/${currentUser?.avatar || 'user'}/40/40`} alt={currentUser?.name || 'Usuario'} />
                    <AvatarFallback>{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                    <p className="text-sm font-medium text-sidebar-foreground">{currentUser?.name || 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email || ''}</p>
                </div>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>Mi Perfil</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Editar Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsPasswordDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Cambiar Contraseña</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                    <DialogDescription>
                        Actualice su nombre y configure un correo electrónico para recibir notificaciones.
                    </DialogDescription>
                </DialogHeader>
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <FormField control={profileForm.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl><Input {...field} disabled={isPending} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={profileForm.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Correo de Inicio de Sesión</FormLabel>
                                <FormControl><Input type="email" {...field} disabled={true} /></FormControl>
                                <FormDescription>
                                  Este correo es su nombre de usuario y no puede ser modificado.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={profileForm.control} name="notificationEmail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Correo para Notificaciones</FormLabel>
                                <FormControl><Input type="email" {...field} placeholder="ej. alertas@miempresa.com" disabled={isPending} /></FormControl>
                                 <FormDescription>
                                  Recibirá alertas de tareas y otras notificaciones en esta dirección. Si lo deja en blanco, se usará su correo de inicio de sesión.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cambiar Contraseña</DialogTitle>
                    <DialogDescription>
                        Ingrese una nueva contraseña para su cuenta.
                    </DialogDescription>
                </DialogHeader>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                         <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nueva Contraseña</FormLabel>
                                    <FormControl><Input type="password" {...field} disabled={isPending} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                                    <FormControl><Input type="password" {...field} disabled={isPending} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Contraseña"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, isClient, loading, tasks } = React.useContext(AppDataContext);
  const router = useRouter();

  useEffect(() => {
    if (isClient && !loading && !currentUser) {
        router.replace('/');
    }
  }, [isClient, loading, currentUser, router]);

  const pendingTasksCount = React.useMemo(() => {
      if (!currentUser || !tasks) return 0;
      return tasks.filter(task => task.assignedTo?.id === currentUser.id && task.status === 'pending').length;
  }, [currentUser, tasks]);


  if (loading || !currentUser) {
    return (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando sesión...</p>
          </div>
        </div>
    );
  }
  
  const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

  return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar collapsible='offcanvas'>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Image src="/logo.png" alt="AgroVision Logo" width={32} height={32} />
                  <span className="text-xl font-bold text-sidebar-foreground">AgroVision</span>
                </Link>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === '/tasks' && pendingTasksCount > 0 && (
                        <SidebarMenuBadge>{pendingTasksCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <UserMenu />
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col">
            <ConnectivityBanner />
            <header className="flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-6 sticky top-0 z-30 md:hidden">
                <SidebarTrigger>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  <Image src="/logo.png" alt="AgroVision Logo" width={24} height={24} />
                  <span className="text-lg font-bold">AgroVision</span>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
                {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayoutContent>
      {children}
    </AppLayoutContent>
  );
}