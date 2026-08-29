'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doctorApi } from '@/lib/api';
import { Building2, X, Loader2, FileText, AlertTriangle, Send, Network } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Props {
    prescriptionId?: string;
    patientId: string;
    consultationId?: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function RouteHospitalModal({ prescriptionId, patientId, consultationId, onClose, onSuccess }: Props) {
    const toast = useToast();
    const router = useRouter();
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
    const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergency'>('routine');
    const [reason, setReason] = useState('');
    const [clinicalSummary, setClinicalSummary] = useState('');
    const [consentGranted, setConsentGranted] = useState(false);

    const isDoctorContext = typeof window !== 'undefined' && window.location.pathname.includes('/doctor');

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                if (isDoctorContext && prescriptionId) {
                    const res = await doctorApi.getPrescriptionHospitalPartners(prescriptionId);
                    if (res.success && Array.isArray(res.data || (res as any).partners)) {
                        setPartnerships((res.data || (res as any).partners) as any[]);
                    } else {
                        setPartnerships([]);
                    }
                } else {
                    const { fetchWithAuth } = await import('@/lib/api');
                    const res = await fetchWithAuth<{ success: boolean; data: any[] }>('/clinics/owner/partnerships?status=active');
                    if (res.success && Array.isArray(res.data)) {
                        const hospitalPartners = res.data.filter((p: any) => p.partner?.type === 'hospital' || p.target_type === 'hospital');
                        setPartnerships(hospitalPartners);
                    }
                }
            } catch (err: any) {
                toast.error('Error', err?.message || 'Failed to load active hospital partners');
                setPartnerships([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPartners();
    }, [prescriptionId, isDoctorContext]);

    const handleRoute = async () => {
        if (!selectedHospitalId) return toast.warning('Required', 'Please select a hospital.');
        if (!reason.trim()) return toast.warning('Required', 'Please enter a reason for referral.');
        if (!consentGranted) return toast.warning('Consent Required', 'Explicit patient consent is required to share clinical data with the hospital.');

        setSubmitting(true);
        try {
            const payload = {
                hospitalId: selectedHospitalId,
                patientId,
                consultationId,
                urgency,
                reason: reason.trim(),
                clinicalSummary: clinicalSummary.trim() || undefined,
                consentGranted: true
            };

            let res;
            if (isDoctorContext && prescriptionId) {
                res = await doctorApi.referPrescriptionToHospital(prescriptionId, payload);
            } else {
                const { fetchWithAuth } = await import('@/lib/api');
                res = await fetchWithAuth('/clinics/owner/partnerships/referrals', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            if (res.success) {
                toast.success('Success', 'Patient referral created successfully!');
                onSuccess?.();
                onClose();
            } else {
                toast.error('Error', (res as any).message || 'Failed to create referral');
            }
        } catch (err: any) {
            toast.error('Error', err.message || 'Error creating referral');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        Refer to Partner Hospital
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : partnerships.length === 0 ? (
                        <div className="text-center py-8 space-y-4">
                            <p className="text-gray-500 dark:text-gray-400">
                                No eligible hospital partners found. Cannot create referral.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    router.push(isDoctorContext ? '/doctor/care-networks' : '/clinic/care-networks');
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 rounded-xl transition-colors"
                            >
                                <Network className="w-4 h-4" />
                                Manage Care Networks
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Hospital Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Target Hospital <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedHospitalId}
                                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                >
                                    <option value="">Select Hospital</option>
                                    {partnerships.map((p) => (
                                        <option key={p.partner?.id || p.id} value={p.partner?.id || p.id}>
                                            {p.partner?.name || 'Hospital'}{p.partner?.city ? ` (${p.partner.city})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Urgency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Urgency <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    {['routine', 'urgent', 'emergency'].map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setUrgency(level as any)}
                                            className={`flex-1 capitalize py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                                                urgency === level 
                                                ? level === 'emergency' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                                : level === 'urgent' ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'
                                                : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason for Referral <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., Suspected appendicitis, needs surgical evaluation"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                                />
                            </div>

                            {/* Clinical Summary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    Clinical Summary
                                </label>
                                <textarea
                                    value={clinicalSummary}
                                    onChange={(e) => setClinicalSummary(e.target.value)}
                                    rows={3}
                                    placeholder="Relevant clinical findings, history, and test results..."
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Include only necessary information relevant to this referral.</p>
                            </div>

                            {/* Consent Checkbox */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={consentGranted}
                                        onChange={(e) => setConsentGranted(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-500 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" /> Patient Consent Required
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-1">
                                            I confirm that the patient has provided explicit consent to share their demographics and the above clinical summary with the selected hospital for the purpose of this referral.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRoute}
                        disabled={loading || submitting || !selectedHospitalId || partnerships.length === 0}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Referral
                    </button>
                </div>
            </div>
        </div>
    );
}
