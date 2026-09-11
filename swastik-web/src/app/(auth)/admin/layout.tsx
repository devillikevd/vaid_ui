import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Authentication',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
    },
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
