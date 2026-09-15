import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Hospitals & Medical Centers Near You | Vaididea',
  description:
    'Locate verified hospitals, ICUs, 24/7 emergency centers, and medical departments within 25 km of your location. Compare facilities and find hospital doctors on Vaididea.',
  alternates: {
    canonical: 'https://www.vaididea.in/patient/hospitals',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Find Hospitals & Medical Centers Near You | Vaididea',
    description:
      'Locate verified hospitals, ICUs, 24/7 emergency centers, and medical departments within 25 km of your location.',
    url: 'https://www.vaididea.in/patient/hospitals',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function PatientHospitalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
