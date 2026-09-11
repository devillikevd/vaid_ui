import type { Metadata } from 'next';
import DiagnosticCenterLayoutClient from './DiagnosticCenterLayoutClient';

export const metadata: Metadata = {
  title: 'Diagnostic Center Portal | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function DiagnosticCenterLayout({ children }: { children: React.ReactNode }) {
  return <DiagnosticCenterLayoutClient>{children}</DiagnosticCenterLayoutClient>;
}
