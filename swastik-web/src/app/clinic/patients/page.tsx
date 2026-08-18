/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useCallback, useDeferredValue, useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Users, HeartPulse, Repeat, Calendar, Search, RefreshCw, AlertCircle, 
    ArrowRight, Phone, Mail, User, Clock, Stethoscope, ChevronRight,
    Sparkles, Filter, Video, Building2
} from 'lucide-react';
import { useClinicStore, type ClinicPatient } from '@/stores/clinicStore';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 12;

type FilterTab = 'all' | 'upcoming' | 'repeat' | 'new';

function ClinicPatientsContent() {
    const searchParams = useSearchParams();
    const {
        patients,
        patientsPagination,
        patientMetrics,
        loadingPatients,
        error,
        fetchPatients,
        doctors,
        fetchDoctors,
        clearError,
    } = useClinicStore();

    const paramFilter = searchParams.get('filter') as FilterTab | null;
    const paramDoctor = searchParams.get('doctorId') || 'all';

    const validFilters: FilterTab[] = ['all', 'upcoming', 'repeat', 'new'];
    const initialFilter: FilterTab = paramFilter && validFilters.includes(paramFilter) ? paramFilter : 'all';

    const [page, setPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(paramDoctor);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    useEffect(() => {
        if (paramFilter && validFilters.includes(paramFilter)) {
            setActiveFilter(paramFilter);
        }
        if (paramDoctor !== 'all') {
            setSelectedDoctorId(paramDoctor);
        }
    }, [paramFilter, paramDoctor]);

    // Initial load doctors for the dropdown filter
    useEffect(() => {
        if (doctors.length === 0) {
            void fetchDoctors({ limit: 100 });
        }
    }, [doctors.length, fetchDoctors]);

    // Fetch patients from real backend API
    const loadPatients = useCallback(async () => {
        await fetchPatients({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            filter: activeFilter !== 'all' ? activeFilter : undefined,
            doctorId: selectedDoctorId !== 'all' ? selectedDoctorId : undefined,
        });
    }, [activeFilter, deferredSearchQuery, fetchPatients, page, selectedDoctorId]);

    useEffect(() => {
        void loadPatients();
    }, [loadPatients]);

    // 1. Clinic-scoped patients (guarantee no hospital/external records)
    const clinicScopedPatients = useMemo(() => {
        return patients.filter((p) => {
            if (p.hospital_id || p.hospitalId || p.organization_type === 'hospital') {
                return false;
            }
            return true;
        });
    }, [patients]);

    // 2. Metrics derived strictly from clinic-scoped patients
    const clinicMetrics = useMemo(() => {
        return {
            totalPatients: clinicScopedPatients.length,
            repeatPatients: clinicScopedPatients.filter((p) => p.totalVisits > 1).length,
            newPatients: clinicScopedPatients.filter((p) => p.totalVisits === 1).length,
            upcomingVisitsCount: clinicScopedPatients.filter((p) => p.upcomingCount > 0).length,
        };
    }, [clinicScopedPatients]);

    // 3. Displayed list with in-memory filters applied to clinic-scoped patients
    const displayedPatients = useMemo(() => {
        let list = clinicScopedPatients;

        if (selectedDoctorId !== 'all') {
            list = list.filter((p) => {
                const hasSeen = p.doctorsSeen && p.doctorsSeen.some((d) => d.includes(selectedDoctorId));
                const lastDoc = p.lastVisitDoctor && p.lastVisitDoctor.includes(selectedDoctorId);
                const nextDoc = p.nextAppointment?.doctorName && p.nextAppointment.doctorName.includes(selectedDoctorId);
                return hasSeen || lastDoc || nextDoc || (p as any).doctorId === selectedDoctorId;
            });
        }

        if (activeFilter === 'upcoming') {
            list = list.filter((p) => p.upcomingCount > 0);
        } else if (activeFilter === 'repeat') {
            list = list.filter((p) => p.totalVisits > 1);
        } else if (activeFilter === 'new') {
            list = list.filter((p) => p.totalVisits === 1);
        }

        if (deferredSearchQuery) {
            const q = deferredSearchQuery.toLowerCase();
            list = list.filter((p) =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.phone && p.phone.toLowerCase().includes(q)) ||
                (p.email && p.email.toLowerCase().includes(q)) ||
                (p.lastVisitDoctor && p.lastVisitDoctor.toLowerCase().includes(q)) ||
                (p.nextAppointment?.doctorName && p.nextAppointment.doctorName.toLowerCase().includes(q))
            );
        }

        return list;
    }, [clinicScopedPatients, selectedDoctorId, activeFilter, deferredSearchQuery]);

    useEffect(() => {
        console.log("[CLINIC PATIENT UI]", {
            rawCount: patients?.length,
            scopedCount: clinicScopedPatients?.length,
            displayedCount: displayedPatients?.length,
            firstRecords: displayedPatients?.slice(0, 3),
        });
    }, [patients, clinicScopedPatients, displayedPatients]);

    // Reset to page 1 on filter or search changes
    const handleFilterChange = (tab: FilterTab) => {
        setActiveFilter(tab);
        setPage(1);
    };

    const handleDoctorChange = (docId: string) => {
        setSelectedDoctorId(docId);
        setPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    // Calculate display metrics from clinic-scoped data
    const totalCount = clinicMetrics.totalPatients;
    const repeatCount = clinicMetrics.repeatPatients;
    const newCount = clinicMetrics.newPatients;
    const upcomingCount = clinicMetrics.upcomingVisitsCount;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                        Clinic Patients
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Operational patient directory aggregated from clinic appointment history.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => {
                            clearError();
                            void loadPatients();
                        }}
                        disabled={loadingPatients}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingPatients ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <Link
                        href="/clinic/appointments"
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>View Appointments</span>
                    </Link>
                </div>
            </div>

            {/* Top Operational Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Patients</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{totalCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Distinct clinic visitors</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Returning Patients</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{repeatCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">&gt;1 completed visit</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50 shrink-0">
                        <Repeat className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Patients</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{newCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Single initial visit</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50 shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upcoming Visits</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{upcomingCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Scheduled appointments</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/50 shrink-0">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => {
                            clearError();
                            void loadPatients();
                        }}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 text-red-900 dark:text-red-100 font-bold rounded-lg text-xs"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Search, Doctor Filter & Quick Category Tabs */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm space-y-4">
                
                {/* Search & Doctor Select Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search patients by name, phone, email, or doctor..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Doctor Selector */}
                    {doctors.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            <Stethoscope className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                            <select
                                value={selectedDoctorId}
                                onChange={(e) => handleDoctorChange(e.target.value)}
                                className="px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-[#0b1324] text-xs font-extrabold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="all">All Doctors ({doctors.length})</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.doctorId || doc.id}>
                                        Dr. {doc.name.replace(/^Dr\.\s*/i, '')} ({doc.specialization || 'Doctor'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-gray-100 dark:border-gray-800/80 pt-3">
                    <button
                        onClick={() => handleFilterChange('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                            activeFilter === 'all'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                : 'bg-gray-100 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span>All Patients</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            activeFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                            {totalCount}
                        </span>
                    </button>

                    <button
                        onClick={() => handleFilterChange('upcoming')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                            activeFilter === 'upcoming'
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                                : 'bg-gray-100 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span>Upcoming Visits</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            activeFilter === 'upcoming' ? 'bg-purple-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                            {upcomingCount}
                        </span>
                    </button>

                    <button
                        onClick={() => handleFilterChange('repeat')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                            activeFilter === 'repeat'
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                : 'bg-gray-100 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span>Returning</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            activeFilter === 'repeat' ? 'bg-blue-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                            {repeatCount}
                        </span>
                    </button>

                    <button
                        onClick={() => handleFilterChange('new')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                            activeFilter === 'new'
                                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                                : 'bg-gray-100 dark:bg-[#0f172a] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span>New Patients</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            activeFilter === 'new' ? 'bg-amber-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                            {newCount}
                        </span>
                    </button>
                </div>
            </div>

            {/* Main Patient Directory Content */}
            {loadingPatients && displayedPatients.length === 0 ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-3xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 animate-pulse p-5" />
                    ))}
                </div>
            ) : displayedPatients.length === 0 ? (
                /* Contextual Empty State */
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 mx-auto flex items-center justify-center">
                        <Users className="w-8 h-8" />
                    </div>

                    <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {searchQuery || activeFilter !== 'all' || selectedDoctorId !== 'all'
                                ? 'No matching patients found'
                                : 'No clinic patients recorded yet'}
                        </h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {searchQuery || activeFilter !== 'all' || selectedDoctorId !== 'all'
                                ? 'Try adjusting your search query, filter tabs, or selected doctor.'
                                : 'Patients will automatically appear here once an appointment is scheduled or completed with one of your clinic\'s affiliated doctors.'}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                        {(searchQuery || activeFilter !== 'all' || selectedDoctorId !== 'all') ? (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveFilter('all');
                                    setSelectedDoctorId('all');
                                    setPage(1);
                                }}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-colors"
                            >
                                Reset All Filters
                            </button>
                        ) : (
                            <Link
                                href="/clinic/appointments"
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-emerald-600/25 inline-flex items-center gap-1.5"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Manage Appointments</span>
                            </Link>
                        )}
                    </div>
                </div>
            ) : (
                /* Patient Cards / Rows Grid */
                <div className="space-y-4">
                    
                    {/* Desktop View Table Layout */}
                    <div className="hidden lg:block bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#0f172a]/50">
                                    <th className="py-4 px-6">Patient</th>
                                    <th className="py-4 px-4">Contact</th>
                                    <th className="py-4 px-4">Visits</th>
                                    <th className="py-4 px-4">Last Visit</th>
                                    <th className="py-4 px-4">Next Appointment</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
                                {displayedPatients.map((patient) => {
                                    const hasUpcoming = patient.upcomingCount > 0 && patient.nextAppointment;

                                    return (
                                        <tr 
                                            key={patient.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-[#162238]/60 transition-colors group"
                                        >
                                            {/* Patient Column */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3.5">
                                                    {patient.profile_image_url ? (
                                                        <img
                                                            src={patient.profile_image_url}
                                                            alt={patient.name}
                                                            className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                                                            {patient.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Link
                                                                href={`/clinic/patients/${patient.id}`}
                                                                className="font-extrabold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm truncate"
                                                            >
                                                                {patient.name}
                                                            </Link>
                                                            {patient.totalVisits > 1 ? (
                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                    Repeat
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                                                            {patient.gender || 'Patient'}
                                                            {patient.age != null ? ` • ${patient.age} yrs` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Column */}
                                            <td className="py-4 px-4">
                                                <div className="space-y-1 text-gray-600 dark:text-gray-300">
                                                    {patient.phone ? (
                                                        <p className="flex items-center gap-1.5 font-medium">
                                                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                                            <span>{patient.phone}</span>
                                                        </p>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No phone</span>
                                                    )}
                                                    {patient.email && (
                                                        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                                            <span className="truncate">{patient.email}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Visits Column */}
                                            <td className="py-4 px-4">
                                                <div className="space-y-0.5">
                                                    <span className="font-extrabold text-gray-900 dark:text-white text-xs">
                                                        {patient.totalVisits} {patient.totalVisits === 1 ? 'visit' : 'visits'}
                                                    </span>
                                                    {patient.doctorsSeenCount != null && patient.doctorsSeenCount > 0 && (
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                            {patient.doctorsSeenCount} {patient.doctorsSeenCount === 1 ? 'doctor' : 'doctors'}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Last Visit Column */}
                                            <td className="py-4 px-4">
                                                {patient.lastVisit ? (
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-gray-900 dark:text-white">
                                                            {patient.lastVisit}
                                                        </p>
                                                        {patient.lastVisitDoctor && (
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                                                Dr. {patient.lastVisitDoctor.replace(/^Dr\.\s*/i, '')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">No past visit</span>
                                                )}
                                            </td>

                                            {/* Next Appointment Column */}
                                            <td className="py-4 px-4">
                                                {hasUpcoming ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{patient.nextAppointment?.appointment_date}</span>
                                                            {patient.nextAppointment?.time_slot && (
                                                                <span className="text-[10px] text-gray-500">
                                                                    ({patient.nextAppointment.time_slot})
                                                                </span>
                                                            )}
                                                        </div>
                                                        {patient.nextAppointment?.doctorName && (
                                                            <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                                                Dr. {patient.nextAppointment.doctorName.replace(/^Dr\.\s*/i, '')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">None scheduled</span>
                                                )}
                                            </td>

                                            {/* Actions Column */}
                                            <td className="py-4 px-6 text-right">
                                                <Link
                                                    href={`/clinic/patients/${patient.id}`}
                                                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-extrabold text-xs transition-colors inline-flex items-center gap-1 shadow-sm group-hover:border-emerald-400"
                                                >
                                                    <span>View Details</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile & Tablet Card Layout */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedPatients.map((patient) => {
                            const hasUpcoming = patient.upcomingCount > 0 && patient.nextAppointment;

                            return (
                                <div
                                    key={patient.id}
                                    className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        
                                        {/* Patient Identity */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {patient.profile_image_url ? (
                                                    <img
                                                        src={patient.profile_image_url}
                                                        alt={patient.name}
                                                        className="w-12 h-12 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-base flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                                                        {patient.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}

                                                <div>
                                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                                                        {patient.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                        {patient.gender || 'Patient'}
                                                        {patient.age != null ? ` • ${patient.age} yrs` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                {patient.totalVisits > 1 ? (
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        Repeat
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        New
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-bold text-gray-500">
                                                    {patient.totalVisits} {patient.totalVisits === 1 ? 'visit' : 'visits'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contact & History Snippet */}
                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 text-xs space-y-2">
                                            {patient.phone && (
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span>{patient.phone}</span>
                                                </div>
                                            )}

                                            {patient.lastVisit && (
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    <span>Last: {patient.lastVisit}</span>
                                                    {patient.lastVisitDoctor && (
                                                        <span className="truncate">• Dr. {patient.lastVisitDoctor.replace(/^Dr\.\s*/i, '')}</span>
                                                    )}
                                                </div>
                                            )}

                                            {hasUpcoming && (
                                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 pt-1 border-t border-gray-200/60 dark:border-gray-800 font-bold">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    <span>Next: {patient.nextAppointment?.appointment_date}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                                        <Link
                                            href={`/clinic/patients/${patient.id}`}
                                            className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-emerald-50 hover:border-emerald-300 text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <span>View Patient Profile &amp; History</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {patientsPagination.totalPages > 1 && (
                        <div className="pt-4 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={patientsPagination.totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ClinicPatientsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading patients directory...</div>}>
            <ClinicPatientsContent />
        </Suspense>
    );
}
