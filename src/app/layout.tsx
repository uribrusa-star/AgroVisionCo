import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppContextProvider } from '@/context/app-data-context.tsx';
import { InternalUserFlag } from '@/components/internal-user-flag';
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar'),
  title: {
    default: 'Software para productores de frutilla | AgroVista',
    template: '%s | AgroVista',
  },
  description:
    'Controlá cosechas, sanidad y costos de tus lotes de frutilla. Trazabilidad con QR, bitácora agronómica y mapa satelital. Probá la demo gratis.',
  applicationName: 'AgroVista',
  authors: [{ name: 'AgroVista Team' }],
  keywords: [
    'AgroVista',
    'trazabilidad agrícola',
    'gestión de cosechas',
    'frutillas',
    'Coronda',
    'análisis agrícola',
    'software agrícola'
  ],
  openGraph: {
    title: 'AgroVista: software para productores de frutilla',
    description:
      'Cosechas, sanidad, costos y trazabilidad con QR para tus lotes de frutilla.',
    url: 'https://agrovista.com.ar',
    siteName: 'AgroVista',
    images: [
      {
        url: '/og-banner.png',
        width: 1200,
        height: 630,
        alt: 'AgroVista: gestión agrícola inteligente para frutilla'
      }
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgroVista: software para productores de frutilla',
    description:
      'Cosechas, sanidad, costos y trazabilidad con QR para tus lotes de frutilla.',
    images: ['/og-banner.png'],
  },
  verification: {
    google: '9fVymkKNPnIwlFEHpMcb4ks8lH8J0ByU9uc165H2EMs',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
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
            <InternalUserFlag />
            {children}
            <Toaster />
          </AppContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
