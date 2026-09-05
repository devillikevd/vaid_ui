import type { MetadataRoute } from 'next';
import { CANONICAL_CONSULTATION_CATEGORIES } from '@/lib/consultationCategoriesData';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.vaididea.in';

  // 1. Core Public Hubs
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/vision`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/health-library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/wellness`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/patient/doctors`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 2. Canonical Doctor Category Discovery Pages
  const categoryRoutes: MetadataRoute.Sitemap = CANONICAL_CONSULTATION_CATEGORIES.map((cat) => ({
    url: `${baseUrl}/patient/doctors/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // 3. Dynamic Public Verified Doctor Profiles (Real backend API fetch)
  let doctorRoutes: MetadataRoute.Sitemap = [];
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.vaididea.in';
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
    // If backend is unavailable during build/request, fallback gracefully
    doctorRoutes = [];
  }

  return [...staticRoutes, ...categoryRoutes, ...doctorRoutes];
}
