import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agent Tracking',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
    },
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
