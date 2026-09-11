import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vaididea.in';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

  // 1. Authoritative Core Public Hubs
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/doctors`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/specialties`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/health-library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/providers`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/vision`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // 2. Dynamic Public Verified Doctor Profiles (Real database records)
  let doctorRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/patients/doctors?global=true&limit=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const doctors = json.data || [];
      if (Array.isArray(doctors)) {
        doctorRoutes = doctors
          .filter((doc: any) => doc && doc.id && doc.is_approved !== false)
          .map((doc: any) => ({
            url: `${baseUrl}/doctors/${doc.id}`,
            lastModified: doc.updated_at ? new Date(doc.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          }));
      }
    }
  } catch {
    doctorRoutes = [];
  }

  // 3. Dynamic Genuine ICD-10 Disease Pages
  let diseaseRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/diseases/alphabet/A?limit=50`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const json = await res.json();
      const results = json.results || [];
      if (Array.isArray(results)) {
        diseaseRoutes = results
          .filter((d: any) => d && d.code)
          .map((d: any) => ({
            url: `${baseUrl}/disease/${encodeURIComponent(d.code)}`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
          }));
      }
    }
  } catch {
    diseaseRoutes = [];
  }

  return [...staticRoutes, ...doctorRoutes, ...diseaseRoutes];
}
