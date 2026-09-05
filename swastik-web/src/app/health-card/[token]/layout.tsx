import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital Health Card',
  description: 'Emergency digital health card view.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function HealthCardTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
