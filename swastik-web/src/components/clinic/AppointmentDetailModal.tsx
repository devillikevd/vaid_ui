/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useState } from 'react';
import { 
    X, Calendar, Clock, User, Phone, Mail, Stethoscope, 
    CheckCircle2, AlertCircle, Shield, CreditCard, Activity,
    History, MapPin, Video, Loader2, ArrowRight, Ban, RefreshCw,
    Building2
} from 'lucide-react';
import { useClinicStore, type ClinicAppointment } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';

interface AppointmentDetailModalProps {
    appointment: ClinicAppointment | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange?: () => void;
}

export function AppointmentDetailModal({
    appointment,
    isOpen,
    onClose,
    onStatusChange,
}: AppointmentDetailModalProps) {
    const { updateAppointmentStatus, checkInAppointment, rescheduleAppointment } = useClinicStore();
    const toast = useToast();

    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleSlot, setRescheduleSlot] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    if (!isOpen || !appointment) return null;

    const isUpcoming = ['scheduled', 'confirmed'].includes(appointment.status);
    const isCheckedIn = !!appointment.checkedInAt || appointment.status === 'checked_in';
    const isCompleted = appointment.status === 'completed';
    const isCancelled = appointment.status === 'cancelled';
    const isNoShow = appointment.status === 'no_show';
    const isInPerson = (appointment.type || 'clinic') === 'clinic';

    // Check In handler
    const handleCheckIn = async () => {
        setIsActionLoading(true);
        try {
            const success = await checkInAppointment(appointment.id);
            if (success) {
                toast.success('Patient Checked In', `${appointment.patientName} has been marked as checked in.`);
                onStatusChange?.();
                onClose();
            } else {
                toast.error('Check In Failed', 'Unable to check in patient at this time.');
            }
        } catch {
            toast.error('Network Error', 'Failed to connect to server.');
        } finally {
            setIsActionLoading(false);
        }
    };

    // Status transition handler (confirm / cancel / no-show)
    const handleStatusTransition = async (status: string, reason?: string) => {
        setIsActionLoading(true);
        try {
            const success = await updateAppointmentStatus(appointment.id, status, reason);
            if (success) {
                toast.success('Status Updated', `Appointment marked as ${status.replace('_', ' ')}.`);
                onStatusChange?.();
                onClose();
            } else {
                toast.error('Update Failed', `Failed to update status to ${status}.`);
            }
        } catch {
            toast.error('Network Error', 'Failed to update appointment.');
        } finally {
            setIsActionLoading(false);
            setShowCancelConfirm(false);
        }
    };

    // Reschedule handler
    const handleReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rescheduleDate || !rescheduleSlot) {
            toast.warning('Incomplete Details', 'Please select both a new date and time slot.');
            return;
        }
        setIsActionLoading(true);
        try {
            const success = await rescheduleAppointment(appointment.id, rescheduleDate, rescheduleSlot);
            if (success) {
                toast.success('Appointment Rescheduled', `Moved to ${rescheduleDate} at ${rescheduleSlot}.`);
                onStatusChange?.();
                onClose();
            } else {
                toast.error('Reschedule Failed', 'Unable to reschedule appointment.');
            }
        } catch {
            toast.error('Network Error', 'Failed to reschedule appointment.');
        } finally {
            setIsActionLoading(false);
            setShowReschedule(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between text-gray-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#111c2e]/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                                Appointment Details
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                ID: <span className="font-mono">{appointment.id.slice(0, 8)}...</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-6 text-xs">
                    
                    {/* Top Status & Date Banner */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-gray-900 dark:text-white">
                                    {appointment.date || 'Unscheduled'}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                    • {appointment.time || 'Flexible Time'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
                                {isInPerson ? (
                                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                                        <Building2 className="w-3.5 h-3.5" /> In-Person OPD Clinic Visit
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold">
                                        <Video className="w-3.5 h-3.5" /> Video Teleconsultation
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                                isUpcoming ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                                isCheckedIn ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                                isCompleted ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                isCancelled ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' :
                                'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                                {isCheckedIn && appointment.status !== 'checked_in' ? 'Checked In' : appointment.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Patient & Doctor 2-Column Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Patient Card */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-emerald-600" /> Patient Details
                            </span>
                            
                            <div className="flex items-center gap-3">
                                {appointment.patientProfileImage ? (
                                    <img
                                        src={appointment.patientProfileImage}
                                        alt={appointment.patientName}
                                        className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                                        {appointment.patientName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                                        {appointment.patientName}
                                    </h3>
                                    <p className="text-[11px] text-gray-500 capitalize">
                                        {appointment.patientGender || 'Patient'}
                                        {appointment.patientAge != null ? ` • ${appointment.patientAge} yrs` : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                                {appointment.patientPhone && (
                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        <span>{appointment.patientPhone}</span>
                                    </p>
                                )}
                                {appointment.patientEmail && (
                                    <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 truncate">
                                        <Mail className="w-3 h-3 text-gray-400" />
                                        <span className="truncate">{appointment.patientEmail}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Doctor Card */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> Consulting Physician
                            </span>

                            <div className="flex items-center gap-3">
                                {appointment.doctorProfileImage ? (
                                    <img
                                        src={appointment.doctorProfileImage}
                                        alt={appointment.doctorName}
                                        className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-sm flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                                        {appointment.doctorName.replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                                        Dr. {appointment.doctorName.replace(/^Dr\.\s*/i, '')}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        {appointment.doctorSpecialization || 'Medical Specialist'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                                    <span className="text-gray-400">Consultation Fee:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {appointment.fee != null ? `₹${appointment.fee}` : 'Standard Fee'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                                    <span className="text-gray-400">Payment:</span>
                                    <span className={`font-bold capitalize ${
                                        appointment.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>
                                        {appointment.paymentStatus || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason & Symptoms */}
                    {appointment.reason && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                Reason for Visit
                            </span>
                            <p className="text-gray-800 dark:text-gray-200 font-medium">
                                {appointment.reason}
                            </p>
                            {appointment.symptoms && (
                                <p className="text-gray-500 text-[11px] mt-1">
                                    Symptoms: {appointment.symptoms}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Status Audit History */}
                    {appointment.statusHistory && appointment.statusHistory.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-gray-500" /> Status Audit Trail
                            </span>
                            <div className="space-y-1.5">
                                {appointment.statusHistory.map((step, idx) => (
                                    <div 
                                        key={idx}
                                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="font-bold capitalize">{step.to.replace('_', ' ')}</span>
                                            <span className="text-gray-400">by {step.by}</span>
                                        </div>
                                        <span className="text-gray-400 font-mono text-[10px]">
                                            {new Date(step.at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reschedule Inline Form */}
                    {showReschedule && (
                        <form onSubmit={handleReschedule} className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-3">
                            <h4 className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                Reschedule Appointment
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                        New Date:
                                    </label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                        New Time Slot:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10:30 AM"
                                        value={rescheduleSlot}
                                        onChange={(e) => setRescheduleSlot(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowReschedule(false)}
                                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1"
                                >
                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    <span>Confirm Reschedule</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Cancellation Confirmation Inline */}
                    {showCancelConfirm && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-3">
                            <h4 className="font-extrabold text-red-900 dark:text-red-200 text-xs">
                                Confirm Appointment Cancellation
                            </h4>
                            <input
                                type="text"
                                placeholder="Reason for cancellation (optional)..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-900 dark:text-white"
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={() => handleStatusTransition('cancelled', cancelReason)}
                                    disabled={isActionLoading}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center gap-1"
                                >
                                    {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    <span>Yes, Cancel Appointment</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer / Contextual Actions */}
                <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-[#0f172a]/50">
                    
                    {/* Left secondary actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isUpcoming && !showReschedule && (
                            <button
                                onClick={() => {
                                    setShowReschedule(true);
                                    setShowCancelConfirm(false);
                                }}
                                disabled={isActionLoading}
                                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-xs transition-colors"
                            >
                                Reschedule
                            </button>
                        )}

                        {isUpcoming && !showCancelConfirm && (
                            <button
                                onClick={() => {
                                    setShowCancelConfirm(true);
                                    setShowReschedule(false);
                                }}
                                disabled={isActionLoading}
                                className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 font-bold text-xs transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    {/* Right primary front desk actions */}
                    <div className="flex items-center gap-2.5">
                        {/* Check In Action for In-Person Scheduled / Confirmed */}
                        {isInPerson && isUpcoming && !isCheckedIn && (
                            <button
                                onClick={handleCheckIn}
                                disabled={isActionLoading}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all"
                            >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>Check In Patient</span>
                            </button>
                        )}

                        {/* If already checked in */}
                        {isCheckedIn && !isCompleted && (
                            <span className="px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 font-extrabold text-xs rounded-xl border border-blue-300 dark:border-blue-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                            </span>
                        )}

                        {/* Confirmation action for scheduled */}
                        {appointment.status === 'scheduled' && (
                            <button
                                onClick={() => handleStatusTransition('confirmed')}
                                disabled={isActionLoading}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-blue-600/25 transition-colors"
                            >
                                Confirm
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-xs text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
