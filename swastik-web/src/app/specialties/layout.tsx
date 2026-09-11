import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medical Specialties Directory — Find Specialists | Vaididea',
  description:
    'Browse verified clinical specialties including General Medicine, Cardiology, Dermatology, Orthopedics, Pediatrics, and more on Vaididea.',
  alternates: {
    canonical: '/specialties',
  },
  openGraph: {
    title: 'Medical Specialties Directory — Find Specialists | Vaididea',
    description:
      'Browse verified clinical specialties including General Medicine, Cardiology, Dermatology, Orthopedics, Pediatrics, and more on Vaididea.',
    url: 'https://www.vaididea.in/specialties',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medical Specialties Directory — Find Specialists | Vaididea',
    description:
      'Browse verified clinical specialties including General Medicine, Cardiology, Dermatology, Orthopedics, Pediatrics, and more on Vaididea.',
  },
};

const specialtiesJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': 'https://www.vaididea.in/specialties#webpage',
      'url': 'https://www.vaididea.in/specialties',
      'name': 'Medical Specialties Directory — Find Specialists | Vaididea',
      'description':
        'Browse verified clinical specialties including General Medicine, Cardiology, Dermatology, Orthopedics, Pediatrics, and more on Vaididea.',
      'isPartOf': {
        '@id': 'https://www.vaididea.in/#website',
      },
      'breadcrumb': {
        '@id': 'https://www.vaididea.in/specialties#breadcrumb',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.vaididea.in/specialties#breadcrumb',
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
          'name': 'Specialties',
          'item': 'https://www.vaididea.in/specialties',
        },
      ],
    },
  ],
};

export default function SpecialtiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(specialtiesJsonLd) }}
      />
      {children}
    </>
  );
}
