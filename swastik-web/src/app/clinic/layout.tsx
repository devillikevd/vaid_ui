import type { Metadata } from 'next';
import ClinicLayoutClient from './ClinicLayoutClient';

export const metadata: Metadata = {
  title: 'Clinic Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutClient>{children}</ClinicLayoutClient>;
}
