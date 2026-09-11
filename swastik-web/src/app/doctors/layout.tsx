import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find & Book Trusted Doctors | Vaididea',
  description:
    'Search verified doctor specialists, compare consultation fees and credentials, and book in-person or video appointments across India on Vaididea.',
  alternates: {
    canonical: 'https://www.vaididea.in/doctors',
  },
  openGraph: {
    title: 'Find & Book Trusted Doctors | Vaididea',
    description:
      'Search verified doctor specialists, compare consultation fees and credentials, and book in-person or video appointments across India on Vaididea.',
    url: 'https://www.vaididea.in/doctors',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find & Book Trusted Doctors | Vaididea',
    description:
      'Search verified doctor specialists, compare consultation fees and credentials, and book in-person or video appointments across India on Vaididea.',
  },
};

const doctorsDirectoryJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': 'https://www.vaididea.in/doctors#webpage',
      'url': 'https://www.vaididea.in/doctors',
      'name': 'Find & Book Trusted Doctors | Vaididea',
      'description':
        'Search verified doctor specialists, compare consultation fees and credentials, and book in-person or video appointments across India on Vaididea.',
      'isPartOf': {
        '@id': 'https://www.vaididea.in/#website',
      },
      'breadcrumb': {
        '@id': 'https://www.vaididea.in/doctors#breadcrumb',
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://www.vaididea.in/doctors#breadcrumb',
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
          'name': 'Find Doctors',
          'item': 'https://www.vaididea.in/doctors',
        },
      ],
    },
  ],
};

export default function DoctorsDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(doctorsDirectoryJsonLd) }}
      />
      {children}
    </>
  );
}
