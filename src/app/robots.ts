import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login'],
      disallow: ['/api/', '/dashboard', '/establishment', '/map', '/producer-log', '/data-entry', '/engineer-log', '/collectors', '/packers', '/users', '/predictions'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
