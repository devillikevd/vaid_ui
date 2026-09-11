import type { Metadata } from 'next';
import FitnessCenterLayoutClient from './FitnessCenterLayoutClient';

export const metadata: Metadata = {
  title: 'Fitness Center Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function FitnessCenterLayout({ children }: { children: React.ReactNode }) {
  return <FitnessCenterLayoutClient>{children}</FitnessCenterLayoutClient>;
}
