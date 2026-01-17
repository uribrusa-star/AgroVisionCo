import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppContextProvider } from '@/context/app-data-context.tsx';

export const metadata: Metadata = {
  title: 'AgroVision',
  description: 'Gestión de datos en la producción de fresas.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='hsl(120 25% 35%)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' /%3e%3cpath d='M12.5 15a6.2 6.2 0 0 0 4-10' /%3e%3cpath d='M11.5 9a6.2 6.2 0 0 1-4 10' /%3e%3c/svg%3e" />
      </head>
      <body>
          <AppContextProvider>
            {children}
            <Toaster />
          </AppContextProvider>
      </body>
    </html>
  );
}
