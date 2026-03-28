'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { FileText, Search, Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { pharmacyApi } from '@/lib/api';
import { useOrderUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 10;

export default function PharmacyPrescriptionsPage() {
    const { prescriptions, prescriptionsPagination, loadingPrescriptions, error, fetchPrescriptions, clearError } = usePharmacyStore();
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [tab, setTab] = useState<'all' | 'pending' | 'dispensed'>('all');

    const loadPrescriptions = useCallback(() => {
        void fetchPrescriptions({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            status: tab === 'all' ? undefined : tab,
        });
    }, [deferredSearchQuery, fetchPrescriptions, page, tab]);

    useEffect(() => {
        loadPrescriptions();
    }, [loadPrescriptions]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, tab]);

    useOrderUpdates(
        useCallback(() => {
            loadPrescriptions();
        }, [loadPrescriptions]),
        useCallback(() => {
            loadPrescriptions();
        }, [loadPrescriptions])
    );

    const handleDispense = async (prescriptionId: string) => {
        setActionLoading(prescriptionId);
        try {
            const response = await pharmacyApi.dispensePrescription(prescriptionId);
            if (response.success) {
                loadPrescriptions();
                toast.success('Prescription Dispensed', 'Prescription has been dispensed');
            } else {
                toast.error('Dispense Failed', response.error || 'Could not update prescription');
            }
        } catch {
            toast.error('Dispense Failed', 'Network error while updating prescription');
        }
        setActionLoading(null);
    };

    if (loadingPrescriptions && prescriptions.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
    }

    if (error && prescriptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); loadPrescriptions(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prescriptions</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage linked prescriptions with full patient, doctor, and medicine context</p>
                </div>
                <Button onClick={loadPrescriptions} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {(['all', 'pending', 'dispensed'] as const).map((currentTab) => (
                        <button
                            key={currentTab}
                            onClick={() => setTab(currentTab)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                                tab === currentTab
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {currentTab}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <Input
                        placeholder="Search by patient, doctor, medicine, or prescription ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                </div>
            </div>

            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {prescriptions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400"><FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />No prescriptions found for the current filters</div>
                    ) : prescriptions.map((prescription: any) => (
                        <div key={prescription.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex-shrink-0 rounded-xl bg-orange-100 p-2.5 text-orange-700"><FileText className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{prescription.patientName || 'Patient'}</p>
                                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                        {prescription.medications?.length || 0} medications
                                        {prescription.doctorName ? ` · Dr. ${prescription.doctorName}` : ''}
                                        {prescription.date ? ` · ${new Date(prescription.date).toLocaleDateString('en-IN')}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-3">
                                <StatusBadge status={prescription.status || 'pending'} size="sm" />
                                {['pending', 'ready'].includes(prescription.status) ? (
                                    <button
                                        onClick={() => void handleDispense(prescription.id)}
                                        disabled={actionLoading === prescription.id}
                                        className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                                        title="Dispense"
                                    >
                                        {actionLoading === prescription.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                        <span>Dispense</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Pagination
                currentPage={prescriptionsPagination.page}
                totalPages={prescriptionsPagination.totalPages}
                onPageChange={setPage}
                totalItems={prescriptionsPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
        </div>
    );
}
