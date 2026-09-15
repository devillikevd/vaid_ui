import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diagnostic Centers & Lab Tests Near You | Vaididea',
  description:
    'Find certified pathology labs and diagnostic centers within 25 km. Book home sample collection or center visit for blood tests, scans, and health checkups on Vaididea.',
  alternates: {
    canonical: 'https://www.vaididea.in/patient/diagnostics',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Diagnostic Centers & Lab Tests Near You | Vaididea',
    description:
      'Find certified pathology labs and diagnostic centers within 25 km. Book home sample collection or center visit.',
    url: 'https://www.vaididea.in/patient/diagnostics',
    siteName: 'Vaididea',
    locale: 'en_IN',
    type: 'website',
  },
};

export default function PatientDiagnosticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
