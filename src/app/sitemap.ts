import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar';

  return [
    {
      url: `${baseUrl}`,
      lastModified: '2026-10-30',
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/trace/DEMO-2026`,
      lastModified: '2026-10-30',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: '2026-10-30',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: '2026-10-30',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
