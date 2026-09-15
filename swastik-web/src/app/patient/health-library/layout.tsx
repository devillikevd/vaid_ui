import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Health Library | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientHealthLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
