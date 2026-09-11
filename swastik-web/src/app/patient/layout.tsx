import { Metadata } from 'next';
import PatientLayoutClient from './PatientLayoutClient';

export const metadata: Metadata = {
    title: 'Patient Portal',
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
