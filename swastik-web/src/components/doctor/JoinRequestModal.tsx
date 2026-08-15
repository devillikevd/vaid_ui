'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Send, MapPin, Building2, Clock, CheckCircle2, 
    Calendar, Briefcase, Video, Stethoscope, Hospital, 
    Sparkles, AlertCircle 
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface JoinRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: any;
    onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
    { key: 'Monday', label: 'Mon' },
    { key: 'Tuesday', label: 'Tue' },
    { key: 'Wednesday', label: 'Wed' },
    { key: 'Thursday', label: 'Thu' },
    { key: 'Friday', label: 'Fri' },
    { key: 'Saturday', label: 'Sat' },
    { key: 'Sunday', label: 'Sun' },
];

const PRACTICE_TYPES = [
    { value: 'visiting', label: 'Visiting Consultant', desc: 'Specific days/hours' },
    { value: 'part_time', label: 'Part-Time', desc: 'Regular part-time shifts' },
    { value: 'full_time', label: 'Full-Time', desc: 'Dedicated full-time role' },
    { value: 'contract', label: 'Contract', desc: 'Fixed term or on-call' },
];

export default function JoinRequestModal({ isOpen, onClose, organization, onSuccess }: JoinRequestModalProps) {
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        specialization: '',
        department: '',
        practiceType: 'visiting',
        consultationModes: ['in_clinic', 'video'],
        preferredDays: ['Monday', 'Wednesday', 'Friday'] as string[],
        preferredStartTime: '09:00',
        preferredEndTime: '13:00',
        preferredStartDate: new Date().toISOString().split('T')[0],
        message: '',
    });

    if (!isOpen || !organization) return null;

    const isHospital = organization.type === 'hospital' || organization.organization_type === 'hospital';
    const orgName = organization.name || 'Organization';
    const locationStr = [organization.city, organization.state].filter(Boolean).join(', ') || organization.address || 'Location on file';

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            preferredDays: prev.preferredDays.includes(day)
                ? prev.preferredDays.filter(d => d !== day)
                : [...prev.preferredDays, day]
        }));
    };

    const toggleMode = (mode: string) => {
        setFormData(prev => {
            const exists = prev.consultationModes.includes(mode);
            if (exists && prev.consultationModes.length === 1) return prev; // keep at least 1
            return {
                ...prev,
                consultationModes: exists
                    ? prev.consultationModes.filter(m => m !== mode)
                    : [...prev.consultationModes, mode]
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                specialization: formData.specialization.trim() || undefined,
                department: formData.department.trim() || undefined,
                practiceType: formData.practiceType,
                consultationModes: formData.consultationModes,
                preferredDays: formData.preferredDays,
                preferredStartTime: formData.preferredStartTime,
                preferredEndTime: formData.preferredEndTime,
                preferredStartDate: formData.preferredStartDate || undefined,
                message: formData.message.trim() || undefined,
            };

            if (isHospital) {
                await doctorApi.requestToJoinHospital(organization.id, payload);
            } else {
                await doctorApi.requestToJoinClinic(organization.id, payload);
            }

            setIsSuccess(true);
            toast.success('Request Sent', `Successfully submitted join request to ${orgName}.`);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (error: any) {
            toast.error('Unable to send request', error.message || 'Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 15 }}
                        className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-gray-800"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 shrink-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                    isHospital
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                }`}>
                                    {isHospital ? <Hospital className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                                            Request to Join
                                        </h2>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                            isHospital
                                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
                                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                        }`}>
                                            {isHospital ? 'Hospital' : 'Clinic'}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{orgName}</span>
                                        <span>•</span>
                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                        <span className="truncate">{locationStr}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0 ml-2"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Scrollable Area */}
                        <div className="p-5 sm:p-7 overflow-y-auto flex-1 custom-scrollbar">
                            {isSuccess ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        Join Request Submitted!
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{orgName}</span> has received your proposed practice terms. You will be notified once they review and accept.
                                    </p>
                                </div>
                            ) : (
                                <form id="join-request-form" onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {/* 1. Practice Type */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-brand-500" /> Practice Type <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {PRACTICE_TYPES.map(pt => {
                                                const active = formData.practiceType === pt.value;
                                                return (
                                                    <button
                                                        key={pt.value}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, practiceType: pt.value }))}
                                                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                                            active
                                                                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20 text-brand-950 dark:text-brand-200 ring-2 ring-brand-500/20 shadow-sm'
                                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                    >
                                                        <span className="text-xs sm:text-sm font-bold block">{pt.label}</span>
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{pt.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Consultation Modes */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <Video className="w-3.5 h-3.5 text-brand-500" /> Consultation Modes <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                { key: 'in_clinic', label: 'In-Person Consultation', desc: 'OPD / Physical Clinic Presence', icon: Building2 },
                                                { key: 'video', label: 'Video / Teleconsultation', desc: 'Remote Care Network & Online OPD', icon: Video },
                                            ].map(m => {
                                                const active = formData.consultationModes.includes(m.key);
                                                const Icon = m.icon;
                                                return (
                                                    <button
                                                        key={m.key}
                                                        type="button"
                                                        onClick={() => toggleMode(m.key)}
                                                        className={`p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                                                            active
                                                                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20'
                                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                    >
                                                        <div className={`p-2 rounded-xl shrink-0 ${active ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-xs sm:text-sm font-bold block">{m.label}</span>
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">{m.desc}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Specialization & Department */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                                Specialization (Optional)
                                            </label>
                                            <div className="relative">
                                                <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={formData.specialization}
                                                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                                                    placeholder="e.g. Cardiologist, General Physician"
                                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                                                Target Department (Optional)
                                            </label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={formData.department}
                                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                    placeholder="e.g. Internal Medicine, Pediatrics"
                                                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Schedule Section */}
                                    <div className="bg-gray-50 dark:bg-gray-900/60 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Proposed Availability Schedule
                                            </h4>
                                            <span className="text-[11px] text-gray-500">Negotiable with organization</span>
                                        </div>

                                        {/* Preferred Days */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                                                Available Days
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {DAYS_OF_WEEK.map(d => {
                                                    const active = formData.preferredDays.includes(d.key);
                                                    return (
                                                        <button
                                                            key={d.key}
                                                            type="button"
                                                            onClick={() => toggleDay(d.key)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                                active
                                                                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            {d.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Time range & Start date */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.preferredStartTime}
                                                    onChange={e => setFormData({ ...formData, preferredStartTime: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.preferredEndTime}
                                                    onChange={e => setFormData({ ...formData, preferredEndTime: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                    Proposed Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.preferredStartDate}
                                                    onChange={e => setFormData({ ...formData, preferredStartDate: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Personal Note / Message */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                            <span>Introduction & Notes (Optional)</span>
                                            <span className="text-[11px] font-normal text-gray-400">{formData.message.length}/500</span>
                                        </label>
                                        <textarea
                                            maxLength={500}
                                            rows={3}
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="Introduce your clinical focus, specific expectations, or note any time constraints..."
                                            className="w-full p-3.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-all"
                                        />
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Sticky Modal Footer */}
                        {!isSuccess && (
                            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur shrink-0 flex items-center justify-between gap-3">
                                <p className="text-xs text-gray-500 hidden sm:block">
                                    Terms will be reviewed by {orgName}
                                </p>
                                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="join-request-form"
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                <span>Submit Join Request</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

