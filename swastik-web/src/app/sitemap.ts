import type { MetadataRoute } from 'next';
import { buildCanonicalApiUrl } from '@/lib/env';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vaididea.in';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function canonicalUrl(path: string): string {
  // Ensure no double slashes, no query strings, always use BASE_URL
  const clean = path.replace(/\/+/g, '/').replace(/^\/?/, '/');
  return `${BASE_URL}${clean}`;
}

/**
 * Fetch all approved doctor profiles using paginated requests.
 * The backend /patients/doctors endpoint accepts page + limit.
 * We paginate until we get all records to avoid silent truncation.
 */
async function fetchAllDoctors(): Promise<MetadataRoute.Sitemap> {
  const PAGE_SIZE = 100; // max safe page size for this endpoint
  const routes: MetadataRoute.Sitemap = [];
  let page = 1;
  let totalFetched = 0;
  let totalExpected = Infinity;

  try {
    while (totalFetched < totalExpected) {
      const url = buildCanonicalApiUrl(
        `/patients/doctors?global=true&limit=${PAGE_SIZE}&page=${page}`
      );
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) break;

      const json = await res.json();
      const doctors: any[] = json.data || [];

      // Capture total on first page
      if (page === 1) {
        totalExpected = json.total ?? json.count ?? doctors.length;
      }

      if (!Array.isArray(doctors) || doctors.length === 0) break;

      for (const doc of doctors) {
        if (!doc?.id || doc.is_approved === false) continue;
        routes.push({
          url: canonicalUrl(`/doctors/${doc.id}`),
          lastModified: doc.updated_at ? new Date(doc.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }

      totalFetched += doctors.length;
      page++;

      // Safety: stop if a page returns fewer results than PAGE_SIZE (last page)
      if (doctors.length < PAGE_SIZE) break;
    }
  } catch {
    // Graceful degradation — sitemap builds without doctor URLs if API is unavailable
  }

  return routes;
}

/**
 * Fetch ALL disease codes across every ICD-10 alphabet letter using pagination.
 *
 * Strategy:
 * 1. Fetch /diseases/stats to get per-letter counts
 * 2. For each letter with count > 0, paginate through all pages (limit=100, max enforced by API)
 * 3. Collect all unique disease codes
 *
 * API constraint: limit is capped at 100 server-side (/diseases/alphabet/:letter)
 */
async function fetchAllDiseases(): Promise<MetadataRoute.Sitemap> {
  const PAGE_SIZE = 100; // server-side max
  const routes: MetadataRoute.Sitemap = [];
  const seenCodes = new Set<string>();

  try {
    // Step 1: Get per-letter counts from stats endpoint
    const statsRes = await fetch(buildCanonicalApiUrl('/diseases/stats'), {
      next: { revalidate: 86400 },
    });

    let letterCounts: Array<{ first_letter: string; cnt: number }> = [];

    if (statsRes.ok) {
      const stats = await statsRes.json();
      letterCounts = stats.by_letter || [];
    }

    // Fallback: if stats unavailable, try all letters A-Z + digits 0-9
    if (letterCounts.length === 0) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
      letterCounts = letters.map((l) => ({ first_letter: l, cnt: PAGE_SIZE }));
    }

    // Step 2: For each letter with records, paginate fully
    const fetchPromises = letterCounts
      .filter((lc) => lc.cnt > 0)
      .map(async (lc) => {
        const letter = lc.first_letter;
        const totalForLetter = lc.cnt;
        const totalPages = Math.ceil(totalForLetter / PAGE_SIZE);
        const letterRoutes: MetadataRoute.Sitemap = [];

        for (let p = 1; p <= totalPages; p++) {
          try {
            const url = buildCanonicalApiUrl(
              `/diseases/alphabet/${encodeURIComponent(letter)}?limit=${PAGE_SIZE}&page=${p}`
            );
            const res = await fetch(url, { next: { revalidate: 86400 } });
            if (!res.ok) break;

            const json = await res.json();
            const results: any[] = json.results || [];
            if (!Array.isArray(results) || results.length === 0) break;

            for (const d of results) {
              if (!d?.code || seenCodes.has(d.code)) continue;
              seenCodes.add(d.code);
              letterRoutes.push({
                url: canonicalUrl(`/disease/${encodeURIComponent(d.code)}`),
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.7,
              });
            }

            if (results.length < PAGE_SIZE) break; // last page
          } catch {
            break; // skip remainder of this letter on error
          }
        }

        return letterRoutes;
      });

    // Run all letter fetches in parallel (bounded by alphabet size ~36 concurrent requests)
    const allLetterRoutes = await Promise.all(fetchPromises);
    for (const lr of allLetterRoutes) {
      routes.push(...lr);
    }
  } catch {
    // Graceful degradation
  }

  return routes;
}

// ─────────────────────────────────────────────────────────────
// Main sitemap export
// ─────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static core public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: canonicalUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: canonicalUrl('/doctors'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: canonicalUrl('/specialties'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: canonicalUrl('/health-library'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: canonicalUrl('/providers'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: canonicalUrl('/vision'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Public patient discovery hub pages
    {
      url: canonicalUrl('/patient/doctors'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: canonicalUrl('/patient/hospitals'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: canonicalUrl('/patient/clinics'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: canonicalUrl('/patient/diagnostics'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // 2. Specialty category pages (canonical public routes under /patient/doctors/category/)
  // Slugs validated against src/lib/consultationCategoriesData.ts
  const categoryRoutes: MetadataRoute.Sitemap = [
    'general-physician',
    'dermatologist',
    'cardiologist',
    'pediatrician',
    'orthopedist',
    'gynecologist',
    'ent-specialist',
    'neurologist',
    'psychiatrist',
    'gastroenterologist',
    'pulmonology',
    'ophthalmologist',
    'dentist',
    'urology',
    'endocrinology',
    'ayurveda',
    'homeopathy',
    'physiotherapy',
  ].map((slug) => ({
    url: canonicalUrl(`/patient/doctors/category/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));


  // 3. Dynamic doctor profiles + disease pages (fetched in parallel)
  const [doctorRoutes, diseaseRoutes] = await Promise.all([
    fetchAllDoctors(),
    fetchAllDiseases(),
  ]);

  // Deduplicate by URL (safety net)
  const allRoutes = [
    ...staticRoutes,
    ...categoryRoutes,
    ...doctorRoutes,
    ...diseaseRoutes,
  ];

  const seen = new Set<string>();
  return allRoutes.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
