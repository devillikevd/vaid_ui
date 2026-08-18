'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, Search, Calendar, Loader2, Plus, RefreshCw, Download, Inbox, SearchX, Pill, Clock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { Button } from '@/components/ui/Button';
import { useDoctorStore } from '@/stores/doctorStore';
import { usePrescriptionUpdates } from '@/hooks/useSocket';
import Link from 'next/link';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';

// --- Sub-components for better UX and Performance ---

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-yellow-100 rounded-sm px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

const PrescriptionSkeleton = () => (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="flex items-start gap-4 w-full sm:w-[70%]">
            <div className="p-3 rounded-xl bg-gray-200 dark:bg-gray-800 h-11 w-11 flex-shrink-0"></div>
            <div className="flex flex-col gap-3 w-full">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                <div className="flex gap-3">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-24"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-32"></div>
                </div>
                <div className="flex gap-2 mt-1">
                    <div className="h-6 bg-gray-50 dark:bg-gray-900/40 rounded w-20"></div>
                    <div className="h-6 bg-gray-50 dark:bg-gray-900/40 rounded w-24"></div>
                </div>
            </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-[30%] mt-4 sm:mt-0">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-20"></div>
            <div className="h-5 bg-gray-100 dark:bg-gray-800/50 rounded w-32"></div>
        </div>
    </div>
);

const EmptyState = ({ searchQuery, hasPrescriptions }: { searchQuery: string; hasPrescriptions: boolean }) => {
    let icon = <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />;
    let title = 'No prescriptions found';
    let desc = 'You have not written any prescriptions yet. Prescriptions are created during consultations.';

    if (searchQuery) {
        icon = <SearchX className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />;
        title = 'No results found';
        desc = `We couldn't find any prescriptions matching "${searchQuery}".`;
    } else if (!hasPrescriptions) {
        icon = <FileText className="h-12 w-12 text-emerald-200 dark:text-emerald-900 mb-4" />;
        title = 'No prescriptions written yet';
        desc = 'Start a consultation with a patient to write your first prescription.';
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{desc}</p>
        </div>
    );
};

