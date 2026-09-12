import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import ForgotPasswordRoleClient from './ForgotPasswordRoleClient';

interface Props {
    params: Promise<{ role: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { role } = await params;
    const formattedRole = role ? role.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Account';
    return {
        title: `Reset ${formattedRole} Password | Vaididea`,
        description: `Reset your ${formattedRole} portal password securely on Vaididea.`,
        robots: {
            index: false,
            follow: false,
        },
    };
}

export default async function ForgotPasswordPage({ params }: Props) {
    const { role } = await params;
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#09090B] font-sans">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <ForgotPasswordRoleClient role={role} />
        </Suspense>
    );
}
