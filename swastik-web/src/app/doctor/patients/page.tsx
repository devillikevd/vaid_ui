'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Search, User, Phone, Mail, Loader2, RefreshCw, AlertCircle, Download, Calendar, FileText, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDoctorStore, type DoctorPatient } from '@/stores/doctorStore';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';

export default function DoctorPatientsPage() {
    const { patients, loadingPatients, error, patientsPagination, fetchPatients, clearError } = useDoctorStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const pageSize = 12;

    useEffect(() => {
        fetchPatients(page, deferredSearchQuery, pageSize);
    }, [deferredSearchQuery, fetchPatients, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    if (loadingPatients && patients.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading patients...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); fetchPatients(page, deferredSearchQuery, pageSize); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Records</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Track visit history, open records, and reach patients faster.</p>
                </div>
                <Button variant="outline" onClick={() => downloadCSV(patients, [
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'totalVisits', label: 'Total Visits' },
                    { key: 'lastVisit', label: 'Last Visit' },
                ], 'patients')} leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button>
            </div>

            <Card padding="sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full lg:max-w-md">
                        <Input placeholder="Search by patient name, email, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                            {patientsPagination.total || 0} patients
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                            Page {patientsPagination.page || page} of {patientsPagination.totalPages || 1}
                        </span>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patients.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                        No patients found for this search yet.
                    </div>
                ) : patients.map((patient: DoctorPatient) => (
                    <Card key={patient.id} padding="md" className="relative overflow-hidden border-gray-200/80 bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-gray-950">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-cyan-400" />
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{patient.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {[patient.age ? `${patient.age} yrs` : null, patient.gender, patient.bloodGroup].filter(Boolean).join(' • ') || 'Profile details will appear after the first visit'}
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                                {patient.totalVisits || 0} visits
                            </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            {patient.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{patient.phone}</p>}
                            {patient.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{patient.email}</p>}
                            <p className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Last visit: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN') : 'Not recorded yet'}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-xs text-slate-600 dark:bg-gray-800/80 dark:text-gray-300">
                            <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Record ready for review
                            </span>
                            <Link href={`/doctor/patients/${patient.id}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                                View record
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </Card>
                ))}
            </div>
            <Pagination
                currentPage={page}
                totalPages={patientsPagination.totalPages || 1}
                onPageChange={setPage}
                totalItems={patientsPagination.total || patients.length}
                itemsPerPage={pageSize}
            />
        </div>
    );
}