// Memoized single row component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PrescriptionCard = React.memo(({ rx, searchQuery }: { rx: any; searchQuery: string }) => {
    const rxDate = rx.date ? new Date(rx.date) : rx.created_at ? new Date(rx.created_at) : null;
    const followUpDate = rx.followUpDate ? new Date(rx.followUpDate) : null;
    
    // Status color mapping
    const getStatusStyle = (status: string) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'active':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50';
            case 'expired':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
            case 'completed':
                return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
            case 'draft':
                return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    return (
        <Link 
            href={`/doctor/prescriptions/${rx.id}`} 
            className="group block p-5 transition-all duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800/60 last:border-b-0 border-l-4 border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600"
            aria-label={`View prescription for ${rx.patientName || 'Unknown Patient'}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4 sm:gap-5 w-full sm:w-[70%]">
                    <div className="flex-shrink-0 mt-0.5">
                        <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-colors group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:group-hover:bg-emerald-900/20 dark:group-hover:border-emerald-800/30 dark:group-hover:text-emerald-400">
                            <FileText className="h-5 w-5" />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                <HighlightedText text={rx.patientName || 'Unknown Patient'} highlight={searchQuery} />
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {rxDate ? rxDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set'}
                            </div>
                            {rx.diagnosis && (
                                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-0.5"></span>
                                    <span className="truncate max-w-[200px]">
                                        <HighlightedText text={rx.diagnosis} highlight={searchQuery} />
                                    </span>
                                </div>
                            )}
                        </div>

                        {rx.medications && rx.medications.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
                                    <Pill className="w-3.5 h-3.5" />
                                    {rx.medications.length} meds
                                </div>
                                {rx.medications.slice(0, 3).map((med: any, i: number) => (
                                    <span key={i} className="text-[11px] font-medium bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300">
                                        <HighlightedText text={med.medicineName || med.name} highlight={searchQuery} />
                                        <span className="text-gray-400 mx-1.5 font-normal">|</span>
                                        <span className="text-gray-500">{med.dosage}</span>
                                    </span>
                                ))}
                                {rx.medications.length > 3 && (
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md dark:bg-gray-800/40 dark:border-gray-800/50">
                                        +{rx.medications.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}
                        
                        {rx.notes && (
                            <div className="mt-3 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                                    <span className="font-semibold text-gray-600 dark:text-gray-300 not-italic mr-1">Notes:</span> 
                                    {rx.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col items-start sm:items-end gap-2.5 w-full sm:w-[30%] pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm ${getStatusStyle(rx.status)}`}>
                        {(rx.status || 'Active')}
                    </span>
                    
                    {followUpDate && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-md dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400 shadow-sm mt-1 sm:mt-0">
                            <Clock className="h-3.5 w-3.5" />
                            Follow-up: {followUpDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
});
PrescriptionCard.displayName = 'PrescriptionCard';

// --- Main Page Component ---

export default function DoctorPrescriptionsPage() {
    const { prescriptions, loadingPrescriptions, error, fetchPrescriptions, clearError } = useDoctorStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async () => { 
        setIsRefreshing(true);
        await fetchPrescriptions(); 
        setIsRefreshing(false);
    }, [fetchPrescriptions]);

    useEffect(() => { loadData(); }, [loadData]);

    // Real-time prescription updates
    usePrescriptionUpdates(() => { loadData(); });

    const filtered = useMemo(() => {
        return (prescriptions || []).filter((p: any) => {
            const query = searchQuery.toLowerCase();
            const matchesPatient = (p.patientName || '').toLowerCase().includes(query);
            const matchesDiagnosis = (p.diagnosis || '').toLowerCase().includes(query);
            const matchesMedicine = (p.medications || []).some((m: any) => 
                (m.medicineName || m.name || '').toLowerCase().includes(query)
            );
            return matchesPatient || matchesDiagnosis || matchesMedicine;
        });
    }, [prescriptions, searchQuery]);

    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 10);
    const paginatedItems = useMemo(() => paginate(page), [paginate, page]);

    const handleExport = () => {
        downloadCSV(filtered, [
            { key: 'patientName', label: 'Patient' },
            { key: 'diagnosis', label: 'Diagnosis' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Status' },
        ], 'prescriptions');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Prescriptions</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 font-medium">Manage and review your patient prescriptions</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleExport} 
                        leftIcon={<Download className="h-4 w-4" />}
                        className="shadow-sm hover:shadow transition-shadow bg-white dark:bg-gray-800"
                    >
                        Export CSV
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={loadData} 
                        disabled={isRefreshing}
                        leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                        className="shadow-sm hover:shadow transition-shadow bg-white dark:bg-gray-800"
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Link href="/doctor/prescriptions/new">
                        <Button leftIcon={<Plus className="h-4 w-4" />}>
                            New Prescription
                        </Button>
                    </Link>
                </div>
            </div>

            <DoctorPortalCard className="!p-0 overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="relative max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                            <Search className="h-4 w-4" />
                        </div>
                        <Input 
                            type="text"
                            placeholder="Search by patient, diagnosis, or medicine..." 
                            value={searchQuery} 
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} 
                            className="pl-10 w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                            aria-label="Search prescriptions"
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {loadingPrescriptions && prescriptions.length === 0 ? (
                        Array.from({ length: 4 }).map((_, i) => <PrescriptionSkeleton key={i} />)
                    ) : paginatedItems.length === 0 ? (
                        <EmptyState searchQuery={searchQuery} hasPrescriptions={prescriptions.length > 0} />
                    ) : (
                        paginatedItems.map((rx) => (
                            <PrescriptionCard key={rx.id} rx={rx} searchQuery={searchQuery} />
                        ))
                    )}
                </div>
                
                {!loadingPrescriptions && filtered.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                    />
                )}
            </DoctorPortalCard>
        </div>
    );
}
