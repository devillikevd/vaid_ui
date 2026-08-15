'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
    Loader2, 
    AlertCircle, 
    ArrowLeft, 
    Phone, 
    Mail, 
    Calendar, 
    Activity, 
    Clock, 
    HeartPulse, 
    Stethoscope 
} from 'lucide-react';
import { clinicApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { calculateAge } from '@/lib/utils';

export default function ClinicPatientDetailsPage({ params }: { params: Promise<{ patientId: string }> }) {
    const { patientId } = use(params);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const loadPatient = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await clinicApi.getPatientDetails(patientId);
                setData(res.data);
            } catch (err: any) {
                console.error('Failed to load patient details:', err);
                if (err.response?.status === 403 || err.response?.status === 404) {
                    setError('Patient not found or you do not have permission to view their details.');
                } else {
                    setError('Failed to load patient details. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            void loadPatient();
        }
    }, [patientId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Loading patient details...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-2xl mx-auto mt-12 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl flex flex-col items-center">
                    <AlertCircle className="w-12 h-12 mb-4" />
                    <h2 className="text-lg font-bold mb-2">Access Denied</h2>
                    <p className="mb-6">{error}</p>
                    <Link href="/clinic/patients">
                        <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                            Back to Patients
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { patient, metrics, appointments, doctorsSeen } = data;
    const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/clinic/patients">
                    <button className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patient Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Viewing records scoped to your clinic</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <Card padding="lg" className="border-t-4 border-t-pink-500">
                        <div className="flex flex-col items-center text-center">
                            {patient.profile_image_url ? (
                                <img 
                                    src={patient.profile_image_url} 
                                    alt={patient.name} 
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md mb-4"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center text-3xl font-bold shadow-md mb-4 border-4 border-white dark:border-gray-800">
                                    {patient.name.charAt(0)}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{patient.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {patient.gender ? <span className="capitalize">{patient.gender}</span> : 'Unknown Gender'} 
                                {age ? ` • ${age} yrs` : ''}
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact Information</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                </div>
                                <span className="truncate">{patient.phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                </div>
                                <span className="truncate">{patient.email || 'No email provided'}</span>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Clinic Relationship</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center shrink-0">
                                    <Activity className="w-4 h-4 text-pink-600" />
                                </div>
                                <span><strong className="font-semibold">{metrics.totalVisits}</strong> Total Visits</span>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Stethoscope className="w-4 h-4 text-pink-500" />
                            Doctors Seen Here
                        </h3>
                        {doctorsSeen.length > 0 ? (
                            <div className="space-y-4">
                                {doctorsSeen.map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                                {doc.name.replace('Dr. ', '').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-pink-600 transition-colors">Dr. {doc.name.replace('Dr. ', '')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{doc.specialization}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                            {doc.visitCount} visits
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No doctors on record.</p>
                        )}
                    </Card>
                </div>

                {/* Right Column - Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <Card padding="lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-pink-500" />
                                Appointment History
                            </h3>
                        </div>

                        {appointments.length > 0 ? (
                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                                {appointments.map((appt: any) => {
                                    const date = new Date(appt.appointment_date);
                                    const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status);
                                    const isCompleted = appt.status === 'completed';

                                    return (
                                        <div key={appt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            {/* Icon */}
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${
                                                isUpcoming ? 'bg-blue-500 text-white' : 
                                                isCompleted ? 'bg-emerald-500 text-white' : 
                                                'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {isUpcoming ? <Clock className="w-4 h-4" /> : 
                                                 isCompleted ? <HeartPulse className="w-4 h-4" /> : 
                                                 <Calendar className="w-4 h-4" />}
                                            </div>
                                            
                                            {/* Card */}
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <StatusBadge status={appt.status} size="sm" />
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                    <p className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {appt.time_slot}
                                                    </p>
                                                    {appt.doctor && (
                                                        <p className="flex items-center gap-2">
                                                            <Stethoscope className="w-3.5 h-3.5" />
                                                            Dr. {appt.doctor.name.replace('Dr. ', '')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">No appointment history found for this clinic.</p>
                            </div>
                        )}
                    </Card>
                </div>

            </div>
        </div>
    );
}
