'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { HeartPulse, Loader2, RefreshCw, AlertCircle, Search, Phone, Calendar, Repeat, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 10;

export default function ClinicPatientsPage() {
    const {
        patients,
        patientsPagination,
        loadingPatients,
        error,
        fetchPatients,
        clearError,
    } = useClinicStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadPatients = useCallback(async () => {
        await fetchPatients({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
        });
    }, [deferredSearchQuery, fetchPatients, page]);

    useEffect(() => {
        void loadPatients();
    }, [loadPatients]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery]);

    useEffect(() => {
        if (page > patientsPagination.totalPages) {
            setPage(patientsPagination.totalPages);
        }
    }, [patientsPagination.totalPages, page]);

    const repeatPatients = patients.filter((p) => p.totalVisits > 1).length;

    if (loadingPatients && patients.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>;
    }

    if (error && patients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); void loadPatients(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patients</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Your clinic&apos;s patients, aggregated from real appointment records</p></div>
                <Button variant="outline" onClick={() => void loadPatients()} disabled={loadingPatients} leftIcon={<RefreshCw className={`h-4 w-4 ${loadingPatients ? 'animate-spin' : ''}`} />}>Refresh</Button>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Patients</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{patientsPagination.total}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-pink-100"><HeartPulse className="h-6 w-6 text-pink-600" /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Repeat Visitors (shown)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{repeatPatients}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-yellow-100"><Repeat className="h-6 w-6 text-yellow-600" /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">With Upcoming Visits</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{patients.filter((p) => p.upcomingCount > 0).length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100"><Calendar className="h-6 w-6 text-blue-600" /></div>
                    </div>
                </Card>
            </div>

            <Card padding="sm">
                <Input
                    placeholder="Search by patient name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-5 w-5" />}
                />
            </Card>

            {patients.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <HeartPulse className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No patients found.</p>
                    <p className="text-sm mt-1">Patients appear here after booking an appointment with one of your clinic&apos;s doctors.</p>
                </div>
            ) : (
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-3 font-semibold">Patient</th>
                                    <th className="px-4 py-3 font-semibold">Contact</th>
                                    <th className="px-4 py-3 font-semibold">Total Visits</th>
                                    <th className="px-4 py-3 font-semibold">Last Visit</th>
                                    <th className="px-4 py-3 font-semibold">Next Appointment</th>
                                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {patient.profile_image_url ? (
                                                    <img src={patient.profile_image_url} alt={patient.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-800" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 flex items-center justify-center font-bold">
                                                        {patient.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{patient.name}</p>
                                                    {patient.gender && <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{patient.gender}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                            <div className="flex flex-col">
                                                {patient.phone ? (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3 w-3 text-gray-400" />
                                                        <span className="text-sm">{patient.phone}</span>
                                                    </div>
                                                ) : <span className="text-gray-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-full bg-pink-50 dark:bg-pink-900/20 px-3 py-1 text-sm font-medium text-pink-700 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30">
                                                {patient.totalVisits}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                            {patient.lastVisit ? (
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-300">{new Date(patient.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{patient.lastVisitDoctor ? `with Dr. ${patient.lastVisitDoctor}` : ''}</p>
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {patient.nextAppointment ? (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <StatusBadge status={patient.nextAppointment.status} size="sm" />
                                                    </div>
                                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-300">
                                                        {new Date(patient.nextAppointment.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {patient.nextAppointment.time_slot} {patient.nextAppointment.doctorName ? `· Dr. ${patient.nextAppointment.doctorName}` : ''}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/clinic/patients/${patient.id}`}>
                                                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
                                                    View
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
            <Pagination
                currentPage={page}
                totalPages={patientsPagination.totalPages}
                onPageChange={setPage}
                totalItems={patientsPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
        </div>
    );
}
