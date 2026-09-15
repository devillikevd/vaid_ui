import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find Doctors — Book In-Person & Online Consultations | Vaididea',
  description:
    'Discover verified doctors by specialty near you or online. Browse in-person and video consultation options, compare fees, and book appointments instantly on Vaididea.',
  alternates: {
    canonical: 'https://www.vaididea.in/patient/doctors',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Find Doctors — Book In-Person & Online Consultations | Vaididea',
    description:
      'Discover verified doctors by specialty near you or online. Compare fees and book appointments instantly.',
    url: 'https://www.vaididea.in/patient/doctors',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function PatientDoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
