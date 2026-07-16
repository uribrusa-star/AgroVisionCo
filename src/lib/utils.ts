import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getRoleAvatar(role: string): string {
  if (role === 'Productor') return 'https://i.imgur.com/IwHcGqs.png';
  if (role === 'Ingeniero Agronomo' || role === 'Ingeniero') return 'https://i.imgur.com/bvntkqI.png';
  if (role === 'Encargado') return 'https://i.imgur.com/23yohTb.png';
  return `https://picsum.photos/seed/${role}/150/150`;
}
