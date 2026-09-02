'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    TestTube,
    User,
    Building2,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Play,
    Check,
    ArrowUpRight,
    Stethoscope,
    ShieldAlert,
    Loader2,
    ExternalLink,
    FileText,
    Activity,
    ClipboardCheck,
    AlertCircle,
    Download,
    QrCode,
    CheckCheck
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface LabOrderDetailsDrawerProps {
    order: any | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (orderId: string, status: string, statusData?: Record<string, any>) => Promise<void>;
    canManageLab?: boolean;
}

export function LabOrderDetailsDrawer({
    order,
    isOpen,
    onClose,
    onUpdateStatus,
    canManageLab = true,
}: LabOrderDetailsDrawerProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'results' | 'specimen'>('details');

    // Collection input state
    const [barcode, setBarcode] = useState('');
    const [collectedBy, setCollectedBy] = useState('Duty Phlebotomist / Nurse');
    const [showCollectForm, setShowCollectForm] = useState(false);

    // Results input state
    const [resultNotes, setResultNotes] = useState('');
    const [isAbnormal, setIsAbnormal] = useState(false);
    const [criticalValue, setCriticalValue] = useState(false);
    const [reportUrl, setReportUrl] = useState('');
    const [showResultForm, setShowResultForm] = useState(false);

    if (!isOpen || !order) return null;

    const patient = order.patient;
    const doctor = order.orderingDoctor;
    const admission = order.admission;

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return d;
        }
    };

    const handleAction = async (status: string, extraData?: Record<string, any>) => {
        setActionLoading(status);
        try {
            await onUpdateStatus(order.id, status, extraData);
            if (status === 'report_approved' || status === 'completed') {
                setShowResultForm(false);
                setShowCollectForm(false);
                onClose();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const isOrdered = order.status === 'ordered' || order.status === 'pending';
    const isCollected = order.status === 'sample_collected';
    const isReceived = order.status === 'sample_received';
    const isProcessing = order.status === 'processing' || order.status === 'in_progress';
    const isReportReady = order.status === 'report_ready' || order.status === 'completed';
    const isApproved = order.status === 'report_approved' || order.status === 'released';

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    LAB-{order.id ? order.id.slice(0, 8).toUpperCase() : ''}
                                </span>
                                <StatusBadge status={order.status || 'ordered'} size="sm" />
                                {order.priority && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        order.priority === 'stat' || order.priority === 'emergency'
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300'
                                            : order.priority === 'urgent'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300'
                                            : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300'
                                    }`}>
                                        {order.priority}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                {order.test_name || 'Diagnostic Laboratory Order'}
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

                    {/* Sub-navigation Tabs */}
                    <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs">
                        {[
                            { id: 'details', label: 'Order & Patient' },
                            { id: 'specimen', label: 'Specimen & Tracking' },
                            { id: 'results', label: 'Results & Report' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as any)}
                                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                                    activeTab === t.id
                                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

                        {activeTab === 'details' && (
                            <>
                                {/* 1. Patient Details Card */}
                                <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                {patient?.name ? patient.name[0].toUpperCase() : 'P'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                    {patient?.name || 'Inpatient'}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {patient?.gender ? `${patient.gender} • ` : ''}
                                                    {patient?.date_of_birth ? `DOB: ${patient.date_of_birth} ` : ''}
                                                    {patient?.blood_group ? `• Blood: ${patient.blood_group}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 block">Category</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {order.test_category || 'Biochemistry'}
                                            </span>
                                        </div>
                                    </div>

                                    {admission && (
                                        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Admission No</span>
                                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                    {admission.admission_number || 'IPD'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Ward / Bed</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {admission.ward?.name || 'Ward'} / Bed {admission.bed?.bed_number || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Ordering Physician & Timing */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <span>Ordering Physician & Clinical Indication</span>
                                    </h4>
                                    <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2.5">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Ordering Doctor</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                                    Dr. {doctor?.name || 'Duty Medical Officer'}
                                                </span>
                                                <span className="text-[11px] text-slate-500 block">
                                                    {doctor?.specialization || 'Clinical Services'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Order Date & Time</span>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                                    {formatDateTime(order.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {order.clinical_notes && (
                                            <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                                <span className="text-slate-400 block text-[10px]">Clinical Indication / Notes</span>
                                                <p className="text-slate-800 dark:text-slate-200 font-medium">{order.clinical_notes}</p>
                                            </div>
                                        )}

                                        {order.fasting_required && (
                                            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2 font-semibold">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                <span>Fasting Required (Minimum 8-10 hours prior to sample collection)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'specimen' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                                            <TestTube className="w-4 h-4 text-teal-600" />
                                            <span>Specimen Details & Chain of Custody</span>
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                                            {order.specimen_type || 'Blood'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-teal-700 dark:text-teal-300">
                                        Barcode tracking and collection verification timestamps.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Sample Barcode</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                                                {order.sample_barcode || 'NOT-ASSIGNED'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Specimen Type</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {order.specimen_type || 'Venous Blood'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Collected At</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                {formatDateTime(order.sample_collected_at)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Collected By</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {order.sample_collected_by || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'results' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-teal-600" />
                                            <span>Diagnostic Laboratory Findings & Values</span>
                                        </h4>
                                        {order.is_abnormal && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                                Abnormal Flags
                                            </span>
                                        )}
                                        {order.critical_value && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                                Critical Value
                                            </span>
                                        )}
                                    </div>

                                    {order.result_notes ? (
                                        <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800">
                                            <span className="text-slate-400 block text-[10px] mb-1">Pathologist Observations</span>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{order.result_notes}</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 italic">
                                            Results have not yet been documented for this test order.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Reported At</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                {formatDateTime(order.reported_at)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">Approved By</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {order.approved_by ? `Dr. ${order.approved_by}` : 'Pending Approval'}
                                            </span>
                                        </div>
                                    </div>

                                    {order.turnaround_minutes && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px] text-teal-700 dark:text-teal-400 flex items-center gap-1 font-semibold">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Turnaround Time: {order.turnaround_minutes} minutes from order placement to reporting.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sample Collection Sub-form */}
                        {showCollectForm && (
                            <div className="p-4 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs">
                                    Document Specimen Collection
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Vial / Barcode Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. BC-982341"
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Collected By
                                        </label>
                                        <input
                                            type="text"
                                            value={collectedBy}
                                            onChange={(e) => setCollectedBy(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAction('sample_collected', { barcode, collectedBy })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'sample_collected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Confirm Collection</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCollectForm(false)}
                                        className="px-3.5 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Result Entry Sub-form */}
                        {showResultForm && (
                            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                                    Document Pathology Findings & Ready Report
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Test Results & Clinical Notes <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter parameter findings, measured values, normal ranges, and clinical interpretation..."
                                        value={resultNotes}
                                        onChange={(e) => setResultNotes(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAbnormal}
                                            onChange={(e) => setIsAbnormal(e.target.checked)}
                                            className="rounded text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Abnormal Value</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={criticalValue}
                                            onChange={(e) => setCriticalValue(e.target.checked)}
                                            className="rounded text-rose-600 focus:ring-rose-500"
                                        />
                                        <span className="font-semibold text-rose-700 dark:text-rose-400">Critical / STAT Alert</span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAction('report_ready', {
                                            resultNotes,
                                            isAbnormal,
                                            criticalValue,
                                            reportedBy: 'Duty Pathologist',
                                        })}
                                        disabled={Boolean(actionLoading) || !resultNotes.trim()}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {actionLoading === 'report_ready' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Submit Report Ready</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowResultForm(false)}
                                        className="px-3.5 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
                        {canManageLab && !isApproved ? (
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                {isOrdered && !showCollectForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCollectForm(true)}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <TestTube className="w-3.5 h-3.5" />
                                        <span>Collect Sample</span>
                                    </button>
                                )}

                                {isCollected && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('sample_received')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        Receive in Lab
                                    </button>
                                )}

                                {(isCollected || isReceived) && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('processing')}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        <span>Start Processing</span>
                                    </button>
                                )}

                                {isProcessing && !showResultForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowResultForm(true)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Enter Findings & Ready Report</span>
                                    </button>
                                )}

                                {isReportReady && (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('report_approved', { approvedBy: 'Authorized Reviewer' })}
                                        disabled={Boolean(actionLoading)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>Approve & Release Report</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-semibold">
                                {isApproved ? '✓ Lab report approved and released to medical chart.' : ''}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
