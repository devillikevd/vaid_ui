'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ClinicPartnershipsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/clinic/network');
    }, [router]);

    return (
        <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-3" />
            <p className="text-sm font-bold text-gray-500">Redirecting to My Network...</p>
        </div>
    );
}
