'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { UniversalReferral, ReferralStatus, ReferralUrgency } from '@/types/referrals';
import { Button } from '@/components/ui/Button';
import { ReferralAttachmentList } from './ReferralAttachmentList';
import { useToast } from '@/components/ui/Toast';
import {
    X,
    User,
    Phone,
    Mail,
    Building2,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    FileText,
    ArrowRight,
    Loader2,
    ShieldCheck,
    Stethoscope,
    Paperclip
} from 'lucide-react';

interface ReferralDetailsDrawerProps {
    id: string | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdated?: () => void;
    isSent?: boolean;
}

export function ReferralDetailsDrawer({
    id,
    isOpen,
    onClose,
    onStatusUpdated,
    isSent = false
}: ReferralDetailsDrawerProps) {
    const toast = useToast();
    const [referral, setReferral] = useState<UniversalReferral | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const loadDetail = async (refId: string) => {
        setLoading(true);
        try {
            const res = await api.universalReferrals.getReferral(refId);
            if (res.success && res.data) {
                setReferral(res.data as unknown as UniversalReferral);
            } else {
                toast.error(res.message || 'Failed to load referral details');
            }
        } catch (err: any) {
            toast.error(err.message || 'Network error loading referral details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && id) {
            loadDetail(id);
        } else {
            setReferral(null);
        }
    }, [id, isOpen]);

    const handleUpdateStatus = async (newStatus: ReferralStatus) => {
        if (!referral) return;
        setActionLoading(true);
        try {
            const res = await api.universalReferrals.updateReferralStatus(referral.id, newStatus);
            if (res.success) {
                toast.success(`Referral updated to ${newStatus.replace('_', ' ')}`);
                await loadDetail(referral.id);
                onStatusUpdated?.();
            } else {
                toast.error(res.message || 'Failed to update referral status');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error updating status');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    const getStatusBadge = (status: ReferralStatus) => {
        switch (status) {
            case 'pending':
                return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            case 'accepted':
                return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'in_progress':
                return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'completed':
                return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'rejected':
            case 'cancelled':
                return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            case 'awaiting_consent':
                return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            default:
                return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
        }
    };

    const getUrgencyBadge = (urgency: ReferralUrgency) => {
        switch (urgency) {
            case 'emergency':
                return 'bg-rose-500 text-white animate-pulse';
            case 'urgent':
                return 'bg-amber-500 text-white';
            case 'routine':
            default:
                return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/40 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                    Referral Details
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    ID: {id?.slice(0, 8)}...
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                <p className="text-sm font-medium text-gray-500">Loading referral record...</p>
                            </div>
                        ) : referral ? (
                            <>
                                {/* Status & Urgency Pills */}
                                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Current Status</span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(referral.status)}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            {referral.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Urgency Priority</span>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getUrgencyBadge(referral.urgency)}`}>
                                            {referral.urgency}
                                        </span>
                                    </div>
                                </div>

                                {/* Patient Card */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200 dark:border-emerald-800/40">
                                            {(referral.patient?.full_name || referral.patient?.users?.name || 'P')[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                {referral.patient?.full_name || referral.patient?.users?.name || 'Patient'}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Patient ID: {referral.patient_id?.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>

                                    {(referral.patient?.users?.phone || referral.patient?.users?.email) && (
                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                            {referral.patient.users.phone && (
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {referral.patient.users.phone}
                                                </span>
                                            )}
                                            {referral.patient.users.email && (
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {referral.patient.users.email}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Pathway Route */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Referral Pathway</h4>
                                    
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <div className="flex-1 min-w-0 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Referring From</span>
                                            <p className="font-bold text-gray-900 dark:text-white truncate">
                                                {referral.sender_snapshot?.name || referral.sender_user_name_snapshot || referral.sender_type}
                                            </p>
                                            <span className="text-[10px] font-medium text-gray-500 capitalize">{referral.sender_type}</span>
                                        </div>

                                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />

                                        <div className="flex-1 min-w-0 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Referred To</span>
                                            <p className="font-bold text-gray-900 dark:text-white truncate">
                                                {referral.receiver_snapshot?.name || referral.receiver_type}
                                            </p>
                                            <span className="text-[10px] font-medium text-gray-500 capitalize">{referral.receiver_type}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Clinical Context */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Clinical Indication</h4>
                                    
                                    <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block mb-1">Primary Reason</span>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                                            {referral.reason}
                                        </p>
                                    </div>

                                    {referral.clinical_summary && (
                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Clinical Summary / Notes</span>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words">
                                                {referral.clinical_summary}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Medical Documents & Attachments */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5" /> Medical Documents
                                        </h4>
                                        <span className="text-xs font-bold text-gray-500">
                                            {referral.attachments?.length || 0} attached
                                        </span>
                                    </div>
                                    
                                    <ReferralAttachmentList
                                        referralId={referral.id}
                                        attachments={referral.attachments || []}
                                        readonly={true}
                                    />
                                </div>

                                {/* Timeline */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2 text-xs">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">History & Timeline</h4>
                                    
                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800">
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Created</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                                            {new Date(referral.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    {referral.accepted_at && (
                                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800">
                                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Accepted</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-200">
                                                {new Date(referral.accepted_at).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {referral.completed_at && (
                                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800">
                                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-200">
                                                {new Date(referral.completed_at).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {referral.hospital_admission_status && (
                                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 py-1">
                                            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Hospital Status</span>
                                            <span className="font-bold uppercase tracking-wider">{referral.hospital_admission_status}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                <p className="font-semibold">Unable to load referral.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {referral && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 flex items-center justify-end gap-3 shrink-0">
                            {/* Inbox Actions */}
                            {!isSent && (
                                <>
                                    {referral.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUpdateStatus('rejected')}
                                                disabled={actionLoading}
                                                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleUpdateStatus('accepted')}
                                                disabled={actionLoading}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept Referral'}
                                            </Button>
                                        </>
                                    )}

                                    {referral.status === 'accepted' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdateStatus('in_progress')}
                                            disabled={actionLoading}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Clinical Care'}
                                        </Button>
                                    )}

                                    {referral.status === 'in_progress' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleUpdateStatus('completed')}
                                            disabled={actionLoading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Completed'}
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* Sent Actions */}
                            {isSent && referral.status === 'pending' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStatus('cancelled')}
                                    disabled={actionLoading}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Referral'}
                                </Button>
                            )}

                            <Button variant="outline" size="sm" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
