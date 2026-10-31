import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/establishment',
        '/map',
        '/data-entry',
        '/engineer-log',
        '/producer-log',
        '/traceability',
        '/predictions',
        '/tasks',
        '/collectors',
        '/packers',
        '/users',
        '/profile',
        '/admin',
        '/contact-requests',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
