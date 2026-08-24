'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { 
    Search, 
    User, 
    Phone, 
    Mail, 
    Loader2, 
    RefreshCw, 
    AlertCircle, 
    Download, 
    Calendar, 
    ArrowRight, 
    Filter, 
    ArrowDownUp, 
    Users, 
    Compass, 
    Stethoscope,
    ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDoctorStore, type DoctorPatient } from '@/stores/doctorStore';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';
import { 
    SOURCE_FILTER_OPTIONS, 
    VISIT_TYPE_FILTER_OPTIONS, 
    getSourceDisplay, 
    getVisitTypeDisplay,
    resolveCanonicalSource,
    resolveCanonicalVisitType
} from '@/lib/clinicalDimensions';

// --- Sub-components ---

const PatientSkeleton = () => (
    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80 animate-pulse">
        <div className="flex items-center gap-4 w-1/3">
            <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
            <div className="space-y-2 w-full">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800/50 rounded w-1/2"></div>
            </div>
        </div>
        <div className="hidden md:block space-y-2 w-1/4">
            <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-2/3"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-3/4"></div>
        </div>
        <div className="w-1/6">
            <div className="h-7 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-24"></div>
        </div>
        <div className="w-1/6">
            <div className="h-7 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-28"></div>
        </div>
        <div className="w-[80px] text-center">
            <div className="h-6 bg-slate-100 dark:bg-slate-800/50 rounded-full w-16 mx-auto"></div>
        </div>
        <div className="w-[100px] text-right">
            <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-20 ml-auto"></div>
        </div>
    </div>
);

// --- Main Page Component ---

export default function DoctorPatientsPage() {
    const { patients, loadingPatients, error, patientsPagination, fetchPatients, clearError } = useDoctorStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState('all');
    const [sort, setSort] = useState('recent');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const pageSize = 12;

    useEffect(() => {
        fetchPatients(page, deferredSearchQuery, pageSize, filter, sort, sourceFilter, visitTypeFilter);
    }, [deferredSearchQuery, filter, sort, sourceFilter, visitTypeFilter, fetchPatients, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, filter, sort, sourceFilter, visitTypeFilter]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                </div>
                <p className="text-rose-600 dark:text-rose-400 font-medium">{error}</p>
                <Button 
                    onClick={() => { clearError(); fetchPatients(page, deferredSearchQuery, pageSize, filter, sort, sourceFilter, visitTypeFilter); }} 
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    className="rounded-[14px]"
                >
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            {/* 1. Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Patient Records</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Track visit history, open records, and reach patients faster.</p>
                </div>
                <button
                    onClick={() => downloadCSV(patients, [
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'sourceLabel', label: 'Source' },
                        { key: 'lastVisitTypeLabel', label: 'Visit Type' },
                        { key: 'totalVisits', label: 'Total Visits' },
                        { key: 'lastVisit', label: 'Last Visit' },
                    ], 'patients')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 text-sm font-semibold shadow-sm hover:shadow hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer w-fit self-start sm:self-auto"
                >
                    <Download className="h-4 w-4 text-slate-500" />
                    Export CSV
                </button>
            </div>

            {/* 2. Large White Rounded Filter Container */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] p-4 sm:p-5 lg:p-6 space-y-3">
                {/* Primary Filter Controls Row */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[240px]">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="h-4 w-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, phone or email"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full h-11 pl-10 pr-4 rounded-[14px] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-slate-600 transition-all shadow-sm"
                        />
                    </div>

                    {/* Filter Controls Row */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 sm:gap-3">
                        {/* 1. Source Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[135px]">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Compass className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="block w-full h-11 pl-9 pr-8 rounded-[14px] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-slate-600 transition-all shadow-sm cursor-pointer appearance-none"
                            >
                                {SOURCE_FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                        </div>

                        {/* 2. Visit Type Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[155px]">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Stethoscope className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={visitTypeFilter}
                                onChange={(e) => setVisitTypeFilter(e.target.value)}
                                className="block w-full h-11 pl-9 pr-8 rounded-[14px] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-slate-600 transition-all shadow-sm cursor-pointer appearance-none"
                            >
                                {VISIT_TYPE_FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                        </div>

                        {/* 3. Time Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[120px]">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Filter className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="block w-full h-11 pl-9 pr-8 rounded-[14px] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-slate-600 transition-all shadow-sm cursor-pointer appearance-none"
                            >
                                <option value="all">All Time</option>
                                <option value="last_7_days">Last 7 Days</option>
                                <option value="last_30_days">Last 30 Days</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        
                        {/* 4. Sort Order */}
                        <div className="relative flex-1 sm:flex-none min-w-[150px]">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <ArrowDownUp className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="block w-full h-11 pl-9 pr-8 rounded-[14px] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 dark:focus:border-slate-600 transition-all shadow-sm cursor-pointer appearance-none"
                            >
                                <option value="recent">Most Recent Visit</option>
                                <option value="frequent">Most Visits</option>
                                <option value="oldest">Oldest Visit</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary Row: Result Count Pill aligned to the right */}
                <div className="flex justify-end pt-0.5">
                    <div className="h-8 px-3.5 inline-flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                        {patientsPagination.total || patients.length || 0} MATCHES
                    </div>
                </div>
            </div>

            {/* 3. Patient Table / List Container */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-4">Patient Profile</th>
                                <th scope="col" className="px-6 py-4 hidden md:table-cell">Contact Details</th>
                                <th scope="col" className="px-6 py-4">Source</th>
                                <th scope="col" className="px-6 py-4">Latest Visit</th>
                                <th scope="col" className="px-6 py-4 text-center">Total Visits</th>
                                <th scope="col" className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {loadingPatients && patients.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`}>
                                        <td colSpan={6} className="p-0">
                                            <PatientSkeleton />
                                        </td>
                                    </tr>
                                ))
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">No patient records found</p>
                                                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                                                    We couldn&apos;t find any patients matching your selected Source and Visit Type filters.
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.map((patient: DoctorPatient) => {
                                const sourceDisplay = getSourceDisplay(patient.source);
                                const visitTypeDisplay = getVisitTypeDisplay(patient.lastVisitType);

                                return (
                                    <tr key={patient.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700 dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/10">
                                                    {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-base mb-0.5">
                                                        {patient.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                                                        {[patient.age ? `${patient.age}Y` : null, patient.gender?.charAt(0).toUpperCase(), patient.bloodGroup].filter(Boolean).join(' • ') || 'PATIENT'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 hidden md:table-cell">
                                            <div className="space-y-1.5 text-sm font-medium">
                                                {patient.phone ? (
                                                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                                                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        {patient.phone}
                                                    </div>
                                                ) : null}
                                                {patient.email ? (
                                                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                                                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[180px]">{patient.email}</span>
                                                    </div>
                                                ) : (
                                                    !patient.phone && <span className="text-slate-400 italic font-normal">No contact info</span>
                                                )}
                                            </div>
                                        </td>
                                        
                                        {/* Independent Source Badge */}
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${sourceDisplay.badgeClass}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sourceDisplay.dotClass}`}></span>
                                                {sourceDisplay.label}
                                            </span>
                                        </td>

                                        {/* Independent Last Visit Date + Visit Type Badge */}
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                                </div>
                                                {patient.lastVisit && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold w-fit ${visitTypeDisplay.badgeClass}`}>
                                                        {visitTypeDisplay.label}
                                                    </span>
                                                )}
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
                                                className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm group-hover:shadow"
                                            >
                                                View
                                                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Pagination */}
            {!loadingPatients && patientsPagination.totalPages > 1 && (
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
