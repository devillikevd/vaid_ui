/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useEffect, useState, use, useCallback } from 'react';
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
    Stethoscope,
    Shield,
    Video,
    Building2,
    RefreshCw,
    CheckCircle2,
    User
} from 'lucide-react';
import { clinicApi } from '@/lib/api';
import { calculateAge } from '@/lib/utils';

export default function ClinicPatientDetailsPage({ params }: { params: Promise<{ patientId: string }> }) {
    const { patientId } = use(params);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    const loadPatient = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await clinicApi.getPatientDetails(patientId);
            if (res.success && res.data) {
                setData(res.data);
            } else {
                setError(res.error || 'Patient record not accessible.');
            }
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
    }, [patientId]);

    useEffect(() => {
        if (patientId) {
            void loadPatient();
        }
    }, [loadPatient, patientId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading clinic patient details...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-2xl mx-auto mt-12 text-center">
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-red-200 dark:border-red-900/60 p-8 shadow-sm flex flex-col items-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Access Restricted</h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-md">{error}</p>
                    </div>
                    <Link
                        href="/clinic/patients"
                        className="px-5 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs inline-flex items-center gap-2 hover:bg-gray-50"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Patients
                    </Link>
                </div>
            </div>
        );
    }

    const { patient, metrics, appointments, doctorsSeen } = data;
    const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Header / Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <Link
                        href="/clinic/patients"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline mb-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Patient Directory
                    </Link>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {patient.name}
                    </h1>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-0.5">
                        Clinic Patient Profile • Operational history scoped to your clinic
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                        onClick={loadPatient}
                        disabled={loading}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Patient Overview */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Identity & Basic Info Card */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
                        <div className="flex flex-col items-center text-center">
                            {patient.profile_image_url ? (
                                <img 
                                    src={patient.profile_image_url} 
                                    alt={patient.name} 
                                    className="w-20 h-20 rounded-3xl object-cover border-4 border-white dark:border-[#111c2e] shadow-md mb-3"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-2xl font-extrabold shadow-md mb-3 border-4 border-white dark:border-[#111c2e]">
                                    {patient.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{patient.name}</h2>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 capitalize">
                                {patient.gender || 'Patient'}
                                {age ? ` • ${age} yrs` : ''}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {metrics?.totalVisits || 0} {metrics?.totalVisits === 1 ? 'Total Visit' : 'Total Visits'}
                                </span>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                                Contact Information
                            </h3>

                            {patient.phone ? (
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-semibold">{patient.phone}</span>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">No phone number recorded</p>
                            )}

                            {patient.email ? (
                                <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-300">
                                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="font-semibold truncate">{patient.email}</span>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">No email recorded</p>
                            )}
                        </div>

                        {/* Privacy & Scope Notice */}
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300 text-[11px]">
                                <Shield className="w-3.5 h-3.5 text-blue-600" />
                                <span>Clinic Operational Scope</span>
                            </div>
                            <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-medium">
                                Clinical prescriptions and physician consultation notes are doctor-confidential and accessible only by consulting physicians.
                            </p>
                        </div>
                    </div>

                    {/* Doctors Seen Here */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-emerald-600" />
                            Doctors Seen at this Clinic
                        </h3>

                        {doctorsSeen && doctorsSeen.length > 0 ? (
                            <div className="space-y-3">
                                {doctorsSeen.map((doc: any) => (
                                    <div 
                                        key={doc.id}
                                        className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
                                    >
                                        <div>
                                            <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                                                Dr. {doc.name.replace(/^Dr\.\s*/i, '')}
                                            </p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {doc.specialization || 'Medical Specialist'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                            {doc.visitCount} {doc.visitCount === 1 ? 'visit' : 'visits'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No doctor history found.</p>
                        )}
                    </div>
                </div>

                {/* Right Column - Appointment History Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-600" />
                                    Clinic Visit &amp; Appointment History
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    All appointments booked at your clinic for this patient ({appointments?.length || 0})
                                </p>
                            </div>
                        </div>

                        {appointments && appointments.length > 0 ? (
                            <div className="space-y-4">
                                {appointments.map((appt: any) => {
                                    const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status);
                                    const isCompleted = appt.status === 'completed';
                                    const isCancelled = appt.status === 'cancelled';

                                    return (
                                        <div
                                            key={appt.id}
                                            className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                        {appt.appointment_date}
                                                    </span>
                                                    {appt.time_slot && (
                                                        <span className="text-xs text-gray-500 font-semibold">
                                                            • {appt.time_slot}
                                                        </span>
                                                    )}

                                                    {/* Status Badge */}
                                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize border ${
                                                        isUpcoming ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                                                        isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                                        isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                                        'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                                    }`}>
                                                        {appt.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                                                    {appt.doctor && (
                                                        <span className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                                                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                                                            Dr. {appt.doctor.name.replace(/^Dr\.\s*/i, '')} ({appt.doctor.specialization})
                                                        </span>
                                                    )}
                                                    {appt.consultation_type && (
                                                        <span className="capitalize">
                                                            • {appt.consultation_type} Mode
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {appt.payment_status && (
                                                <div className="text-right sm:text-right shrink-0">
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">
                                                        {appt.payment_status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 space-y-2">
                                <Calendar className="w-10 h-10 text-gray-400 mx-auto" />
                                <p className="text-xs font-semibold text-gray-500">No appointment records found for this clinic.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
