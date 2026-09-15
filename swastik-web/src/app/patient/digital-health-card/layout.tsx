import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital Health Card | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientDigitalHealthCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
