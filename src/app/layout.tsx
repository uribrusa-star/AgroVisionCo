import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppContextProvider } from '@/context/app-data-context.tsx';
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.site'),
  title: 'AgroVista',
  description: 'Plataforma integral para la gestión, trazabilidad y análisis de datos en la producción agrícola y de fresas. Accede a tu panel para controlar lotes y tareas.',
  applicationName: 'AgroVista',
  authors: [{ name: 'AgroVista Team' }],
  keywords: ['agricultura', 'fresas', 'trazabilidad', 'gestión agrícola', 'software agrícola'],
  openGraph: {
    title: 'AgroVista - Gestión Agrícola',
    description: 'Plataforma integral para la gestión, trazabilidad y análisis de datos en la producción agrícola.',
    url: 'https://agrovista.site',
    siteName: 'AgroVista',
    images: [
      {
        url: '/og-banner.png',
        width: 1200,
        height: 630,
        alt: 'AgroVista - Gestión Agrícola'
      }
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgroVista - Gestión Agrícola',
    description: 'Plataforma integral para la gestión, trazabilidad y análisis de datos en la producción agrícola.',
    images: ['/og-banner.png'],
  },
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='hsl(120 25% 35%)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' /%3e%3cpath d='M12.5 15a6.2 6.2 0 0 0 4-10' /%3e%3cpath d='M11.5 9a6.2 6.2 0 0 1-4 10' /%3e%3c/svg%3e" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppContextProvider>
            {children}
            <Toaster />
          </AppContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
