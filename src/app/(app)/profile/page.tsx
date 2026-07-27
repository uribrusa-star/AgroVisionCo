'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, User as UserIcon, LogOut, BellRing, Save, Moon, Sun, Monitor, CreditCard } from 'lucide-react';
import { useTheme } from 'next-themes';

import { PageHeader } from "@/components/page-header";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

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

export default function ProfilePage() {
  const { currentUser, setCurrentUser, updateUserPassword, updateUserProfile, saveFcmToken } = React.useContext(AppDataContext);
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { notificationPermission, requestPermissionAndGetToken } = usePushNotifications();
  const { theme, setTheme } = useTheme();

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const profileForm = useForm<z.infer<typeof ProfileSchema>>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { 
      name: currentUser?.name || '', 
      email: currentUser?.email || '', 
      notificationEmail: currentUser?.notificationEmail || ''
    },
  });

  useEffect(() => {
    if (currentUser) {
        profileForm.reset({ 
          name: currentUser.name, 
          email: currentUser.email, 
          notificationEmail: currentUser.notificationEmail || ''
        });
    }
  }, [currentUser, profileForm]);

  if(!currentUser) {
    return null;
  }

  const handleLogout = async () => {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (response.ok) {
        setCurrentUser(null, false);
        router.push('/login');
    } else {
        toast({
            title: "Error",
            description: "No se pudo cerrar la sesión.",
            variant: "destructive",
        });
    }
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
            await updateUserProfile(currentUser.id, { 
              name: values.name, 
              notificationEmail: values.notificationEmail
            });
            toast({
                title: "Perfil Actualizado",
                description: "Sus datos básicos han sido guardados.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el perfil.",
                variant: "destructive",
            });
        }
    });
  };

  const getAvatarPreview = () => {
    if (currentUser.role === 'Productor') return 'https://i.imgur.com/IwHcGqs.png';
    if (currentUser.role === 'Ingeniero Agronomo' || currentUser.role === 'Ingeniero') return 'https://i.imgur.com/bvntkqI.png';
    if (currentUser.role === 'Encargado') return 'https://i.imgur.com/23yohTb.png';
    return `https://picsum.photos/seed/${currentUser.name}/150/150`;
  }

  const handlePushLink = async () => {
    const token = await requestPermissionAndGetToken();
    if(token) {
       await saveFcmToken(token);
       toast({
           title: "Dispositivo Vinculado",
           description: "Tu navegador ahora recibirá las Alertas Críticas.",
       });
    }
  };

  const handleSubscribe = async () => {
    try {
      startTransition(async () => {
        const res = await fetch('/api/checkout', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          // Redirigir a MercadoPago (Producción o Sandbox dependiendo del token usado)
          const checkoutUrl = data.init_point || data.sandbox_init_point;
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
          }
        } else {
          toast({ title: "Error", description: "No se pudo generar el enlace de pago.", variant: "destructive" });
        }
      });
    } catch (e) {
      toast({ title: "Error", description: "Ocurrió un error de red.", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Mi Perfil" description="Administre sus ajustes de cuenta, seguridad y preferencias de notificaciones." />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* Columna Izquierda: Foto y Cierre de Sesión */}
        <div className="xl:col-span-1 flex flex-col gap-6">
            <Card className="flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
                <Avatar className="h-32 w-32 mb-4 ring-4 ring-background shadow-lg">
                    <AvatarImage src={getAvatarPreview()} alt={currentUser.name} />
                    <AvatarFallback className="text-4xl">{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl mt-4">{currentUser.name}</CardTitle>
                <CardDescription className="text-base mt-2 flex flex-col gap-1 items-center">
                    <span className="font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm inline-block">{currentUser.role}</span>
                    <span className="text-muted-foreground mt-2">{currentUser.email}</span>
                </CardDescription>
            </Card>

            <Card className="border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-red-700 dark:text-red-400 font-medium">Sesión Activa</CardTitle>
                    <CardDescription>Cierra temporalmente la conexión en este dispositivo de forma segura para proteger tus datos.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>

        {/* Columna Derecha: Formularios */}
        <div className="xl:col-span-2 flex flex-col gap-6">
            
            {currentUser.role === 'Productor' && (
              <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/20">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="p-2 bg-primary/10 rounded-full shrink-0"><CreditCard className="h-5 w-5 text-primary" /></div>
                    <div>
                        <CardTitle>Mi Suscripción</CardTitle>
                        <CardDescription>Gestione su plan mensual de AgroVista.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <p className="font-semibold text-lg">
                        Estado: {
                          currentUser.subscriptionStatus === 'active' ? <span className="text-green-600">Activa</span> : 
                          <span className="text-orange-500">Inactiva / Vencida</span>
                        }
                      </p>
                      {currentUser.subscriptionExpiryDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Vence el: {new Date(currentUser.subscriptionExpiryDate).toLocaleDateString()}
                        </p>
                      )}
                      {!currentUser.subscriptionStatus && (
                         <p className="text-sm text-muted-foreground mt-1">
                          Periodo de prueba de 14 días disponible.
                        </p>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-0">
                      {currentUser.subscriptionStatus !== 'active' ? (
                        <Button onClick={handleSubscribe} disabled={isPending} className="w-full sm:w-auto">
                          {isPending ? "Procesando..." : "Suscribirse por $100.000 / mes"}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="w-full sm:w-auto text-green-600 border-green-200 bg-green-50/50">
                          Suscripción al día
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full shrink-0"><UserIcon className="h-5 w-5 text-primary" /></div>
                    <div>
                        <CardTitle>Información Personal</CardTitle>
                        <CardDescription>Configure sus identificadores y correos principales.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={profileForm.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre Completo</FormLabel>
                                        <FormControl><Input {...field} disabled={isPending} className="bg-muted/30" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={profileForm.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo de Inicio de Sesión</FormLabel>
                                        <FormControl><Input type="email" {...field} disabled={true} className="bg-muted" /></FormControl>
                                        <FormDescription>Este correo es único y no puede modificarse.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                                <FormField control={profileForm.control} name="notificationEmail" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo de Respaldo para Notificaciones</FormLabel>
                                        <FormControl><Input type="email" {...field} placeholder="ej. alertas@miempresa.com" disabled={isPending} className="bg-muted/30" /></FormControl>
                                        <FormDescription>
                                            Recibirá las alertas que caduquen o reportes a esta dirección. Déjelo en blanco si desea usar su correo principal.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={isPending} className="gap-2">
                                    <Save className="h-4 w-4" /> {isPending ? "Guardando..." : "Guardar Cambios"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-full shrink-0"><Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /></div>
                    <div>
                        <CardTitle>Apariencia</CardTitle>
                        <CardDescription>Personaliza cómo se ve AgroVista en este dispositivo.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            variant={theme === 'light' ? 'default' : 'outline'} 
                            onClick={() => setTheme('light')}
                            className="flex flex-col items-center gap-2 h-auto py-4"
                        >
                            <Sun className="h-6 w-6" />
                            <span>Claro</span>
                        </Button>
                        <Button 
                            variant={theme === 'dark' ? 'default' : 'outline'} 
                            onClick={() => setTheme('dark')}
                            className="flex flex-col items-center gap-2 h-auto py-4"
                        >
                            <Moon className="h-6 w-6" />
                            <span>Oscuro</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-2">
                    <div className="p-2 bg-amber-500/10 rounded-full shrink-0"><BellRing className="h-5 w-5 text-amber-600 dark:text-amber-500" /></div>
                    <div>
                        <CardTitle>Comunicaciones Directas (Push)</CardTitle>
                        <CardDescription>Mantente informado al instante de cambios climáticos o diagnósticos IA de la finca.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-muted/50 to-muted/20">
                        <div className="space-y-1 text-center md:text-left mb-4 md:mb-0">
                            <h4 className="text-base font-medium">Alertas en Tiempo Real por Pantalla</h4>
                            <p className="text-sm text-muted-foreground w-full md:max-w-md">Si lo habilitas, mostraremos un aviso nativo tipo ventanilla cuando ocurran eventos críticos mientras trabajas.</p>
                        </div>
                        
                        <div className="shrink-0 flex items-center justify-center">
                            {notificationPermission === 'granted' ? (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-sm font-semibold px-4 py-1.5 bg-green-100 text-green-700 rounded-full border border-green-200 shadow-sm flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Sincronización Activa</span>
                                    {!(currentUser.fcmTokens && currentUser.fcmTokens.length > 0) && (
                                        <Button type="button" variant="ghost" size="sm" onClick={handlePushLink} className="text-amber-600 hover:text-amber-700 hover:bg-amber-100/50">
                                            (Revisar Permisos / Vincular de Nuevo)
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Button type="button" onClick={handlePushLink} className="bg-amber-500 hover:bg-amber-600 shadow-sm text-white px-6">
                                    Conectar Dispositivo
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow mb-8">
                <CardHeader className="flex flex-row items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-full shrink-0"><KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-500" /></div>
                    <div>
                        <CardTitle>Seguridad</CardTitle>
                        <CardDescription>Modifique la contraseña utilizada para iniciar sesión en todos sus dispositivos.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nueva Contraseña</FormLabel>
                                            <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isPending} className="bg-muted/30" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                )} />
                                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirmar Contraseña</FormLabel>
                                            <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isPending} className="bg-muted/30" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                )} />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={isPending} variant="secondary" className="gap-2 shadow-sm border">
                                    <Save className="h-4 w-4" /> {isPending ? "Validando..." : "Actualizar Contraseña"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

        </div>
      </div>
    </>
  );
}
