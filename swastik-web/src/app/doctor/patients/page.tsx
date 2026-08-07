'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Search, User, Phone, Mail, Loader2, RefreshCw, AlertCircle, Download, Calendar, FileText, ArrowRight, Filter, ArrowDownUp } from 'lucide-react';
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

            <Card padding="sm" className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-[220px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Find by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm bg-gray-50 dark:bg-gray-950 focus:ring-emerald-500 focus:border-emerald-500 dark:text-gray-200 transition-colors shadow-sm"
                            />
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-950 px-2 py-1.5 shadow-sm">
                            <Filter className="h-4 w-4 text-gray-400 ml-1 shrink-0" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer w-full py-0.5 outline-none font-medium"
                            >
                                <option value="all">All Time</option>
                                <option value="last_7_days">Last 7 Days</option>
                                <option value="last_30_days">Last 30 Days</option>
                            </select>
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-950 px-2 py-1.5 shadow-sm">
                            <ArrowDownUp className="h-4 w-4 text-gray-400 ml-1 shrink-0" />
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer w-full py-0.5 outline-none font-medium"
                            >
                                <option value="recent">Most Recent Visit</option>
                                <option value="frequent">Most Visits</option>
                                <option value="oldest">Oldest Visit</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-medium border border-emerald-100">
                            {patientsPagination.total || 0} matches
                        </span>
                    </div>
                </div>
            </Card>

            <Card padding="none" className="overflow-hidden border border-gray-200/80 dark:border-gray-800 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-700 dark:bg-gray-900/50 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">Patient Info</th>
                                <th scope="col" className="px-6 py-4 font-medium hidden md:table-cell">Contact</th>
                                <th scope="col" className="px-6 py-4 font-medium">Last Visit</th>
                                <th scope="col" className="px-6 py-4 font-medium text-center">Total Visits</th>
                                <th scope="col" className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                            {patients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                                <Search className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p className="text-base font-medium">No patients found</p>
                                            <p className="text-sm">Try adjusting your search criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.map((patient: DoctorPatient) => (
                                <tr key={patient.id} className="group hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold shadow-sm">
                                                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                    {patient.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {[patient.age ? `${patient.age} yrs` : null, patient.gender, patient.bloodGroup].filter(Boolean).join(' • ') || 'New Patient'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <div className="space-y-1">
                                            {patient.phone ? (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                    {patient.phone}
                                                </div>
                                            ) : null}
                                            {patient.email ? (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                    <span className="truncate max-w-[150px] lg:max-w-[200px]">{patient.email}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200">
                                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                                            {patient.totalVisits || 0} visits
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            href={`/doctor/patients/${patient.id}`} 
                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 hover:text-emerald-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700 transition-all shadow-sm group-hover:border-emerald-200 dark:group-hover:border-emerald-800"
                                        >
                                            View
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
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
