'use client';

import React, { useState, useEffect } from 'react';
import { clinicApi } from '@/lib/api';
import { Pill, X, Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Props {
    prescriptionId: string;
    items: any[];
    onClose: () => void;
    onSuccess?: () => void;
}

export function RoutePharmacyModal({ prescriptionId, items, onClose, onSuccess }: Props) {
    const toast = useToast();
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { fetchWithAuth } = await import('@/lib/api');
                const isDoctorContext = window.location.pathname.includes('/doctor');
                const endpoint = isDoctorContext 
                    ? `/doctors/prescriptions/${prescriptionId}/pharmacy-partners`
                    : '/clinics/owner/partnerships?status=active';
                
                const res = await fetchWithAuth(endpoint);
                
                if (res.success && Array.isArray(res.data)) {
                    const pharmacyPartners = isDoctorContext 
                        ? res.data 
                        : res.data.filter((p: any) => p.partner?.type === 'pharmacy' || p.target_type === 'pharmacy');
                    setPartnerships(pharmacyPartners);
                }
            } catch (err) {
                toast.error('Error', 'Failed to load active pharmacy partners');
            } finally {
                setLoading(false);
            }
        };
        fetchPartners();
    }, [prescriptionId]);

    const handleRoute = async () => {
        if (!selectedPharmacyId) {
            toast.warning('Required', 'Please select a pharmacy');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                pharmacyId: selectedPharmacyId,
                prescriptionId,
                items: items.map(item => ({
                    name: item.medicineName || item.name,
                    quantity: item.quantity || 1,
                    requiresPrescription: true, // It's from a prescription
                })),
                deliveryType: 'pickup', // Default to pickup
            };

            const isDoctorContext = window.location.pathname.includes('/doctor');
            let res;
            if (isDoctorContext) {
                const { fetchWithAuth } = await import('@/lib/api');
                res = await fetchWithAuth(`/doctors/prescriptions/${prescriptionId}/route-to-pharmacy`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            } else {
                res = await clinicApi.routePharmacyOrder(payload);
            }

            if (res.success) {
                toast.success('Success', 'Prescription routed to partner pharmacy successfully!');
                onSuccess?.();
                onClose();
            } else {
                toast.error('Error', res.message || 'Failed to route prescription');
            }
        } catch (err: any) {
            toast.error('Error', err.message || 'Error routing prescription');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Pill className="w-5 h-5 text-emerald-600" />
                        Send to Partner Pharmacy
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        </div>
                    ) : partnerships.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No active pharmacy partners found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Pharmacy Partner
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {partnerships.map((p) => (
                                    <label
                                        key={p.id}
                                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                                            selectedPharmacyId === p.partner.id
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="pharmacy"
                                            value={p.partner.id}
                                            checked={selectedPharmacyId === p.partner.id}
                                            onChange={() => setSelectedPharmacyId(p.partner.id)}
                                            className="sr-only"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {p.partner.name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {p.partner.city || p.partner.address || 'Location unavailable'}
                                            </div>
                                        </div>
                                    </label>
                                ))}
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
                        disabled={!selectedPharmacyId || submitting || partnerships.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Order
                    </button>
                </div>
            </div>
        </div>
    );
}
