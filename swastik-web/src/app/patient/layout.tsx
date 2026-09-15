import { Metadata } from 'next';
import PatientLayoutClient from './PatientLayoutClient';

// Patient layout metadata:
//
// Default: noindex — protects the /patient dashboard and any private sub-route
// that does NOT have its own layout.
//
// Public discovery sub-routes (doctors, hospitals, clinics, diagnostics) each have
// their own layout.tsx that explicitly overrides to index: true.
// In Next.js App Router, a child segment's metadata fields always override the parent's.
export const metadata: Metadata = {
    title: 'Patient Portal | Vaididea',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
    },
};

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return <PatientLayoutClient>{children}</PatientLayoutClient>;
}

