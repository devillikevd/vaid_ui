import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medical Records | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
