import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Health Library & Clinical Guidance',
  description:
    'Evidence-based healthcare library and medical information indexed by standard clinical classifications. Search symptoms, conditions, and treatment pathways on Vaididea.',
  alternates: {
    canonical: '/health-library',
  },
  openGraph: {
    title: 'Health Library & Clinical Guidance | Vaididea',
    description:
      'Evidence-based healthcare library and medical information indexed by standard clinical classifications.',
    url: 'https://www.vaididea.in/health-library',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Health Library & Clinical Guidance | Vaididea',
    description:
      'Evidence-based healthcare library and medical information indexed by standard clinical classifications.',
  },
};

const healthLibraryJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'MedicalWebPage',
      '@id': 'https://www.vaididea.in/health-library#webpage',
      'url': 'https://www.vaididea.in/health-library',
      'name': 'Health Library & Clinical Guidance | Vaididea',
      'description':
        'Evidence-based healthcare library and medical information indexed by standard clinical classifications. Search symptoms, conditions, and treatment pathways on Vaididea.',
      'isPartOf': {
        '@id': 'https://www.vaididea.in/#website',
      },
      'breadcrumb': {
        '@id': 'https://www.vaididea.in/health-library#breadcrumb',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.vaididea.in/health-library#breadcrumb',
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
      ],
    },
  ],
};

export default function HealthLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(healthLibraryJsonLd) }}
      />
      {children}
    </>
  );
}
