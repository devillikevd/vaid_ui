import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Medicines | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientPharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
