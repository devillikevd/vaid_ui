'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Search, User, Phone, Mail, Loader2, RefreshCw, AlertCircle, Download, Calendar, ArrowRight, Filter, ArrowDownUp, Users } from 'lucide-react';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { Button } from '@/components/ui/Button';
import { useDoctorStore, type DoctorPatient } from '@/stores/doctorStore';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';

// --- Sub-components ---

const PatientSkeleton = () => (
    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="flex items-center gap-4 w-1/3">
            <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
            <div className="space-y-2 w-full">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800/50 rounded w-1/2"></div>
            </div>
        </div>
        <div className="hidden md:block space-y-2 w-1/4">
            <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-2/3"></div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-3/4"></div>
        </div>
        <div className="w-1/6">
            <div className="h-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg w-24"></div>
        </div>
        <div className="w-1/6 text-center">
            <div className="h-6 bg-gray-100 dark:bg-gray-800/50 rounded-full w-16 mx-auto"></div>
        </div>
        <div className="w-[100px] text-right">
            <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
        </div>
    </div>
);

// --- Main Page Component ---

export default function DoctorPatientsPage() {
    const { patients, loadingPatients, error, patientsPagination, fetchPatients, clearError } = useDoctorStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('recent');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const pageSize = 12;

    useEffect(() => {
        fetchPatients(page, deferredSearchQuery, pageSize, filter, sort);
    }, [deferredSearchQuery, filter, sort, fetchPatients, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, filter, sort]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                <Button onClick={() => { clearError(); fetchPatients(page, deferredSearchQuery, pageSize); }} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Patient Records</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 font-medium">Track visit history, open records, and reach patients faster.</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => downloadCSV(patients, [
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'totalVisits', label: 'Total Visits' },
                        { key: 'lastVisit', label: 'Last Visit' },
                    ], 'patients')} 
                    leftIcon={<Download className="h-4 w-4" />}
                    className="shadow-sm hover:shadow transition-shadow bg-white dark:bg-gray-900 rounded-xl font-semibold"
                >
                    Export CSV
                </Button>
            </div>

            {/* Toolbar */}
            <DoctorPortalCard variant="compact">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-[320px] group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search patient by name, phone or email"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none"
                            />
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="block w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-medium appearance-none"
                                >
                                    <option value="all">All Time</option>
                                    <option value="last_7_days">Last 7 Days</option>
                                    <option value="last_30_days">Last 30 Days</option>
                                </select>
                            </div>
                            
                            <div className="relative flex-1 sm:flex-none">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ArrowDownUp className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    className="block w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-medium appearance-none"
                                >
                                    <option value="recent">Most Recent Visit</option>
                                    <option value="frequent">Most Visits</option>
                                    <option value="oldest">Oldest Visit</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 shadow-sm">
                            {patientsPagination.total || 0} Matches
                        </span>
                    </div>
                </div>
            </DoctorPortalCard>

            {/* Table */}
            <DoctorPortalCard className="!p-0 overflow-hidden bg-white dark:bg-gray-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                        <thead className="bg-gray-50/80 dark:bg-gray-900/60 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-4">Patient Profile</th>
                                <th scope="col" className="px-6 py-4 hidden md:table-cell">Contact Details</th>
                                <th scope="col" className="px-6 py-4">Last Visit</th>
                                <th scope="col" className="px-6 py-4 text-center">Total Visits</th>
                                <th scope="col" className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                            {loadingPatients && patients.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`}>
                                        <td colSpan={5} className="p-0">
                                            <PatientSkeleton />
                                        </td>
                                    </tr>
                                ))
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                                                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">No patient records found</p>
                                                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                                    We couldn&apos;t find any patients matching your current filters and search query.
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.map((patient: DoctorPatient) => (
                                <tr key={patient.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/10">
                                                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-gray-100 text-base mb-0.5">
                                                    {patient.name}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                                    {[patient.age ? `${patient.age}Y` : null, patient.gender?.charAt(0).toUpperCase(), patient.bloodGroup].filter(Boolean).join(' • ') || 'NEW PATIENT'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 hidden md:table-cell">
                                        <div className="space-y-2 text-sm font-medium">
                                            {patient.phone ? (
                                                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                                                    {patient.phone}
                                                </div>
                                            ) : null}
                                            {patient.email ? (
                                                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{patient.email}</span>
                                                </div>
                                            ) : (
                                                !patient.phone && <span className="text-gray-400 italic font-normal">No contact info</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20 shadow-sm">
                                            {patient.totalVisits || 0} visits
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Link 
                                            href={`/doctor/patients/${patient.id}`} 
                                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-emerald-700 hover:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400 dark:hover:border-emerald-700 transition-all shadow-sm group-hover:shadow group-hover:border-emerald-200 dark:group-hover:border-emerald-800"
                                        >
                                            View
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DoctorPortalCard>
            
            {/* Pagination */}          {!loadingPatients && patientsPagination.totalPages > 1 && (
                <div className="pt-2">
                    <Pagination
                        currentPage={page}
                        totalPages={patientsPagination.totalPages}
                        onPageChange={setPage}
                        totalItems={patientsPagination.total || patients.length}
                        itemsPerPage={pageSize}
                    />
                </div>
            )}
        </div>
    );
}
