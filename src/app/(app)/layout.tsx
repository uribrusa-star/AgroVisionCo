'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HardHat, Leaf, LayoutDashboard, Check, Loader2, PackageSearch, Menu, Building, LogOut, LineChart, Map, KeyRound, Package, BookUser, ClipboardCheck, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';


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


const allNavItems = [
  { href: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/establishment', label: 'Establecimiento', icon: Building, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/map', label: 'Mapa', icon: Map, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/tasks', label: 'Tareas', icon: ClipboardCheck, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/traceability', label: 'Trazabilidad', icon: PackageSearch, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/engineer-log', label: 'Bitácora del Agrónomo', icon: Leaf, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/predictions', label: 'Predicciones', icon: LineChart, roles: ['Productor', 'Ingeniero Agronomo'] },
  { href: '/data-entry', label: 'Entrada de Datos', icon: StrawberryIcon, roles: ['Productor', 'Encargado'] },
  { href: '/producer-log', label: 'Bitácora del Productor', icon: NotebookPen, roles: ['Productor'] },
  { href: '/collectors', label: 'Recolectores', icon: HardHat, roles: ['Productor', 'Encargado'] },
  { href: '/packers', label: 'Embaladores', icon: Package, roles: ['Productor', 'Encargado'] },
  { href: '/users', label: 'Usuarios', icon: BookUser, roles: ['Productor'] },
];

function UserMenu() {
  const { currentUser } = React.useContext(AppDataContext);
  
  if(!currentUser) return null;
  
  return (
      <Button variant="ghost" className="justify-start gap-2 w-full p-2 h-12" asChild>
          <Link href="/profile">
            <Avatar className="h-8 w-8">
                <AvatarImage src={`https://picsum.photos/seed/${currentUser?.avatar || 'user'}/40/40`} alt={currentUser?.name || 'Usuario'} />
                <AvatarFallback>{currentUser?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-left overflow-hidden flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser?.name || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email || ''}</p>
            </div>
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

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.location.reload();
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
              <p className="font-semibold text-lg">Sincronizando con AgroVision...</p>
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