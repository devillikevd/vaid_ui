import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Health ID (ABHA) | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientHealthIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
