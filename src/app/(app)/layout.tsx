'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HardHat, Leaf, LayoutDashboard, Check, Loader2, PackageSearch, Menu, Building, LogOut, LineChart, Map, KeyRound, Package, BookUser, ClipboardCheck, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { ForegroundNotificationListener } from '@/components/ForegroundNotificationListener';
import { NotificationBell } from '@/components/notification-bell';
import { signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';


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
  SidebarInset,
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


const allNavItems = [
  { href: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/establishment', label: 'Establecimiento', icon: Building, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/map', label: 'Mapa', icon: Map, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/engineer-log', label: 'Bitácora del Agrónomo', icon: Leaf, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/data-entry', label: 'Entrada de Datos', icon: StrawberryIcon, roles: ['Productor', 'Encargado'] },
  { href: '/traceability', label: 'Trazabilidad', icon: PackageSearch, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/predictions', label: 'Predicciones', icon: LineChart, roles: ['Productor', 'Ingeniero Agronomo'] },
  { href: '/tasks', label: 'Tareas', icon: ClipboardCheck, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/producer-log', label: 'Bitácora del Productor', icon: NotebookPen, roles: ['Productor'] },
  { href: '/collectors', label: 'Recolectores', icon: HardHat, roles: ['Productor', 'Encargado'] },
  { href: '/packers', label: 'Embaladores', icon: Package, roles: ['Productor', 'Encargado'] },
  { href: '/users', label: 'Usuarios', icon: BookUser, roles: ['Productor'] },
];

function UserMenu() {
  const { currentUser } = React.useContext(AppDataContext);
  
  if(!currentUser) return null;
  
  return (
      <Button variant="ghost" className="flex items-center gap-2 p-1 md:gap-3 md:pl-5 md:pr-2 md:py-2 h-10 md:h-12 rounded-full md:border md:border-primary/40 hover:bg-muted" asChild>
          <Link href="/profile">
            <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground leading-tight mb-0.5">{currentUser?.role || ''}</p>
                <p className="text-sm font-medium text-foreground leading-tight">{currentUser?.name || 'Usuario'}</p>
            </div>
            <Avatar className="h-8 w-8">
                <AvatarImage 
                    src={currentUser?.avatar?.startsWith('http') 
                        ? currentUser.avatar 
                        : `https://picsum.photos/seed/${currentUser?.avatar || 'user'}/40/40`} 
                    alt="" 
                />
                <AvatarFallback>{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
      </Button>
  )
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, isClient, loading, tasks } = React.useContext(AppDataContext);
  const router = useRouter();

  const [showResetButton, setShowResetButton] = useState(false);

  useEffect(() => {
    if (isClient && !loading && !currentUser) {
        router.replace('/');
    }
  }, [isClient, loading, currentUser, router]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => setShowResetButton(true), 8000);
    } else {
      setShowResetButton(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleReset = async () => {
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/logout', { method: 'POST' });
        await signOut(auth);
        
        // Terminar Firestore y limpiar todo el caché de IndexedDB para asegurar 100% de aislamiento de datos
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch (error) {
        console.error('Error logging out and clearing cache:', error);
      }
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const pendingTasksCount = React.useMemo(() => {
      if (!currentUser || !tasks) return 0;
      return tasks.filter(task => task.assignedTo?.id === currentUser.id && task.status === 'pending').length;
  }, [currentUser, tasks]);


  if (loading || !currentUser) {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-2">
              <p className="font-semibold text-lg">Sincronizando con AgroVista...</p>
              <p className="text-sm text-muted-foreground italic">Verificando sesión y descargando datos del campo.</p>
            </div>
            
            {showResetButton && (
              <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-xs text-muted-foreground">
                  Si esto tarda demasiado, puede haber un problema de conexión o con el almacenamiento del navegador.
                </p>
                <div className="flex flex-col gap-2">
                   <Button variant="outline" onClick={() => window.location.reload()}>
                      Reintentar Conexión
                   </Button>
                   <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleReset}>
                      Omitir y Reiniciar Sesión
                   </Button>
                </div>
              </div>
            )}
          </div>
        </div>
    );
  }
  
  const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

  const isProductor = currentUser.role === 'Productor';
  const isPaywalled = isProductor && (currentUser.subscriptionStatus === 'past_due' || currentUser.subscriptionStatus === 'canceled');
  const allowedPaywallRoutes = ['/profile', '/establishment'];
  const showPaywallBlocker = isPaywalled && !allowedPaywallRoutes.includes(pathname);

  return (
      <SidebarProvider defaultOpen={true} className="flex-col">
          <ConnectivityBanner />
          {/* Top Header spans full width */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:px-6 sticky top-0 z-40">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="shrink-0" />
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Image src="/logo.png" alt="AgroVista Logo" width={32} height={32} className="shrink-0" />
                  <span className="text-xl font-bold hidden sm:inline-block">AgroVista</span>
                </Link>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <NotificationBell />
                <UserMenu />
              </div>
          </header>

          <div className="flex flex-1 w-full">
            <Sidebar collapsible='icon' className="bg-background border-r !top-16 !h-[calc(100svh-4rem)]">
              <SidebarContent className="pt-4">
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        className="group-data-[collapsible=icon]:mx-auto"
                      >
                        <Link href={item.href} className="flex items-center gap-2 w-full font-medium group-data-[collapsible=icon]:!justify-center">
                          <item.icon className="w-5 h-5 shrink-0 text-primary" strokeWidth={2.5} />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    {item.href === '/tasks' && pendingTasksCount > 0 && (
                        <SidebarMenuBadge>{pendingTasksCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Cerrar Sesión" onClick={handleReset} className="group-data-[collapsible=icon]:mx-auto">
                      <button className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2">
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
                <div className="mt-4 pt-2 border-t flex flex-col items-center gap-1 text-center text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <Link href="/terminos" className="hover:underline hover:text-foreground">Términos y Condiciones</Link>
                  <Link href="/privacidad" className="hover:underline hover:text-foreground">Privacidad (Ley 25.326)</Link>
                </div>
            </SidebarFooter>
          </Sidebar>

            <SidebarInset className="flex-1 w-full bg-muted/20">
                <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
                  {showPaywallBlocker ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                      <div className="bg-background p-8 rounded-xl shadow-lg max-w-md border border-orange-200">
                        <PackageSearch className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Suscripción Requerida</h2>
                        <p className="text-muted-foreground mb-6">
                          Su periodo de prueba ha finalizado o su suscripción está inactiva. Para continuar utilizando todas las herramientas de AgroVista, por favor active su suscripción.
                        </p>
                        <Button asChild className="w-full">
                          <Link href="/profile">Ir a Mi Suscripción</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    children
                  )}
                </main>
            </SidebarInset>
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