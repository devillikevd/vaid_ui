import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Healthcare Provider Solutions — Join Vaididea Network | Vaididea',
  description:
    'Partner with Vaididea to grow your medical practice, clinic, hospital, diagnostic center, or pharmacy with integrated healthcare tools.',
  alternates: {
    canonical: '/providers',
  },
  openGraph: {
    title: 'Healthcare Provider Solutions — Join Vaididea Network | Vaididea',
    description:
      'Partner with Vaididea to grow your medical practice, clinic, hospital, diagnostic center, or pharmacy with integrated healthcare tools.',
    url: 'https://www.vaididea.in/providers',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Healthcare Provider Solutions — Join Vaididea Network | Vaididea',
    description:
      'Partner with Vaididea to grow your medical practice, clinic, hospital, diagnostic center, or pharmacy with integrated healthcare tools.',
  },
};

const providersJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.vaididea.in/providers#webpage',
      'url': 'https://www.vaididea.in/providers',
      'name': 'Healthcare Provider Solutions — Join Vaididea Network | Vaididea',
      'description':
        'Partner with Vaididea to grow your medical practice, clinic, hospital, diagnostic center, or pharmacy with integrated healthcare tools.',
      'isPartOf': {
        '@id': 'https://www.vaididea.in/#website',
      },
      'breadcrumb': {
        '@id': 'https://www.vaididea.in/providers#breadcrumb',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.vaididea.in/providers#breadcrumb',
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
          'name': 'For Providers',
          'item': 'https://www.vaididea.in/providers',
        },
      ],
    },
  ],
};

export default function ProvidersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(providersJsonLd) }}
      />
      {children}
    </>
  );
}
