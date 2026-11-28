'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, User as UserIcon, LogOut, BellRing, Save, Moon, Sun, Monitor, CreditCard, Smartphone, Download, FileSpreadsheet, FileText, Database, Loader2, QrCode, Phone, ChevronUp, ChevronDown, X, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { useTheme } from 'next-themes';

import { PageHeader } from "@/components/page-header";
import { AppDataContext } from '@/context/app-data-context.tsx';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { exportAllProducerDataToExcel, exportAllProducerDataToPDF, exportAllProducerDataToJSON } from '@/lib/export-full-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { NAV_ITEMS, getDefaultBottomNavItems } from '@/lib/navigation-config';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserCredentialDialog } from '@/components/user-credential-dialog';
import { canUserManageAttendance } from '@/lib/types';

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
  phone: z.string().optional(),
  notificationEmail: z.string().email("Por favor, ingrese un correo de notificación válido.").or(z.literal("")).optional(),
});

export default function ProfilePage() {
  const appData = React.useContext(AppDataContext);
  const { currentUser, setCurrentUser, updateUserPassword, updateUserProfile, saveFcmToken, establishmentData } = appData;
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { notificationPermission, requestPermissionAndGetToken } = usePushNotifications();
  const { theme, setTheme } = useTheme();
  const [subscriptionPrice, setSubscriptionPrice] = useState(80000);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isPresent = (appData.attendanceLogs || []).some(l => 
    l.status === 'in_progress' && currentUser &&
    ((currentUser.id && l.personnelId === currentUser.id) ||
     (currentUser.dni && l.dni === currentUser.dni) ||
     (l.personnelName && currentUser.name && l.personnelName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
  );

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);

  const [bottomNavEnabled, setBottomNavEnabled] = useState<boolean>(() => currentUser?.bottomNavEnabled !== false);
  const [selectedNavItems, setSelectedNavItems] = useState<string[]>(() => 
    currentUser?.bottomNavItems && currentUser.bottomNavItems.length > 0 
      ? currentUser.bottomNavItems 
      : getDefaultBottomNavItems(currentUser?.role || 'Productor')
  );
  const [isCustomizingNav, setIsCustomizingNav] = useState(false);

  const passwordForm = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const profileForm = useForm<z.infer<typeof ProfileSchema>>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { 
      name: currentUser?.name || '', 
      email: currentUser?.email || '', 
      phone: currentUser?.phone || '',
      notificationEmail: currentUser?.notificationEmail || ''
    },
  });

  useEffect(() => {
    if (currentUser) {
        profileForm.reset({ 
          name: currentUser.name, 
          email: currentUser.email, 
          phone: currentUser.phone || '',
          notificationEmail: currentUser.notificationEmail || ''
        });
        setBottomNavEnabled(currentUser.bottomNavEnabled !== false);
        setSelectedNavItems(
          currentUser.bottomNavItems && currentUser.bottomNavItems.length > 0
            ? currentUser.bottomNavItems
            : getDefaultBottomNavItems(currentUser.role)
        );
    }

    const unsubscribe = onSnapshot(doc(db, 'platformSettings', 'finance'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().subscriptionPrice) {
        setSubscriptionPrice(docSnap.data().subscriptionPrice);
      }
    });

    return () => unsubscribe();
  }, [currentUser, profileForm]);

  if(!currentUser) {
    return null;
  }

  const canAccessAttendance = canUserManageAttendance(currentUser, establishmentData);
  const availableNavItems = NAV_ITEMS.filter(item => {
    if (item.href === '/attendance') {
      return canAccessAttendance;
    }
    return item.roles.includes(currentUser.role);
  });

  const handleToggleBottomNav = (enabled: boolean) => {
    setBottomNavEnabled(enabled);
    if (!currentUser) return;
    startTransition(async () => {
      try {
        await updateUserProfile(currentUser.id, { bottomNavEnabled: enabled });
        toast({
          title: enabled ? "Barra Inferior Activada" : "Barra Inferior Desactivada",
          description: enabled ? "Se mostrará la barra de navegación en teléfonos." : "Se ha ocultado la barra de navegación en teléfonos.",
        });
      } catch (e) {
        toast({ title: "Error", description: "No se pudo guardar la preferencia.", variant: "destructive" });
      }
    });
  };

  const handleMoveNavItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedNavItems.length) return;

    const reordered = [...selectedNavItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setSelectedNavItems(reordered);
    if (!currentUser) return;

    startTransition(async () => {
      try {
        await updateUserProfile(currentUser.id, { bottomNavItems: reordered });
        toast({
          title: "Orden Actualizado",
          description: "Se guardó el nuevo orden de la barra inferior.",
        });
      } catch (e) {
        toast({ title: "Error", description: "No se pudo actualizar el orden.", variant: "destructive" });
      }
    });
  };

  const handleToggleNavItem = (routeHref: string) => {
    let updated: string[];
    if (selectedNavItems.includes(routeHref)) {
      if (selectedNavItems.length <= 4) {
        toast({
          title: "Mínimo Alcanzado",
          description: "Debe seleccionar al menos 4 accesos para la barra inferior.",
          variant: "destructive"
        });
        return;
      }
      updated = selectedNavItems.filter(h => h !== routeHref);
    } else {
      if (selectedNavItems.length >= 5) {
        toast({
          title: "Máximo Alcanzado",
          description: "Puede seleccionar hasta 5 accesos como máximo para evitar sobrecargar la barra.",
          variant: "destructive"
        });
        return;
      }
      updated = [...selectedNavItems, routeHref];
    }

    setSelectedNavItems(updated);
    if (!currentUser) return;

    startTransition(async () => {
      try {
        await updateUserProfile(currentUser.id, { bottomNavItems: updated });
        toast({
          title: "Accesos Actualizados",
          description: "Los accesos de la barra inferior se guardaron correctamente.",
        });
      } catch (e) {
        toast({ title: "Error", description: "No se pudieron actualizar los accesos.", variant: "destructive" });
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await new Promise(resolve => setTimeout(resolve, 60));
      exportAllProducerDataToExcel(appData);
      toast({
        title: "Planilla Excel Generada",
        description: "Se ha descargado el archivo con todos los datos y registros de tu establecimiento.",
      });
    } catch (error: any) {
      console.error("Error exportando a Excel:", error);
      toast({
        title: "Error al exportar",
        description: "Ocurrió un problema al generar la planilla Excel.",
        variant: "destructive"
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await new Promise(resolve => setTimeout(resolve, 60));
      await exportAllProducerDataToPDF(appData);
      toast({
        title: "Informe PDF Generado",
        description: "Se ha descargado el informe general ordenado por secciones.",
      });
    } catch (error: any) {
      console.error("Error exportando a PDF:", error);
      toast({
        title: "Error al exportar",
        description: "Ocurrió un problema al generar el informe PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportJSON = () => {
    try {
      setIsExportingJSON(true);
      exportAllProducerDataToJSON(appData);
      toast({
        title: "Copia Digital JSON Generada",
        description: "Se ha descargado el archivo de respaldo técnico.",
      });
    } catch (error: any) {
      console.error("Error exportando a JSON:", error);
      toast({
        title: "Error al exportar",
        description: "Ocurrió un problema al generar la copia digital.",
        variant: "destructive"
      });
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleLogout = async () => {
    try {
      setCurrentUser(null, false);
      await signOut(auth).catch(() => {});
      await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace('/login');
    }
  };

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
              phone: values.phone?.trim() || '',
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

  const handleCancelSubscription = async () => {
    if (!currentUser?.id) return;
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        subscriptionAutoRenew: false,
        subscriptionCancelledAt: new Date().toISOString(),
      });

      if (setCurrentUser) {
        setCurrentUser({
          ...currentUser,
          subscriptionAutoRenew: false,
          subscriptionCancelledAt: new Date().toISOString(),
        });
      }

      setIsCancelDialogOpen(false);
      toast({
        title: "Cancelación procesada",
        description: "Tu solicitud de baja fue registrada. Mantendrás acceso a todas tus funciones hasta la fecha de vencimiento actual.",
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        variant: "destructive",
        title: "Error al cancelar",
        description: "No se pudo procesar la baja en este momento. Por favor, intenta de nuevo o comunícate con soporte.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <PageHeader title="Mi Perfil" description="Administre sus ajustes de cuenta, seguridad y preferencias de notificaciones." />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* Columna Izquierda: Foto y Cierre de Sesión */}
        <div className="xl:col-span-1 flex flex-col gap-6">
            <Card className="flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow relative">
                <div className="relative mb-4">
                  <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg">
                      <AvatarImage src={getAvatarPreview()} alt={currentUser.name} />
                      <AvatarFallback className="text-4xl">{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span 
                    className={cn(
                      "absolute bottom-1 right-2 h-5 w-5 rounded-full ring-4 ring-background",
                      isPresent ? "bg-emerald-500 animate-pulse" : "bg-slate-400 dark:bg-slate-500"
                    )}
                    title={isPresent ? "Presente en finca (activo)" : "Ausente de finca"}
                  />

                  {/* Botón QR en el extremo derecho de la foto */}
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => setIsCredentialOpen(true)}
                    className="absolute -top-1 -right-1 h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-2 border-background active:scale-95 transition-transform"
                    title="Ver Mi Credencial y Control de Asistencia"
                  >
                    <QrCode className="h-5 w-5" />
                  </Button>
                </div>
                <CardTitle className="text-2xl mt-4">{currentUser.name}</CardTitle>
                <CardDescription className="text-base mt-2 flex flex-col gap-1 items-center">
                    <span className="font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm inline-block">{currentUser.role}</span>
                    <span className="text-muted-foreground mt-2">{currentUser.email}</span>
                </CardDescription>

                {/* Botón de acceso directo a Credencial y Asistencia Personal */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCredentialOpen(true)}
                  className="mt-4 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl shadow-xs"
                >
                  <QrCode className="h-4 w-4 text-emerald-600" />
                  <span>Mi Asistencia y Credencial</span>
                </Button>
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
                          currentUser.subscriptionStatus === 'active' ? (
                            currentUser.subscriptionAutoRenew === false || currentUser.subscriptionCancelledAt ? (
                              <span className="text-amber-600 dark:text-amber-400">Activa (Baja programada)</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">Activa</span>
                            )
                          ) : (
                            <span className="text-orange-500">Inactiva / Vencida</span>
                          )
                        }
                      </p>
                      {currentUser.subscriptionExpiryDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Vence el: {new Date(currentUser.subscriptionExpiryDate).toLocaleDateString('es-AR')}
                        </p>
                      )}
                      {(currentUser.subscriptionAutoRenew === false || currentUser.subscriptionCancelledAt) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                          No se renovará al finalizar tu período actual.
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
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <Button onClick={handleSubscribe} disabled={isPending} className="w-full sm:w-auto">
                            {isPending ? "Procesando..." : `Suscribirse por $${((typeof currentUser.subscriptionPrice === 'number' && currentUser.subscriptionPrice > 0) ? currentUser.subscriptionPrice : subscriptionPrice).toLocaleString('es-AR')} / mes`}
                          </Button>
                          {typeof currentUser.subscriptionPrice === 'number' && currentUser.subscriptionPrice > 0 && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ★ Cuota con tarifa especial asignada
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Button variant="outline" disabled className="w-full sm:w-auto text-green-600 border-green-200 bg-green-50/50 dark:bg-green-950/30">
                            Suscripción al día
                          </Button>
                          {currentUser.subscriptionAutoRenew !== false && !currentUser.subscriptionCancelledAt && (
                            <Button
                              variant="ghost"
                              onClick={() => setIsCancelDialogOpen(true)}
                              className="w-full sm:w-auto text-stone-500 hover:text-red-600 hover:bg-red-50 dark:text-stone-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 text-xs sm:text-sm font-medium"
                            >
                              Cancelar suscripción
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Modal de confirmación para cancelar suscripción */}
            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Deseas cancelar tu suscripción?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-stone-600 dark:text-stone-300 text-left pt-2">
                    <span>
                      Al solicitar la baja, <strong>no perderás el acceso inmediatamente</strong>. Seguirás teniendo acceso completo a tus lotes, cuadrillas, mapas y métricas hasta la fecha de vencimiento actual:
                    </span>
                    {currentUser?.subscriptionExpiryDate && (
                      <span className="block p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 font-semibold text-stone-800 dark:text-stone-100 text-center">
                        📅 Vencimiento del ciclo: {new Date(currentUser.subscriptionExpiryDate).toLocaleDateString('es-AR')}
                      </span>
                    )}
                    <span className="block text-xs text-stone-500">
                      Al cumplirse dicha fecha, la cuenta pasará a estado inactivo y no se renovará ni se generará ningún cobro adicional. Podrás volver a reactivar tu plan cuando lo desees.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel disabled={isCancelling}>Volver atrás</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancelSubscription();
                    }}
                    disabled={isCancelling}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Confirmar cancelación"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                            Número de WhatsApp
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="tel" 
                                                placeholder="Ej. +54 9 11 1234 5678" 
                                                {...field} 
                                                disabled={isPending} 
                                                className="bg-muted/30 font-mono" 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Permite enviar y recibir credenciales digitales y coordinar accesos y asistencia.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
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
                            </div>
                                
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={isPending} className="gap-2">
                                    <Save className="h-4 w-4" /> {isPending ? "Guardando..." : "Guardar Cambios"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
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

            <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 rounded-full shrink-0"><Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-500" /></div>
                    <div>
                        <CardTitle>Barra Inferior Móvil</CardTitle>
                        <CardDescription>Habilita y personaliza tus accesos directos más usados para celulares.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                        <div className="space-y-0.5">
                            <h4 className="font-semibold text-sm">Habilitar Barra Inferior en Celular</h4>
                            <p className="text-xs text-muted-foreground">Muestra una barra de navegación rápida fija en la parte inferior cuando estás desde un teléfono.</p>
                        </div>
                        <Switch 
                            checked={bottomNavEnabled} 
                            onCheckedChange={handleToggleBottomNav} 
                        />
                    </div>

                    {bottomNavEnabled && (
                        <div className="space-y-5 pt-3 animate-in fade-in duration-200">
                            {/* Live Mobile Bar Preview */}
                            <div className="p-3.5 bg-muted/30 rounded-xl border border-primary/20 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <Smartphone className="h-3.5 w-3.5 text-primary" />
                                        <span>Vista previa en celular (orden de izquierda a derecha)</span>
                                    </div>
                                    <span className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                                        {selectedNavItems.length} de 5
                                    </span>
                                </div>
                                <div className="grid grid-flow-col auto-cols-fr gap-1.5 bg-background/90 p-2 rounded-lg border shadow-xs">
                                    {selectedNavItems.map((href, idx) => {
                                        const item = NAV_ITEMS.find(n => n.href === href);
                                        if (!item) return null;
                                        const Icon = item.icon;
                                        return (
                                            <div key={href} className="flex flex-col items-center justify-center py-1.5 px-1 rounded-md bg-muted/30 border border-muted text-center relative group">
                                                <span className="text-[9px] font-bold text-muted-foreground mb-0.5">#{idx + 1}</span>
                                                <div className="p-1 rounded-full bg-primary/10 text-primary mb-0.5">
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-[10px] font-medium leading-tight truncate max-w-[65px]">
                                                    {item.shortLabel || item.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-muted-foreground text-center">
                                    Así es exactamente como se organizarán los botones en la barra fija inferior de tu celular.
                                </p>
                            </div>

                            {/* Botón desplegable para personalizar y reordenar */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCustomizingNav(prev => !prev)}
                                className="w-full max-w-full flex items-center justify-between p-3 h-auto text-xs sm:text-sm font-medium border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors whitespace-normal rounded-xl overflow-hidden gap-2"
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                    <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
                                    <span className="font-semibold text-foreground truncate">
                                        Personalizar accesos ({selectedNavItems.length})
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-primary font-medium shrink-0 bg-primary/10 px-2.5 py-1 rounded-full">
                                    <span>{isCustomizingNav ? "Ocultar" : "Modificar"}</span>
                                    {isCustomizingNav ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </div>
                            </Button>

                            {isCustomizingNav && (
                                <div className="space-y-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Reordering Controls */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                                                Posición y Orden de los Accesos Activos
                                            </label>
                                            <span className="text-[11px] text-muted-foreground">Usa las flechas para reordenar</span>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedNavItems.map((href, index) => {
                                                const item = NAV_ITEMS.find(n => n.href === href);
                                                if (!item) return null;
                                                const Icon = item.icon;
                                                return (
                                                    <div 
                                                        key={href} 
                                                        className="flex items-center justify-between p-2.5 bg-background border rounded-lg shadow-2xs hover:border-primary/40 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                                                {index + 1}
                                                            </span>
                                                            <Icon className="h-4 w-4 text-primary shrink-0" />
                                                            <span className="text-sm font-medium">{item.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-muted"
                                                                disabled={index === 0}
                                                                onClick={() => handleMoveNavItem(index, 'up')}
                                                                title="Mover a la izquierda / antes"
                                                            >
                                                                <ChevronUp className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-muted"
                                                                disabled={index === selectedNavItems.length - 1}
                                                                onClick={() => handleMoveNavItem(index, 'down')}
                                                                title="Mover a la derecha / después"
                                                            >
                                                                <ChevronDown className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleToggleNavItem(href)}
                                                                title="Quitar de la barra inferior"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Available Sections Toggle */}
                                    <div className="space-y-2.5 pt-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                                                Todas las Secciones Disponibles
                                            </label>
                                            <span className="text-xs text-muted-foreground">Mínimo 4, máximo 5</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {availableNavItems.map((item) => {
                                                const orderIndex = selectedNavItems.indexOf(item.href);
                                                const isChecked = orderIndex !== -1;
                                                const Icon = item.icon;
                                                return (
                                                    <div 
                                                        key={item.href}
                                                        onClick={() => handleToggleNavItem(item.href)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all select-none",
                                                            isChecked ? "border-primary/50 bg-primary/5 shadow-2xs" : "hover:bg-muted/30 opacity-70"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox 
                                                                checked={isChecked}
                                                                onCheckedChange={() => handleToggleNavItem(item.href)}
                                                            />
                                                            <Icon className="h-4 w-4 text-primary shrink-0" />
                                                            <span className="text-sm font-medium leading-none">{item.label}</span>
                                                        </div>
                                                        {isChecked && (
                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                #{orderIndex + 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
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

            {(currentUser.role === 'Productor' || currentUser.role === 'SuperAdmin') && (
                <Card className="shadow-sm hover:shadow-md transition-shadow border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/[0.03]">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                        <div className="p-2.5 bg-emerald-500/15 rounded-xl shrink-0 text-emerald-600 dark:text-emerald-400">
                            <Download className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg">Extracción de Datos y Copia de Seguridad</CardTitle>
                            <CardDescription>
                                Descarga todos los registros de tu quinta: cosechas, cuadrillas, bitácora del agrónomo, labores e insumos.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Como productor, eres dueño absoluto de tu información. Puedes extraer todo el historial cargado por ti, tus encargados y tu ingeniero agrónomo en una planilla Excel con pestañas o en un informe PDF oficial listo para imprimir o presentar.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                            {/* Tarjeta Excel */}
                            <div className="p-4 border rounded-xl bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-3 shadow-xs">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        <span>Planilla Excel (.xlsx)</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Libro completo con pestañas de Cosechas, Personal, Bitácora Agronómica, Insumos y Finanzas.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleExportExcel} 
                                    disabled={isExportingExcel}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs text-xs font-medium"
                                >
                                    {isExportingExcel ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Generando Excel...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-3.5 w-3.5" />
                                            <span>Descargar Excel</span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Tarjeta PDF */}
                            <div className="p-4 border rounded-xl bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-3 shadow-xs">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-blue-700 dark:text-blue-400">
                                        <FileText className="h-4 w-4" />
                                        <span>Informe General en PDF</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Documento prolijo y ordenado por secciones, con tablas claras y totales de producción para imprimir o archivar.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleExportPDF} 
                                    disabled={isExportingPDF}
                                    variant="outline"
                                    className="w-full border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-2 shadow-xs text-xs font-medium"
                                >
                                    {isExportingPDF ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                                            <span>Generando PDF...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-3.5 w-3.5" />
                                            <span>Descargar PDF</span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Tarjeta JSON */}
                            <div className="p-4 border rounded-xl bg-background/60 hover:bg-background transition-colors flex flex-col justify-between gap-3 shadow-xs">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-slate-700 dark:text-slate-300">
                                        <Database className="h-4 w-4" />
                                        <span>Copia Digital (.json)</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Respaldo técnico de seguridad con los datos puros de la base de datos para custodia digital o portabilidad.
                                    </p>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleExportJSON} 
                                    disabled={isExportingJSON}
                                    variant="ghost"
                                    className="w-full border gap-2 text-xs text-muted-foreground hover:text-foreground font-medium"
                                >
                                    {isExportingJSON ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Generando JSON...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-3.5 w-3.5" />
                                            <span>Descargar JSON</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type={showNewPassword ? "text" : "password"} 
                                                        placeholder="••••••••" 
                                                        {...field} 
                                                        disabled={isPending} 
                                                        className="bg-muted/30 pr-10" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                                                        tabIndex={-1}
                                                        title={showNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                )} />
                                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirmar Contraseña</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type={showConfirmPassword ? "text" : "password"} 
                                                        placeholder="••••••••" 
                                                        {...field} 
                                                        disabled={isPending} 
                                                        className="bg-muted/30 pr-10" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                                                        tabIndex={-1}
                                                        title={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
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

      {/* Diálogo de Credencial, Resumen de Asistencia y Movimientos */}
      <UserCredentialDialog
        isOpen={isCredentialOpen}
        onOpenChange={setIsCredentialOpen}
        user={currentUser}
      />
    </>
  );
}
