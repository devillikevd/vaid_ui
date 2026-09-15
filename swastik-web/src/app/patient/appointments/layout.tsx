import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patient Appointments | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientAppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
