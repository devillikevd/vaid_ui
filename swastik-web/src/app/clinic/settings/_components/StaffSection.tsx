'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { SettingsSection, SectionLoader, StatusMessage, type SectionStatus } from './SettingsSection';

interface RosterDoctor {
    id: string;
    name: string;
    specialization: string;
    status: string;
    is_approved: boolean;
}

export function StaffSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [doctors, setDoctors] = useState<RosterDoctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [status, setStatus] = useState<SectionStatus | null>(null);

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    const fetchDoctors = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setStatus(null);
        try {
            const res = await clinicApi.getDoctors({ page: 1, limit: 100 });
            if (res.success) {
                setDoctors((res as any).data || []);
            } else {
                setLoadError(res.error || 'Failed to load doctors');
            }
        } catch {
            setLoadError('Failed to connect to server.');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchDoctors();
    }, [fetchDoctors]);

    return (
        <SettingsSection
            id="staff"
            title="Doctors & Staff"
            description="Doctors affiliated with your clinic."
            icon={<Users className="h-5 w-5" />}
            actions={
                <Link
                    href="/clinic/doctors"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    Manage Doctors <ArrowRight className="h-4 w-4" />
                </Link>
            }
        >
            {isLoading ? (
                <SectionLoader />
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-10">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchDoctors()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <StatusMessage status={status} />
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
                            <Users className="h-4 w-4" />
                        </span>
                        <span>
                            <strong className="text-gray-900 dark:text-gray-100">{doctors.length}</strong> doctor
                            {doctors.length === 1 ? '' : 's'} on your roster
                        </span>
                    </div>
                    {doctors.length > 0 && (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                            {doctors.slice(0, 8).map((doctor) => (
                                <li key={doctor.id} className="flex items-center justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{doctor.name}</p>
                                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                            {doctor.specialization || 'General'} · {doctor.is_approved ? 'Verified' : 'Pending verification'}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs text-gray-400">{doctor.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {doctors.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No doctors on your roster yet.</p>
                            <Link href="/clinic/doctors" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline">
                                Invite your first doctor
                            </Link>
                        </div>
                    )}
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Staff roles & permissions</h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Role-based permissions for receptionists, nurses and accountants are not available yet. Only clinic
                            owners and invited doctors currently access the Clinic Portal, and all access is enforced on the server.
                        </p>
                    </div>
                </div>
            )}
        </SettingsSection>
    );
}
