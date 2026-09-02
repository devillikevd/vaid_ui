'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Building2,
    User,
    Loader2,
    AlertCircle,
    Check
} from 'lucide-react';

interface DepartmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; headDoctorId?: string; description?: string; status: string }) => Promise<boolean>;
    editingDepartment: any | null;
    doctors: { id: string; name: string; specialization?: string }[];
}

export function DepartmentFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingDepartment,
    doctors,
}: DepartmentFormModalProps) {
    const [name, setName] = useState('');
    const [headDoctorId, setHeadDoctorId] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('active');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingDepartment) {
            setName(editingDepartment.name || '');
            setHeadDoctorId(editingDepartment.headDoctorId || '');
            setDescription(editingDepartment.description || '');
            setStatus(editingDepartment.status || 'active');
        } else {
            setName('');
            setHeadDoctorId('');
            setDescription('');
            setStatus('active');
        }
        setError(null);
    }, [editingDepartment, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Department name is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit({
                name: trimmed,
                headDoctorId: headDoctorId || undefined,
                description: description.trim() || undefined,
                status,
            });
            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save department');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {editingDepartment ? 'Edit Department' : 'Add New Department'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                        
                        {/* Department Name */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Department Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Cardiology, Orthopedics, Pediatrics"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                required
                            />
                        </div>

                        {/* Head of Department Doctor */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Head of Department (HOD)
                            </label>
                            <select
                                value={headDoctorId}
                                onChange={(e) => setHeadDoctorId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">No Head Assigned</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Brief overview of clinical scope, care services, or ward focus..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Operational Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="active">Active (Operational)</option>
                                <option value="inactive">Inactive (Suspended)</option>
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>{editingDepartment ? 'Save Changes' : 'Add Department'}</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
