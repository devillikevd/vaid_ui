/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, Pill, FileImage, Download, Printer, Clock, ClipboardList, Activity, Stethoscope, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useDoctorStore } from '@/stores/doctorStore';
import { RoutePharmacyModal } from '@/components/clinic/RoutePharmacyModal';
import { RouteDiagnosticModal } from '@/components/clinic/RouteDiagnosticModal';
import { RouteHospitalModal } from '@/components/clinic/RouteHospitalModal';

// --- Sub-components ---

const DetailsSkeleton = () => (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-1/2">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                <div className="space-y-2 w-full">
                    <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-1/3"></div>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-24"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-32"></div>
            </div>
        </div>
        
        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            </div>
            <div className="space-y-6">
                <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            </div>
        </div>
    </div>
);

// --- Main Page Component ---

export default function PrescriptionDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params as { id: string };
    
    const { prescriptions, fetchPrescriptions } = useDoctorStore();
    const [isLoading, setIsLoading] = useState(true);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
    const [showHospitalModal, setShowHospitalModal] = useState(false);

    const prescription = prescriptions.find(p => p.id === id);

    useEffect(() => {
        const load = async () => {
            if (!prescription && prescriptions.length === 0) {
                await fetchPrescriptions();
            }
            setIsLoading(false);
        };
        load();
    }, [prescription, prescriptions.length, fetchPrescriptions]);

    if (isLoading) {
        return <div className="p-4 sm:p-6"><DetailsSkeleton /></div>;
    }

    if (!prescription) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="p-5 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                    <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Prescription Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md text-lg">The prescription you are looking for does not exist or you do not have permission to view it.</p>
                <button 
                    onClick={() => router.back()} 
                    className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const createdDate = (prescription as any).date ? new Date((prescription as any).date) : prescription.created_at ? new Date(prescription.created_at) : null;
    const followUpDate = prescription.followUpDate ? new Date(prescription.followUpDate) : null;

    const getStatusStyle = (status: string | undefined) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'active':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50';
            case 'expired':
                return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50';
            case 'draft':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 mt-1 sm:mt-0 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                                {prescription.patientName || 'Unknown Patient'}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${getStatusStyle(prescription.status)}`}>
                                {(prescription.status || 'Active')}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1.5 text-sm font-medium">
                            <Calendar className="w-4 h-4 text-gray-400" /> 
                            {createdDate ? createdDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <Printer className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Print</span>
                    </button>
                    {((prescription as any).file_url || (prescription as any).pdf_url) && (
                        <a 
                            href={(prescription as any).file_url || (prescription as any).pdf_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                        >
                            <Download className="w-4 h-4" /> 
                            Download <span className="hidden sm:inline">PDF</span>
                        </a>
                    )}
                    <button
                        onClick={() => setShowRouteModal(true)}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <Pill className="w-4 h-4" />
                        Send to Partner Pharmacy
                    </button>
                    <button
                        onClick={() => setShowDiagnosticModal(true)}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <Stethoscope className="w-4 h-4" />
                        Route to Diagnostic Center
                    </button>
                    <button
                        onClick={() => setShowHospitalModal(true)}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                        <Building2 className="w-4 h-4" />
                        Refer to Hospital
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    
                    {/* Medical Context */}
                    <Card padding="none" className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl">
                        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-emerald-600" />
                                Medical Context
                            </h2>
                        </div>
                        <div className="p-5 sm:p-6 grid grid-cols-1 gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Diagnosis</h3>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <p className="text-gray-900 dark:text-gray-100 font-medium text-base">
                                        {prescription.diagnosis || <span className="text-gray-400 italic font-normal">No diagnosis provided</span>}
                                    </p>
                                </div>
                            </div>
                            
                            {prescription.notes && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Doctor&apos;s Notes & Observations</h3>
                                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {prescription.notes}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {((prescription as any).dietaryAdvice || (prescription as any).lifestyleAdvice) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    {(prescription as any).dietaryAdvice && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Dietary Advice</h3>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800/30">
                                                {(prescription as any).dietaryAdvice}
                                            </p>
                                        </div>
                                    )}
                                    {(prescription as any).lifestyleAdvice && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Lifestyle Advice</h3>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                {(prescription as any).lifestyleAdvice}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Medicines List */}
                    {prescription.medications && prescription.medications.length > 0 && (
                        <Card padding="none" className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl">
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Pill className="w-5 h-5 text-emerald-600" />
                                    Prescribed Medicines
                                </h2>
                                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {prescription.medications.length} total
                                </span>
                            </div>
                            
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {prescription.medications.map((med: any, idx: number) => (
                                    <div key={idx} className="p-5 sm:p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between gap-5">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                                        {med.medicineName || med.name}
                                                    </h3>
                                                    {med.isCritical && (
                                                        <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400">
                                                            Critical
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm ml-auto md:ml-0 ${
                                                        med.beforeFood 
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400'
                                                    }`}>
                                                        {med.beforeFood ? 'Before Food' : 'After Food'}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                    <div>
                                                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Dosage</span>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{med.dosage}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Frequency</span>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{med.frequency}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Duration</span>
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{med.duration}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {med.instructions && (
                                            <div className="mt-4 flex items-start gap-2 bg-gray-50/80 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                <ClipboardList className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Instructions</span>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                        {med.instructions}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Uploaded File View if any */}
                    {((prescription as any).file_url || (prescription as any).pdf_url) && !prescription.medications?.length && (
                        <Card padding="none" className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl">
                            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <FileImage className="w-5 h-5 text-emerald-600" />
                                    Uploaded Prescription
                                </h2>
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-950 flex justify-center p-6">
                                <img 
                                    src={(prescription as any).file_url || (prescription as any).pdf_url} 
                                    alt="Prescription Document" 
                                    className="max-h-[800px] w-auto max-w-full object-contain rounded-xl shadow-md border border-gray-200 dark:border-gray-800"
                                />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar (Summary Panel) */}
                <div className="space-y-6 sm:space-y-8">
                    <Card padding="none" className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden sticky top-6">
                        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                Summary
                            </h2>
                        </div>
                        <div className="p-5 sm:p-6 space-y-5">
                            <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Consultation Date</p>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                    {createdDate ? createdDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}
                                </p>
                            </div>
                            
                            <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Next Follow-up</p>
                                {followUpDate ? (
                                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30 text-sm shadow-sm">
                                        <Clock className="w-4 h-4" />
                                        {followUpDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                ) : (
                                    <p className="font-medium text-gray-500 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700/50 italic">
                                        Not scheduled
                                    </p>
                                )}
                            </div>

                            <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Medicines Prescribed</p>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg bg-gray-100 dark:bg-gray-800 h-8 w-8 rounded-full flex items-center justify-center">
                                        {prescription.medications?.length || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {showRouteModal && (
                <RoutePharmacyModal
                    prescriptionId={prescription.id}
                    items={prescription.medications || []}
                    onClose={() => setShowRouteModal(false)}
                />
            )}
            {showDiagnosticModal && (
                <RouteDiagnosticModal
                    prescriptionId={prescription.id}
                    patientId={prescription.patientId || (prescription as any).patient_id}
                    onClose={() => setShowDiagnosticModal(false)}
                />
            )}
            {showHospitalModal && (
                <RouteHospitalModal
                    patientId={prescription.patientId || (prescription as any).patient_id}
                    consultationId={prescription.consultationId || (prescription as any).consultation_id}
                    onClose={() => setShowHospitalModal(false)}
                />
            )}
        </div>
    );
}
