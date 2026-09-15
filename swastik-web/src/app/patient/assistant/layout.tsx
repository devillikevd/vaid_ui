import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Health Assistant | Vaididea',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function PatientAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
