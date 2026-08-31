'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import HealthLibraryExplorer from '@/components/health-library/HealthLibraryExplorer';
import { Loader2 } from 'lucide-react';

function PatientHealthLibraryContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || searchParams.get('query') || '';

    return (
        <div className="w-full">
            <HealthLibraryExplorer portalMode={true} initialQuery={query} />
        </div>
    );
}

export default function PatientHealthLibraryPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[300px] bg-white rounded-3xl border border-stone-200/80 p-8">
                    <Loader2 className="w-8 h-8 text-vd-forest animate-spin" />
                </div>
            }
        >
            <PatientHealthLibraryContent />
        </Suspense>
    );
}
