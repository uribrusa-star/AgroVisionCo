import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppContextProvider } from '@/context/app-data-context.tsx';
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar'),
  title: 'AgroVista',
  description: 'Nacido en Coronda, Santa Fe (Capital Nacional de la Frutilla). AgroVista es la plataforma líder para la gestión, trazabilidad, control fenológico y análisis con IA de cultivos de frutilla.',
  applicationName: 'AgroVista Coronda',
  authors: [{ name: 'AgroVista Team - Coronda, Santa Fe' }],
  keywords: [
    'Coronda', 
    'frutillas Coronda', 
    'frutilla Coronda Santa Fe', 
    'Capital Nacional de la Frutilla', 
    'agricultura Coronda', 
    'trazabilidad frutilla', 
    'gestión agrícola Coronda', 
    'software agrícola Santa Fe',
    'agronomía Coronda'
  ],
  openGraph: {
    title: 'AgroVista | Tecnología Agrícola desde Coronda, Capital Nacional de la Frutilla',
    description: 'Plataforma integral de trazabilidad y análisis inteligente desarrollada en Coronda, Santa Fe para la producción de frutillas.',
    url: 'https://agrovista.com.ar',
    siteName: 'AgroVista Coronda',
    images: [
      {
        url: '/og-banner.png',
        width: 1200,
        height: 630,
        alt: 'AgroVista Coronda - Gestión Agrícola'
      }
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgroVista | Tecnología Agrícola desde Coronda, Santa Fe',
    description: 'Plataforma integral de trazabilidad y análisis inteligente desarrollada en Coronda para productores de frutillas.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AgroVista",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "description": "Plataforma inteligente de trazabilidad y gestión agrícola desarrollada en Coronda, Santa Fe, la Capital Nacional de la Frutilla.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Coronda",
                "addressRegion": "Santa Fe",
                "addressCountry": "AR"
              },
              "areaServed": {
                "@type": "AdministrativeArea",
                "name": "Coronda, Santa Fe, Argentina"
              },
              "keywords": "Coronda, frutilla Coronda, trazabilidad agrícola Coronda, Santa Fe"
            })
          }}
        />
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
