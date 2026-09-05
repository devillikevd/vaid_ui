import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wellness & Preventive Health',
  description:
    'Personalized wellness coaching, fitness routines, and preventive health routines integrated with the Vaididea connected healthcare ecosystem.',
  alternates: {
    canonical: '/wellness',
  },
  openGraph: {
    title: 'Wellness & Preventive Health | Vaididea',
    description:
      'Personalized wellness coaching, fitness routines, and preventive health routines integrated with the Vaididea connected healthcare ecosystem.',
    url: 'https://www.vaididea.in/wellness',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wellness & Preventive Health | Vaididea',
    description:
      'Personalized wellness coaching, fitness routines, and preventive health routines integrated with the Vaididea connected healthcare ecosystem.',
  },
};

const wellnessJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.vaididea.in/wellness#webpage',
      'url': 'https://www.vaididea.in/wellness',
      'name': 'Wellness & Preventive Health | Vaididea',
      'description':
        'Personalized wellness coaching, fitness routines, and preventive health routines integrated with the Vaididea connected healthcare ecosystem.',
      'isPartOf': {
        '@id': 'https://www.vaididea.in/#website',
      },
      'breadcrumb': {
        '@id': 'https://www.vaididea.in/wellness#breadcrumb',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.vaididea.in/wellness#breadcrumb',
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
          'name': 'Wellness',
          'item': 'https://www.vaididea.in/wellness',
        },
      ],
    },
  ],
};

export default function WellnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(wellnessJsonLd) }}
      />
      {children}
    </>
  );
}
