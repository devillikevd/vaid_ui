import type { Metadata } from 'next';
import HospitalLayoutClient from './HospitalLayoutClient';

export const metadata: Metadata = {
  title: 'Hospital Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return <HospitalLayoutClient>{children}</HospitalLayoutClient>;
}
