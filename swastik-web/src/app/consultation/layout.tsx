import type { Metadata } from 'next';
import ConsultationClientLayout from './ConsultationClientLayout';

export const metadata: Metadata = {
  title: 'Consultation | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return <ConsultationClientLayout>{children}</ConsultationClientLayout>;
}
