import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vaididea.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API endpoints
          '/api/',
          // Admin portal
          '/admin/',
          // Provider dashboards (all private)
          '/doctor/',
          '/hospital/',
          '/clinic/',
          '/diagnostic-center/',
          '/pharmacy/',
          '/fitness-center/',
          '/wellness/',
          '/agent/',
          // Consultation / private sessions
          '/consultation/',
          '/health-card/',
          // Auth flows (non-SEO)
          '/login/',
          '/register/',
          '/forgot-password/',
          '/reset-password/',
          '/verify-email/',
          // Private patient portal pages
          // NOTE: /patient/doctors, /patient/hospitals, /patient/clinics,
          //       /patient/diagnostics and /patient/doctors/category/* are
          //       intentionally NOT listed here — they are public discovery pages.
          '/patient/appointments',
          '/patient/records',
          '/patient/digital-health-card',
          '/patient/health-id',
          '/patient/assistant',
          '/patient/community',
          '/patient/pharmacy',
          '/patient/health-library',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
