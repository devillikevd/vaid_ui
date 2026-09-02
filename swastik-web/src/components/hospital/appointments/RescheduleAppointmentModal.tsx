'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { HospitalAppointment } from '@/stores/hospitalStore';

interface RescheduleModalProps {
    appointment: HospitalAppointment | null;
    isOpen: boolean;
    onClose: () => void;
    onReschedule: (appointmentId: string, date: string, timeSlot: string) => Promise<boolean>;
}

const COMMON_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

export function RescheduleAppointmentModal({
    appointment,
    isOpen,
    onClose,
    onReschedule,
}: RescheduleModalProps) {
    const [date, setDate] = useState(
        appointment?.date || new Date().toISOString().split('T')[0]
    );
    const [timeSlot, setTimeSlot] = useState(appointment?.time || '10:00');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !appointment) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !timeSlot) {
            setError('Please select both date and time slot.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onReschedule(appointment.id, date, timeSlot);
            if (success) {
                onClose();
            } else {
                setError('Failed to reschedule. The slot may be already booked.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to reschedule appointment.');
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
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Reschedule Appointment
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                For {appointment.patientName} with Dr. {appointment.doctorName}
                            </p>
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
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                New Appointment Date
                            </label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Available Time Slot
                            </label>
                            <div className="relative">
                                <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <select
                                    value={timeSlot}
                                    onChange={(e) => setTimeSlot(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                                    required
                                >
                                    {COMMON_TIME_SLOTS.map((slot) => {
                                        const hour = parseInt(slot.split(':')[0], 10);
                                        const minute = slot.split(':')[1];
                                        const ampm = hour >= 12 ? 'PM' : 'AM';
                                        const displayHour = hour % 12 || 12;
                                        const label = `${displayHour}:${minute} ${ampm}`;
                                        return (
                                            <option key={slot} value={slot}>
                                                {label} ({slot})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
