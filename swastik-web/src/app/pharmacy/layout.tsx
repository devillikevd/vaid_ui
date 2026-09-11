import type { Metadata } from 'next';
import PharmacyLayoutClient from './PharmacyLayoutClient';

export const metadata: Metadata = {
  title: 'Pharmacy Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <PharmacyLayoutClient>{children}</PharmacyLayoutClient>;
}
