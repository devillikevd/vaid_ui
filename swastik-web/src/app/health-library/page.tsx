'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import HealthLibraryExplorer from '@/components/health-library/HealthLibraryExplorer';
import VaidideaLogo from '@/components/shared/VaidideaLogo';

function MainHealthLibraryContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || searchParams.get('query') || '';

    return (
        <div className="min-h-screen bg-[#FAF8F4] text-stone-800 font-sans selection:bg-vd-forest/15 flex flex-col">
            {/* Top Navigation Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 py-3 px-4 sm:px-8 shadow-2xs">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-medium text-stone-600 hover:text-vd-forest transition-colors group cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Return to Main Website</span>
                    </Link>

                    <Link href="/" aria-label="Vaididea Home" className="flex items-center gap-2 group cursor-pointer">
                        <VaidideaLogo className="w-5 h-5 text-vd-forest transition-transform group-hover:scale-105" />
                        <span className="font-heading font-bold text-vd-forest text-sm uppercase tracking-wide">
                            Vaididea Health Library
                        </span>
                    </Link>

                    <Link
                        href="/patient"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-vd-forest text-white font-bold hover:bg-vd-forest-deep transition-all shadow-2xs"
                    >
                        <span>Patient Portal</span>
                    </Link>
                </div>
            </header>

            {/* Content Explorer Shell */}
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
                <HealthLibraryExplorer portalMode={false} initialQuery={query} />
            </main>

            {/* Footer */}
            <footer className="border-t border-stone-200/80 bg-white py-6 px-4 text-center text-xs text-stone-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p>© {new Date().getFullYear()} VAIDIDEA Healthcare Technologies. Canonical Medical Index.</p>
                    <div className="flex items-center gap-4 text-stone-600 font-medium">
                        <Link href="/patient/doctors" className="hover:text-vd-forest">Find Doctors</Link>
                        <Link href="/patient" className="hover:text-vd-forest">Patient Portal</Link>
                        <Link href="/vision" className="hover:text-vd-forest">Our Vision</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default function HealthLibraryPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 text-vd-forest animate-spin" />
                </div>
            }
        >
            <MainHealthLibraryContent />
        </Suspense>
    );
}
