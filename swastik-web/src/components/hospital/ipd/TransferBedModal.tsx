'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    ArrowLeftRight,
    BedDouble,
    Building2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface TransferBedModalProps {
    admission: any | null;
    isOpen: boolean;
    onClose: () => void;
    onTransferred: () => void;
    wards: { id: string; name: string; ward_type?: string }[];
    beds: { id: string; bed_number: string; bed_type?: string; ward_id?: string; status?: string }[];
}

export function TransferBedModal({
    admission,
    isOpen,
    onClose,
    onTransferred,
    wards,
    beds,
}: TransferBedModalProps) {
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedBed, setSelectedBed] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableBeds = selectedWard
        ? beds.filter((b) => b.ward_id === selectedWard && b.status === 'available')
        : beds.filter((b) => b.status === 'available');

    useEffect(() => {
        if (isOpen) {
            setSelectedWard('');
            setSelectedBed('');
            setReason('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !admission) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedBed) {
            setError('Please select a target available bed.');
            return;
        }

        setLoading(true);
        try {
            const res = await hospitalApi.transferBed(admission.id, selectedBed, reason.trim() || undefined);
            if (res.success) {
                onTransferred();
                onClose();
            } else {
                setError(res.message || res.error || 'Failed to transfer patient.');
            }
        } catch (err: any) {
            setError(err.message || 'A network error occurred while transferring patient.');
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
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                            <ArrowLeftRight className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Bed Transfer
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Reallocate inpatient to a new ward or bed.
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

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Patient & Current Bed Snapshot */}
                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Patient:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{admission.patient?.name || 'Patient'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Current Bed / Ward:</span>
                            <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                                {admission.ward?.name || 'Ward'} • Bed {admission.bed?.bed_number || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-500">Admission ID:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">{admission.admission_number || admission.id}</span>
                        </div>
                    </div>

                    {/* Target Ward & Bed Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Target Ward
                            </label>
                            <select
                                value={selectedWard}
                                onChange={(e) => {
                                    setSelectedWard(e.target.value);
                                    setSelectedBed('');
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">All Wards</option>
                                {wards.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name} ({w.ward_type || 'Ward'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Target Available Bed <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedBed}
                                onChange={(e) => setSelectedBed(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            >
                                <option value="">Select Available Bed</option>
                                {availableBeds.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        Bed {b.bed_number} ({b.bed_type || 'General'})
                                    </option>
                                ))}
                            </select>
                            {selectedWard && availableBeds.length === 0 && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                    No available beds in the selected ward.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">
                            Transfer Reason / Clinical Indication
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. ICU step-down to general ward, infection isolation"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                            disabled={loading || !selectedBed}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Confirm Bed Transfer</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
