'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    User,
    Phone,
    Mail,
    Stethoscope,
    Building2,
    Calendar,
    Clock,
    Award,
    Star,
    ShieldCheck,
    ExternalLink,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Briefcase,
    Activity,
    Video,
    Loader2
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DoctorDetailsDrawerProps {
    doctor: any | null;
    isOpen: boolean;
    onClose: () => void;
    onEndAffiliation?: (doctorId: string) => Promise<void>;
    canManageDoctors?: boolean;
}

export function DoctorDetailsDrawer({
    doctor,
    isOpen,
    onClose,
    onEndAffiliation,
    canManageDoctors = true,
}: DoctorDetailsDrawerProps) {
    const [isEnding, setIsEnding] = useState(false);
    const [showConfirmEnd, setShowConfirmEnd] = useState(false);

    if (!isOpen || !doctor) return null;

    const formatDate = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return d;
        }
    };

    const handleConfirmEndAffiliation = async () => {
        if (!onEndAffiliation) return;
        setIsEnding(true);
        try {
            await onEndAffiliation(doctor.id);
            setShowConfirmEnd(false);
            onClose();
        } finally {
            setIsEnding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    {doctor.id ? `DOC-${doctor.id.slice(0, 8).toUpperCase()}` : 'DOCTOR'}
                                </span>
                                <StatusBadge status={doctor.status || 'active'} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                Medical Staff Profile & Workspace
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

                        {/* 1. Doctor Profile Hero */}
                        <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs border border-teal-700/20">
                                    {doctor.profileImageUrl ? (
                                        <img
                                            src={doctor.profileImageUrl}
                                            alt={doctor.name}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    ) : (
                                        doctor.name ? doctor.name[0].toUpperCase() : 'D'
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                            Dr. {doctor.name}
                                        </h3>
                                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                                    </div>
                                    <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                                        {doctor.specialization || 'Clinical Specialist'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {doctor.department || 'General OPD'} • {doctor.designation || 'Consultant'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        {doctor.email || 'Not provided'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                        {doctor.phone || 'Not provided'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Hospital Affiliation & Credentials */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Hospital Affiliation</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Department:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {doctor.department || 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Employment Type:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {doctor.employmentType || doctor.designation || 'Full-Time'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Affiliation Status:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                                        {doctor.status || 'Active'}
                                    </span>
                                </div>
                                {doctor.joinedAt && (
                                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Affiliation Date:</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">
                                            {formatDate(doctor.joinedAt)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Clinical Services & Consultation Modes */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Clinical Care & Consultation Modes</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-teal-50 text-teal-700 border border-teal-200">
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        <span>Hospital OPD Visit</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                                        <Video className="w-3.5 h-3.5" />
                                        <span>Teleconsultation</span>
                                    </span>
                                </div>

                                {doctor.consultationFee && (
                                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Base Consultation Fee:</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                            ₹{parseFloat(doctor.consultationFee).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}

                                {doctor.experience && (
                                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <span className="text-slate-500">Clinical Experience:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {doctor.experience} years
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Operational Activity Summary */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Operations & Activity</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Today's Appointments:</span>
                                    <span className="font-bold text-teal-700 dark:text-teal-400 font-mono text-sm">
                                        {doctor.appointmentsToday || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Doctor Rating:</span>
                                    <span className="font-bold text-amber-600 flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                        <span>{doctor.rating ? Number(doctor.rating).toFixed(1) : '5.0'}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Related Hospital Workspaces */}
                        <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Doctor Schedule & Appointments
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Review OPD queue and appointments for Dr. {doctor.name}.
                                </p>
                            </div>
                            <Link
                                href={`/hospital/appointments?doctorId=${encodeURIComponent(doctor.id)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                            >
                                <span>Appointments</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* 6. End Affiliation Dangerous Zone */}
                        {canManageDoctors && onEndAffiliation && (
                            <div className="pt-2">
                                {showConfirmEnd ? (
                                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl space-y-2 text-xs">
                                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>End Doctor Affiliation?</span>
                                        </div>
                                        <p className="text-rose-600 dark:text-rose-300 text-[11px]">
                                            This will remove Dr. {doctor.name} from active hospital duty, OPD schedules, and department assignments.
                                        </p>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={handleConfirmEndAffiliation}
                                                disabled={isEnding}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                            >
                                                {isEnding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                <span>Confirm End Affiliation</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmEnd(false)}
                                                className="px-3 py-1.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmEnd(true)}
                                        className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>End Hospital Affiliation</span>
                                    </button>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close Workspace
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
