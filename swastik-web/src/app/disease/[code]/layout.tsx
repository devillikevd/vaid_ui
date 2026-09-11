import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildJsonLdString } from '@/lib/sanitize';

type Props = {
  params: Promise<{ code: string }>;
};

async function fetchDisease(code: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const res = await fetch(`${apiBase}/diseases/disease/${encodeURIComponent(code)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.code ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const disease = await fetchDisease(code);

  if (!disease) {
    return {
      title: 'Condition Not Found | Vaididea',
      description: 'The requested ICD-10 medical condition could not be found in the Vaididea Health Library.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const cleanName = disease.name || 'Medical Condition';
  const icdCode = disease.code || code;
  const title = `${cleanName} (${icdCode}) — Symptoms, Causes & Care | Vaididea`;
  
  const rawDesc = disease.summary || disease.overview || '';
  const cleanDesc = rawDesc
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const description = cleanDesc
    ? cleanDesc.slice(0, 160)
    : `Learn about ${cleanName} (${icdCode}), clinical symptoms, causes, diagnostic pathways, and when to see a specialist on Vaididea.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/disease/${icdCode}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.vaididea.in/disease/${icdCode}`,
      siteName: 'Vaididea',
      locale: 'en_IN',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function DiseaseDetailLayout({
  params,
  children,
}: {
  params: Promise<any>;
  children: React.ReactNode;
}) {
  const { code } = await params;
  const disease = await fetchDisease(code);

  if (!disease) {
    notFound();
  }

  const cleanName = disease.name || 'Medical Condition';
  const icdCode = disease.code || code;
  const rawDesc = disease.summary || disease.overview || '';
  const cleanDesc = rawDesc
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const description = cleanDesc ? cleanDesc.slice(0, 200) : `${cleanName} (${icdCode}) medical reference guide.`;

  const diseaseJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalWebPage',
        '@id': `https://www.vaididea.in/disease/${icdCode}#webpage`,
        'url': `https://www.vaididea.in/disease/${icdCode}`,
        'name': `${cleanName} (${icdCode}) — Symptoms, Causes & Care | Vaididea`,
        'description': description,
        'isPartOf': {
          '@id': 'https://www.vaididea.in/#website',
        },
        'breadcrumb': {
          '@id': `https://www.vaididea.in/disease/${icdCode}#breadcrumb`,
        },
        'about': {
          '@type': 'MedicalCondition',
          'name': cleanName,
          'code': {
            '@type': 'MedicalCode',
            'code': icdCode,
            'codingSystem': 'ICD-10-CM',
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `https://www.vaididea.in/disease/${icdCode}#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://www.vaididea.in',
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Health Library',
            'item': 'https://www.vaididea.in/health-library',
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': `${cleanName} (${icdCode})`,
            'item': `https://www.vaididea.in/disease/${icdCode}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json">{buildJsonLdString(diseaseJsonLd)}</script>
      {children}
    </>
  );
}
