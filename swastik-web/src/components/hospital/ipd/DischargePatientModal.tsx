'use client';

import React, { useState } from 'react';
import {
    X,
    LogOut,
    CheckCircle2,
    Calendar,
    AlertCircle,
    Loader2,
    FileText
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface DischargePatientModalProps {
    admission: any | null;
    isOpen: boolean;
    onClose: () => void;
    onDischarged: () => void;
}

export function DischargePatientModal({
    admission,
    isOpen,
    onClose,
    onDischarged,
}: DischargePatientModalProps) {
    const [finalDiagnosis, setFinalDiagnosis] = useState('');
    const [dischargeType, setDischargeType] = useState('normal');
    const [conditionAtDischarge, setConditionAtDischarge] = useState('improved');
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpInstructions, setFollowUpInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !admission) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const payload: Record<string, any> = {
                finalDiagnosis: finalDiagnosis.trim() || undefined,
                dischargeType,
                conditionAtDischarge,
                dischargeNotes: dischargeNotes.trim() || undefined,
                followUpDate: followUpDate || undefined,
                followUpInstructions: followUpInstructions.trim() || undefined,
            };

            const res = await hospitalApi.dischargePatient(admission.id, payload);
            if (res.success) {
                onDischarged();
                onClose();
            } else {
                setError(res.message || res.error || 'Failed to discharge patient.');
            }
        } catch (err: any) {
            setError(err.message || 'A network error occurred while processing discharge.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Inpatient Discharge Order
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Complete clinical discharge and liberate allocated bed.
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Patient & Bed Summary */}
                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Patient Name:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{admission.patient?.name || 'Patient'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Ward & Bed:</span>
                            <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                                {admission.ward?.name || 'General Ward'} • Bed {admission.bed?.bed_number || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Admission Date:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                                {admission.admitted_at ? new Date(admission.admitted_at).toLocaleDateString('en-IN') : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Discharge Type & Condition */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Discharge Type
                            </label>
                            <select
                                value={dischargeType}
                                onChange={(e) => setDischargeType(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="normal">Normal / Standard Discharge</option>
                                <option value="lama">LAMA (Against Medical Advice)</option>
                                <option value="transfer">Transferred to Another Facility</option>
                                <option value="expired">Deceased / Expired</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Condition at Discharge
                            </label>
                            <select
                                value={conditionAtDischarge}
                                onChange={(e) => setConditionAtDischarge(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                            >
                                <option value="cured">Fully Cured / Recovered</option>
                                <option value="improved">Clinically Improved</option>
                                <option value="stable">Stable / Home Care</option>
                                <option value="unfavorable">Unfavorable</option>
                            </select>
                        </div>
                    </div>

                    {/* Final Diagnosis */}
                    <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">
                            Final Discharge Diagnosis
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Acute appendicitis post laparoscopic appendectomy"
                            value={finalDiagnosis}
                            onChange={(e) => setFinalDiagnosis(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Follow up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                Recommended Follow-Up Date
                            </label>
                            <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                Follow-up Instructions
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Suture removal in 7 days"
                                value={followUpInstructions}
                                onChange={(e) => setFollowUpInstructions(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">
                            Discharge Summary Notes
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Add final clinical observations and discharge notes..."
                            value={dischargeNotes}
                            onChange={(e) => setDischargeNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
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
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Confirm Patient Discharge</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
