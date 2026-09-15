import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Healthcare Clinics Near You | Vaididea',
  description:
    'Locate verified outpatient clinics, specialty practices, family medicine centers, and walk-in consultation facilities within 25 km. View clinic hours and book appointments on Vaididea.',
  alternates: {
    canonical: 'https://www.vaididea.in/patient/clinics',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Find Healthcare Clinics Near You | Vaididea',
    description:
      'Locate verified outpatient clinics, specialty practices, family medicine centers, and walk-in consultation facilities within 25 km.',
    url: 'https://www.vaididea.in/patient/clinics',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function PatientClinicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
