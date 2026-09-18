import { LayoutDashboard, Building, Map, Leaf, PackageSearch, LineChart, ClipboardCheck, HardHat, Package, BookUser, Mail } from 'lucide-react';
import { StrawberryIcon, NotebookPen } from '@/components/icons';
import { UserRole } from './types';

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: any;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Panel de Control', shortLabel: 'Inicio', icon: LayoutDashboard, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/data-entry', label: 'Entrada de Datos', shortLabel: 'Cosecha', icon: StrawberryIcon, roles: ['Productor', 'Encargado'] },
  { href: '/producer-log', label: 'Bitácora Productor', shortLabel: 'Bitácora', icon: NotebookPen, roles: ['Productor'] },
  { href: '/engineer-log', label: 'Bitácora Agrónomo', shortLabel: 'Bitácora', icon: Leaf, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/map', label: 'Mapa', shortLabel: 'Mapa', icon: Map, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/tasks', label: 'Tareas', shortLabel: 'Tareas', icon: ClipboardCheck, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/establishment', label: 'Establecimiento', shortLabel: 'Quinta', icon: Building, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/traceability', label: 'Trazabilidad', shortLabel: 'Trazabilidad', icon: PackageSearch, roles: ['Productor', 'Ingeniero Agronomo', 'Encargado'] },
  { href: '/predictions', label: 'Predicciones', shortLabel: 'Predicciones', icon: LineChart, roles: ['Productor', 'Ingeniero Agronomo'] },
  { href: '/collectors', label: 'Recolectores', shortLabel: 'Recolectores', icon: HardHat, roles: ['Productor', 'Encargado'] },
  { href: '/packers', label: 'Embaladores', shortLabel: 'Embaladores', icon: Package, roles: ['Productor', 'Encargado'] },
  { href: '/users', label: 'Usuarios', shortLabel: 'Usuarios', icon: BookUser, roles: ['Productor'] },
  { href: '/contact-requests', label: 'Solicitudes', shortLabel: 'Solicitudes', icon: Mail, roles: ['SuperAdmin'] },
];

export function getDefaultBottomNavItems(role: UserRole): string[] {
  if (role === 'Productor') {
    return ['/data-entry', '/producer-log', '/map', '/tasks', '/dashboard'];
  }
  if (role === 'Ingeniero Agronomo') {
    return ['/engineer-log', '/map', '/predictions', '/tasks', '/dashboard'];
  }
  if (role === 'Encargado') {
    return ['/data-entry', '/tasks', '/collectors', '/map', '/dashboard'];
  }
  return ['/dashboard'];
}
