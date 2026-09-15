import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientCommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
