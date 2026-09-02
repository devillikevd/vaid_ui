'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { HospitalAppointment } from '@/stores/hospitalStore';

interface CancelModalProps {
    appointment: HospitalAppointment | null;
    isOpen: boolean;
    onClose: () => void;
    onCancel: (appointmentId: string, status: string, reason?: string) => Promise<boolean>;
}

export function CancelAppointmentModal({
    appointment,
    isOpen,
    onClose,
    onCancel,
}: CancelModalProps) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !appointment) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const success = await onCancel(appointment.id, 'cancelled', reason);
            if (success) {
                onClose();
            } else {
                setError('Failed to cancel appointment.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to cancel appointment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left shadow-2xl transition-all w-full max-w-md border border-slate-200 dark:border-gray-800">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Cancel Appointment
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    For {appointment.patientName} with Dr. {appointment.doctorName}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Reason for Cancellation (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g. Doctor unavailable, Patient requested cancellation, Emergency..."
                                rows={3}
                                className="w-full p-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
                            >
                                Keep Appointment
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
