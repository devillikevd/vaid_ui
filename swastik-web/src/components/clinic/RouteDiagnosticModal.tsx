'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clinicApi, doctorApi } from '@/lib/api';
import { Stethoscope, X, Loader2, Send, Network } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Props {
    prescriptionId: string;
    patientId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function RouteDiagnosticModal({ prescriptionId, patientId, onClose, onSuccess }: Props) {
    const toast = useToast();
    const router = useRouter();
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedCenterId, setSelectedCenterId] = useState<string>('');
    const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>('');

    const isDoctorContext = typeof window !== 'undefined' && window.location.pathname.includes('/doctor');

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                if (isDoctorContext) {
                    const res = await doctorApi.getPrescriptionDiagnosticPartners(prescriptionId);
                    if (res.success && Array.isArray(res.data || (res as any).partners)) {
                        setPartnerships((res.data || (res as any).partners) as any[]);
                    } else {
                        setPartnerships([]);
                    }
                } else {
                    const { fetchWithAuth } = await import('@/lib/api');
                    const res = await fetchWithAuth<{ success: boolean; data: any[] }>('/clinics/owner/partnerships?status=active');
                    if (res.success && Array.isArray(res.data)) {
                        const diagnosticPartners = res.data.filter((p: any) => p.partner?.type === 'diagnostic_center' || p.target_type === 'diagnostic_center');
                        setPartnerships(diagnosticPartners);
                    }
                }
            } catch (err: any) {
                toast.error('Error', err?.message || 'Failed to load active diagnostic partners');
                setPartnerships([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPartners();
    }, [prescriptionId, isDoctorContext]);

    const handleRoute = async () => {
        if (!selectedCenterId) {
            toast.warning('Required', 'Please select a diagnostic center');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                centerId: selectedCenterId,
                prescriptionId,
                patientId,
                bookingDate,
                collectionType: 'walk_in',
                notes: notes.trim() || undefined
            };

            let res;
            if (isDoctorContext) {
                res = await doctorApi.routePrescriptionToDiagnostic(prescriptionId, payload);
            } else {
                res = await clinicApi.routeDiagnosticBooking(payload);
            }

            if (res.success) {
                toast.success('Success', 'Diagnostic booking routed successfully!');
                onSuccess?.();
                onClose();
            } else {
                toast.error('Error', (res as any).message || 'Failed to route booking');
            }
        } catch (err: any) {
            toast.error('Error', err.message || 'Error routing booking');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                        Route to Diagnostic Center
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : partnerships.length === 0 ? (
                        <div className="text-center py-8 space-y-4">
                            <p className="text-gray-500 dark:text-gray-400">
                                No active diagnostic center partners found.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    router.push(isDoctorContext ? '/doctor/care-networks' : '/clinic/care-networks');
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 rounded-xl transition-colors"
                            >
                                <Network className="w-4 h-4" />
                                Manage Care Networks
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Diagnostic Partner
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {partnerships.map((p) => (
                                    <label
                                        key={p.id}
                                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                                            selectedCenterId === p.partner?.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="diagnostic_center"
                                            value={p.partner?.id}
                                            checked={selectedCenterId === p.partner?.id}
                                            onChange={() => setSelectedCenterId(p.partner?.id)}
                                            className="sr-only"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white flex items-center justify-between">
                                                <span>{p.partner?.name}</span>
                                                {p.partner?.is_verified && (
                                                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                {p.partner?.city || p.partner?.address || 'Location available'}
                                            </div>
                                            {p.partner?.phone && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    Phone: {p.partner.phone}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Preferred Date
                                </label>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notes / Clinical Instructions (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Fasting blood sugar, CBC, lipid profile"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRoute}
                        disabled={!selectedCenterId || submitting || partnerships.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Booking
                    </button>
                </div>
            </div>
        </div>
    );
}
