import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vaididea.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/doctor/',
          '/hospital/',
          '/clinic/',
          '/diagnostic-center/',
          '/pharmacy/',
          '/fitness-center/',
          '/wellness/',
          '/patient/',
          '/consultation/',
          '/health-card/',
          '/agent/',
          '/login/',
          '/register/',
          '/forgot-password/',
          '/reset-password/',
          '/verify-email/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
