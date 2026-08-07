'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, Pill, FileImage, Download, Printer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useDoctorStore } from '@/stores/doctorStore';

export default function PrescriptionDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params as { id: string };
    
    const { prescriptions, fetchPrescriptions } = useDoctorStore();
    const [isLoading, setIsLoading] = useState(true);

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
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!prescription) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Prescription Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">The prescription you are looking for does not exist or you do not have permission to view it.</p>
                <button onClick={() => router.back()} className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    Go Back
                </button>
            </div>
        );
    }

    const createdDate = (prescription as any).date ? new Date((prescription as any).date) : prescription.created_at ? new Date(prescription.created_at) : null;
    const followUpDate = prescription.followUpDate ? new Date(prescription.followUpDate) : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            Prescription Details
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                prescription.status === 'expired' 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}>
                                {(prescription.status || 'Active').toUpperCase()}
                            </span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 text-sm">
                            <Calendar className="w-4 h-4" /> 
                            {createdDate ? createdDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    {((prescription as any).file_url || (prescription as any).pdf_url) && (
                        <a 
                            href={(prescription as any).file_url || (prescription as any).pdf_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </a>
                    )}
                </div>
            </div>

            {/* Patient & Diagnosis Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card padding="md" className="md:col-span-2">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl uppercase">
                            {prescription.patientName?.[0] || 'U'}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{prescription.patientName || 'Unknown Patient'}</h3>
                            {(prescription as any).patientPhone && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{(prescription as any).patientPhone}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Diagnosis</h4>
                            <p className="text-gray-900 dark:text-gray-100 font-medium bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                {prescription.diagnosis || 'No specific diagnosis provided.'}
                            </p>
                        </div>
                        {prescription.notes && (
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Doctor's Notes</h4>
                                <p className="text-gray-700 dark:text-gray-300 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg text-sm border border-emerald-100 dark:border-emerald-900/20">
                                    {prescription.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card padding="md">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" /> Summary
                    </h3>
                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Consultation Date</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{createdDate?.toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Next Follow-up</p>
                            {followUpDate ? (
                                <p className="font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 inline-block px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/30">
                                    {followUpDate.toLocaleDateString('en-IN')}
                                </p>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 italic">Not scheduled</p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Medicines Count</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {prescription.medications?.length || 0} Prescribed
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Uploaded File View if any */}
            {((prescription as any).file_url || (prescription as any).pdf_url) && !prescription.medications?.length && (
                <Card padding="md">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-emerald-600" /> Uploaded Prescription
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-center p-4">
                        <img 
                            src={(prescription as any).file_url || (prescription as any).pdf_url} 
                            alt="Prescription Document" 
                            className="max-h-[600px] max-w-full object-contain"
                        />
                    </div>
                </Card>
            )}

            {/* Medicines List */}
            {prescription.medications && prescription.medications.length > 0 && (
                <Card padding="none">
                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Pill className="w-5 h-5 text-emerald-600" /> Prescribed Medicines
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {prescription.medications.map((med: any, idx: number) => (
                            <div key={idx} className="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {med.medicineName || med.name}
                                            </h3>
                                            {med.isCritical && (
                                                <span className="bg-red-100 text-red-700 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                                                    Critical
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Dosage</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{med.dosage}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Frequency</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{med.frequency}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Duration</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{med.duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:text-right">
                                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                                            med.beforeFood 
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-400'
                                                : 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400'
                                        }`}>
                                            {med.beforeFood ? 'Before Food' : 'After Food'}
                                        </span>
                                    </div>
                                </div>
                                {med.instructions && (
                                    <div className="mt-4 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            <span className="font-semibold text-gray-900 dark:text-gray-100 mr-2">Instructions:</span>
                                            {med.instructions}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Additional Advice */}
            {((prescription as any).dietaryAdvice || (prescription as any).lifestyleAdvice) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                    {(prescription as any).dietaryAdvice && (
                        <Card padding="md" className="border-l-4 border-l-orange-400">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Dietary Advice</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                {(prescription as any).dietaryAdvice}
                            </p>
                        </Card>
                    )}
                    {(prescription as any).lifestyleAdvice && (
                        <Card padding="md" className="border-l-4 border-l-blue-400">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Lifestyle Advice</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                {(prescription as any).lifestyleAdvice}
                            </p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
