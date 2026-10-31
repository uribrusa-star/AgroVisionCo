import React from 'react';
import { FAQ_ITEMS } from '@/lib/faq';

export function HomeJsonLd() {
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AgroVista',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    description:
      'Plataforma integral de gestión agrícola y trazabilidad con QR para productores de frutilla. Bitácora agronómica, monitoreo satelital y control de cosechas.',
    url: 'https://agrovista.com.ar',
    publisher: {
      '@type': 'Organization',
      name: 'AgroVista',
      url: 'https://agrovista.com.ar',
      logo: 'https://agrovista.com.ar/logo.png',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Coronda',
        addressRegion: 'Santa Fe',
        addressCountry: 'AR',
      },
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
