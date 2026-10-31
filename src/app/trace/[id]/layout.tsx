import type { Metadata } from 'next';
import { getPublicTraceById } from '@/lib/trace-server';

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

const DEMO_ID = 'DEMO-2026';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trace = await getPublicTraceById(id);

  // Lote inexistente o error: metadata genérica y fuera del índice
  if (!trace) {
    return {
      title: 'Trazabilidad de frutilla',
      robots: { index: false, follow: false },
    };
  }

  const title = `Frutillas de ${trace.farmName}: Lote ${trace.lotName}`;
  const description = trace.variety
    ? `Conocé el origen de esta frutilla (${trace.variety}): historial del lote, sanidad y cosecha con trazabilidad de AgroVista.`
    : 'Conocé el origen de esta frutilla: historial del lote, sanidad y cosecha con trazabilidad de AgroVista.';

  return {
    title,
    description,
    alternates: { canonical: `/trace/${id}` },
    // Solo la demo se indexa
    robots: id === DEMO_ID ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_AR',
      siteName: 'AgroVista',
      url: `/trace/${id}`,
      // OBLIGATORIO repetir images: openGraph del hijo REEMPLAZA al del layout raíz, no se fusiona
      images: [{ url: '/og-banner.png', width: 1200, height: 630, alt: 'AgroVista: trazabilidad de frutilla' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-banner.png'],
    },
  };
}

export default function TraceLayout({ children }: Props) {
  return <>{children}</>;
}
