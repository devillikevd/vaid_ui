import type { Metadata } from 'next';
import DoctorLayoutClient from './DoctorLayoutClient';

export const metadata: Metadata = {
  title: 'Doctor Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DoctorLayoutClient>{children}</DoctorLayoutClient>;
}
