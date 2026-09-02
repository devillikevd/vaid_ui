'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Ticket,
    User,
    Phone,
    Stethoscope,
    Building2,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ShieldAlert,
    Sparkles
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface GenerateTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTokenGenerated: () => void;
    doctors: { id: string; name: string; specialization?: string; departmentId?: string; departmentName?: string }[];
    departments: { id: string; name: string }[];
}

export function GenerateTokenModal({
    isOpen,
    onClose,
    onTokenGenerated,
    doctors,
    departments,
}: GenerateTokenModalProps) {
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('male');
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState('0');
    const [source, setSource] = useState('walk_in');
    const [tokenPrefix, setTokenPrefix] = useState('OPD');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successToken, setSuccessToken] = useState<any | null>(null);

    // Auto-filter doctors when department is selected
    const filteredDoctors = selectedDepartment
        ? doctors.filter(
              (d) =>
                  d.departmentId === selectedDepartment ||
                  d.departmentName?.toLowerCase() === departments.find((dp) => dp.id === selectedDepartment)?.name.toLowerCase()
          )
        : doctors;

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setSelectedDepartment('');
            setSelectedDoctor('');
            setPatientName('');
            setPatientPhone('');
            setPatientAge('');
            setPatientGender('male');
            setReason('');
            setPriority('0');
            setSource('walk_in');
            setTokenPrefix('OPD');
            setError(null);
            setSuccessToken(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedDoctor) {
            setError('Please select an attending doctor.');
            return;
        }
        if (!patientName.trim()) {
            setError('Please enter patient name.');
            return;
        }

        setLoading(true);
        try {
            const res = await hospitalApi.generateQueueToken({
                doctorId: selectedDoctor,
                departmentId: selectedDepartment || undefined,
                patientName: patientName.trim(),
                patientPhone: patientPhone.trim() || undefined,
                patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
                patientGender,
                reason: reason.trim() || undefined,
                priority: parseInt(priority, 10),
                source,
                tokenPrefix: priority === '3' ? 'EMR' : tokenPrefix,
            });

            if (res.success && res.token) {
                setSuccessToken(res.token);
                onTokenGenerated();
            } else {
                setError(res.message || 'Failed to generate token. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'A network error occurred while generating token.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <Ticket className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Issue OPD Token
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Register walk-in or queue arrival for outpatient care.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form or Success State */}
                {successToken ? (
                    <div className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Token Generated Successfully
                            </span>
                            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-1">
                                {successToken.display_token || `${successToken.token_prefix}-${successToken.token_number}`}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Patient: <span className="font-semibold text-slate-700 dark:text-slate-200">{successToken.patient_name || patientName}</span>
                            </p>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700 text-xs space-y-1 text-left">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Attending Doctor:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {doctors.find((d) => d.id === selectedDoctor)?.name || 'Doctor'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Estimated Wait:</span>
                                <span className="font-semibold text-teal-600 dark:text-teal-400">
                                    ~{successToken.estimated_wait_minutes || 10} minutes
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Queue Date:</span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                    {new Date().toLocaleDateString('en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessToken(null);
                                    setPatientName('');
                                    setPatientPhone('');
                                    setReason('');
                                }}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Issue Another Token
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                                Done & View Queue
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Doctor & Department */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Department (Optional)
                                </label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => {
                                        setSelectedDepartment(e.target.value);
                                        setSelectedDoctor('');
                                    }}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Attending Doctor <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                                >
                                    <option value="">Select Doctor</option>
                                    {filteredDoctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Patient Information */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                            <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                                Patient Details
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                        Patient Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Ramesh Verma"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                        Phone Contact
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="10-digit mobile number"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                        Age
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Years"
                                        min="0"
                                        max="120"
                                        value={patientAge}
                                        onChange={(e) => setPatientAge(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        value={patientGender}
                                        onChange={(e) => setPatientGender(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Priority & Source */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Queue Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => {
                                        setPriority(e.target.value);
                                        if (e.target.value === '3') setTokenPrefix('EMR');
                                    }}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="0">Normal (FIFO)</option>
                                    <option value="1">Urgent Care (1)</option>
                                    <option value="2">VIP Patient (2)</option>
                                    <option value="3">Emergency (3)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Source
                                </label>
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="walk_in">Walk-in OPD</option>
                                    <option value="appointment">Appointment</option>
                                    <option value="referral">Internal Referral</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Token Prefix
                                </label>
                                <select
                                    value={tokenPrefix}
                                    onChange={(e) => setTokenPrefix(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                                >
                                    <option value="OPD">OPD</option>
                                    <option value="EMR">EMR (Emergency)</option>
                                    <option value="FOL">FOL (Follow-up)</option>
                                    <option value="REV">REV (Revisit)</option>
                                </select>
                            </div>
                        </div>

                        {/* Chief Reason */}
                        <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                Reason / Chief Complaint
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Fever and persistent cough"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Generate Token</span>
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
