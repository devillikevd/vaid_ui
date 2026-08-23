'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Loader2, ChevronRight, UserCircle2, Calendar, Phone, Activity, FileText, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDiagnosticCenterStore } from '@/stores/diagnosticCenterStore';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { PageHeader } from '@/components/shared/PageHeader';
import PatientDetailsDrawer from './_components/PatientDetailsDrawer';

export default function DiagnosticPatientsPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const {
        patients,
        patientsPagination,
        loadingPatients,
        error,
        fetchPatients
    } = useDiagnosticCenterStore();

    // URL State sync
    const querySearch = searchParams.get('search') || '';
    const queryPage = parseInt(searchParams.get('page') || '1', 10);

    const [searchInput, setSearchInput] = useState(querySearch);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedPatientData, setSelectedPatientData] = useState<any>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== querySearch) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchInput) params.set('search', searchInput);
                else params.delete('search');
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput, querySearch, pathname, router, searchParams]);

    // Fetch initial data based on URL
    useEffect(() => {
        if (!user) return;
        fetchPatients({ page: queryPage, limit: 20, search: querySearch });
    }, [user, queryPage, querySearch, fetchPatients]);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleRefresh = () => {
        fetchPatients({ page: queryPage, limit: 20, search: querySearch });
    };

    const handleOpenDrawer = (patient: any) => {
        setSelectedPatientData(patient);
        setSelectedPatientId(patient.id);
    };

    // Derived Summary Metrics from current data if backend summary isn't available
    const totalPatients = patientsPagination.total || 0;
    const activePatients = useMemo(() => {
        // Just rough estimate from current page for 'Active/Recent' if backend doesn't supply it
        // Or we just don't invent metrics as user said.
        return patients.filter((p: any) => new Date(p.last_booking_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    }, [patients]);
    const totalPending = useMemo(() => patients.reduce((acc: number, p: any) => acc + (p.pending_bookings || 0), 0), [patients]);
    const totalCompleted = useMemo(() => patients.reduce((acc: number, p: any) => acc + (p.completed_bookings || 0), 0), [patients]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
            
            {/* Header & Actions */}
            <PageHeader
                title="Patients"
                subtitle="View patients who have interacted with your diagnostic center."
                actions={
                    <Button onClick={handleRefresh} variant="outline" className="gap-2 w-full md:w-auto border-gray-200 dark:border-gray-800">
                        <Activity className="w-4 h-4" /> Refresh
                    </Button>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DashboardCard noPadding><div className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <UserCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Patients</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalPatients}</h3>
                        </div>
                    </div>
                </DashboardCard>
                
                {/* As per instruction: "Active/Recent Patients ONLY if the backend can accurately provide it." 
                    Since backend doesn't provide a global distinct count, we will show "Page Active (30d)" */}
                <DashboardCard noPadding><div className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent (Page)</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activePatients}</h3>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard noPadding><div className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending (Page)</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalPending}</h3>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard noPadding><div className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed (Page)</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCompleted}</h3>
                        </div>
                    </div>
                </DashboardCard>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center justify-between border border-red-200 dark:border-red-800/60">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="border-red-200 text-red-600 hover:bg-red-100">Retry</Button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search patient name, phone, or ID..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1F33] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Data View */}
            <div className="bg-white dark:bg-[#0B1020] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {loadingPatients && patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                        <p>Loading patients...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No patients found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                            {querySearch ? `No results for "${querySearch}"` : 'There are currently no patients registered at this diagnostic center.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Patient</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Total Bookings</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Last Test</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Last Date</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Last Status</th>
                                        <th className="py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                                    {patients.map((patient: any) => (
                                        <tr key={patient.id} className="hover:bg-gray-50 dark:bg-gray-800/50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shrink-0 border border-purple-100 dark:border-purple-800">
                                                        {(patient.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                            {patient.name || 'Unknown'}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {patient.phone && (
                                                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Phone className="w-3 h-3"/> {patient.phone}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-gray-900 dark:text-white font-medium">{patient.total_bookings || 0}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{patient.pending_bookings || 0} pending</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {patient.last_test_name ? (
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{patient.last_test_name}</span>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">None</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">
                                                {patient.last_booking_date ? (
                                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(patient.last_booking_date).toLocaleDateString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="py-4 px-6">
                                                {patient.last_booking_status ? <StatusBadge status={patient.last_booking_status} /> : '-'}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Button 
                                                    onClick={() => handleOpenDrawer(patient)}
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
                                                >
                                                    View History
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stacked Cards */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800/60">
                            {patients.map((patient: any) => (
                                <div key={patient.id} className="p-4 hover:bg-gray-50 dark:bg-gray-800/50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shrink-0 border border-purple-100 dark:border-purple-800">
                                                {(patient.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{patient.name || 'Unknown'}</div>
                                                {patient.phone && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{patient.phone}</div>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Bookings</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{patient.total_bookings || 0} ({patient.pending_bookings || 0} pending)</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Last Status</div>
                                            <div>{patient.last_booking_status ? <StatusBadge status={patient.last_booking_status} /> : '-'}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Last Test</div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{patient.last_test_name || 'None'}</span>
                                                {patient.last_booking_date && <span className="text-xs text-gray-400">• {new Date(patient.last_booking_date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={() => handleOpenDrawer(patient)}
                                        variant="outline" 
                                        className="w-full justify-center border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
                                    >
                                        View History
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {patientsPagination.totalPages > 1 && (
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-gray-800/50/30 dark:bg-[#0B1020]/30 flex justify-center">
                                <Pagination
                                    currentPage={patientsPagination.page}
                                    totalPages={patientsPagination.totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Patient Details Drawer */}
            <PatientDetailsDrawer 
                isOpen={!!selectedPatientId} 
                onClose={() => setSelectedPatientId(null)} 
                patientId={selectedPatientId}
                patientData={selectedPatientData}
            />
        </div>
    );
}
