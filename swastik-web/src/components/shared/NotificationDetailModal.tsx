'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Building2, UserPlus, X, Info, CheckCircle2, XCircle, 
    Calendar, ArrowRight, Loader2, ExternalLink, Clock, ShieldAlert,
    FileText, AlertTriangle, Bell, Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { doctorApi, api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDistanceToNow, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationPayload {
    id?: string;
    title: string;
    message?: string;
    type: string;
    category?: string;
    action_url?: string | null;
    action_data?: any;
    is_read?: boolean;
    read?: boolean;
    created_at?: string;
    timestamp?: string;
    data?: Record<string, any>;
}

export function getNotificationIcon(type: string) {
    const t = (type || '').toLowerCase();
    if (t.includes('appointment') || t.includes('consultation')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (t.includes('sos') || t.includes('emergency') || t.includes('health_alert')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (t === 'clinic_affiliation_ended') return <Building2 className="w-5 h-5 text-amber-500" />;
    if (t.includes('invite') || t.includes('reinvite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    if (t.includes('prescription') || t.includes('medicine')) return <FileText className="w-5 h-5 text-emerald-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
}

interface NotificationDetailModalProps {
    notification: NotificationPayload | null;
    isOpen: boolean;
    onClose: () => void;
    onActionCompleted?: () => void;
}

export function NotificationDetailModal({
    notification,
    isOpen,
    onClose,
    onActionCompleted,
}: NotificationDetailModalProps) {
    const [isConfirmingDecline, setIsConfirmingDecline] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [inviteState, setInviteState] = useState<'pending' | 'accepted' | 'rejected' | 'expired' | null>(null);
    const [loadingInviteStatus, setLoadingInviteStatus] = useState(false);

    const router = useRouter();
    const toast = useToast();

    const timestamp = notification?.created_at || notification?.timestamp || new Date().toISOString();
    const type = notification?.type || 'info';
    const isReinvite = type === 'clinic_reinvite' || type === 'clinic_invite';
    const isEnded = type === 'clinic_affiliation_ended';
    const inviteId = notification?.data?.inviteId || notification?.data?.id;

    // Reset state and check fresh invite status when modal opens
    useEffect(() => {
        if (!isOpen || !notification) {
            setIsConfirmingDecline(false);
            setIsProcessingAction(false);
            setInviteState(null);
            return;
        }

        if (isReinvite && inviteId) {
            setLoadingInviteStatus(true);
            doctorApi.getClinicInvites()
                .then((res) => {
                    if (res.success && Array.isArray(res.data)) {
                        const current = res.data.find((inv: any) => inv.id === inviteId);
                        if (current) {
                            setInviteState(current.status as any);
                        }
                    }
                })
                .catch(() => {})
                .finally(() => setLoadingInviteStatus(false));
        }
    }, [isOpen, notification, isReinvite, inviteId]);

    if (!isOpen || !notification) return null;

    // Action: Accept Rejoin / Invite
    const handleAcceptInvite = async () => {
        if (!inviteId) {
            router.push('/doctor/care-networks?tab=invitations');
            onClose();
            return;
        }

        setIsProcessingAction(true);
        try {
            const response = await doctorApi.respondClinicInvite(inviteId, 'accept');
            if (response.success) {
                const clinicName = notification.data?.clinicName || 'the clinic';
                toast.success('Invitation Accepted!', `You have rejoined ${clinicName}. Clinical features are now active.`);
                setInviteState('accepted');
                onActionCompleted?.();
                onClose();
            } else {
                toast.error('Failed to accept invitation', response.error || 'Please try again.');
            }
        } catch (err: any) {
            toast.error('Failed to accept invitation', err.message || 'Please try again.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Action: Decline Rejoin / Invite
    const handleDeclineInvite = async () => {
        if (!inviteId) {
            router.push('/doctor/care-networks?tab=invitations');
            onClose();
            return;
        }

        setIsProcessingAction(true);
        try {
            const response = await doctorApi.respondClinicInvite(inviteId, 'reject');
            if (response.success) {
                toast.success('Invitation Declined', 'The clinic rejoin invitation has been declined.');
                setInviteState('rejected');
                setIsConfirmingDecline(false);
                onActionCompleted?.();
                onClose();
            } else {
                toast.error('Failed to decline invitation', response.error || 'Please try again.');
            }
        } catch (err: any) {
            toast.error('Failed to decline invitation', err.message || 'Please try again.');
        } finally {
            setIsProcessingAction(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-[#111c2e] rounded-3xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-modal-title"
            >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/60 flex items-center justify-center text-brand-600 dark:text-brand-400">
                            {getNotificationIcon(type)}
                        </div>
                        <div>
                            <h3 id="notification-modal-title" className="text-base font-extrabold text-gray-900 dark:text-white">
                                {notification.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Received {formatDistanceToNow(timestamp)}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        aria-label="Close modal"
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    {/* CASE 1: REJOIN INVITATION */}
                    {isReinvite ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                                        Rejoin Invitation
                                    </span>
                                    {inviteState === 'accepted' ? (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                            Active Affiliation
                                        </span>
                                    ) : inviteState === 'rejected' ? (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                            Declined
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                                            Action Required
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                                    {notification.data?.clinicName || 'Clinic'}
                                </h4>
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {notification.data?.message || notification.message}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-semibold">Status:</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400 capitalize">
                                        {loadingInviteStatus ? 'Checking...' : inviteState === 'accepted' ? 'Active / Already Accepted' : inviteState === 'rejected' ? 'Declined' : 'Pending Review'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-semibold">Invitation Date:</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-200">
                                        {formatDate(timestamp)}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {inviteState === 'accepted' 
                                    ? 'You have already accepted this invitation. Your active affiliation with the clinic is active and available in My Care Networks.'
                                    : 'Accepting this invitation will restore your active affiliation with the clinic, allowing in-person OPD bookings, patient routing, and clinic schedule management. Your historical record remains preserved.'}
                            </p>

                            {/* Decline Confirmation Prompt */}
                            {isConfirmingDecline && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 space-y-3">
                                    <p className="text-xs font-bold text-red-900 dark:text-red-300">
                                        Are you sure you want to decline this rejoin invitation?
                                    </p>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsConfirmingDecline(false)}
                                            disabled={isProcessingAction}
                                            className="text-xs font-bold rounded-xl"
                                        >
                                            No, Keep It
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleDeclineInvite}
                                            disabled={isProcessingAction}
                                            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl"
                                        >
                                            {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, Decline Invitation'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : isEnded ? (
                        /* CASE 2: AFFILIATION ENDED */
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                                        Affiliation Ended
                                    </span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                                        Former Affiliation
                                    </span>
                                </div>
                                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                                    {notification.data?.clinicName || 'Clinic'}
                                </h4>
                            </div>

                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-semibold">Ended On:</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-200">
                                        {formatDate(notification.data?.endedAt || timestamp)}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                    <span className="text-gray-500 font-semibold block mb-1">Termination Reason:</span>
                                    <p className="font-bold text-gray-900 dark:text-gray-200">
                                        {notification.data?.reason || 'Affiliation ended by clinic'}
                                    </p>
                                </div>
                                {notification.data?.note && (
                                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                        <span className="text-gray-500 font-semibold block mb-1">Clinic Note:</span>
                                        <p className="text-gray-700 dark:text-gray-300 italic">
                                            {notification.data?.note}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                <p className="leading-relaxed">
                                    This affiliation has ended. Your historical patient consultations and ratings are preserved. You can continue using your doctor account normally.
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* CASE 3: GENERAL NOTIFICATION DETAILS */
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800">
                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {notification.message}
                                </p>
                            </div>

                            {notification.data && Object.keys(notification.data).length > 0 && (
                                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                                    <span className="font-bold text-gray-500 uppercase tracking-wider block mb-1 text-[10px]">
                                        Event Data
                                    </span>
                                    {Object.entries(notification.data).map(([key, val]) => {
                                        if (typeof val === 'object' || key === 'idempotencyKey') return null;
                                        return (
                                            <div key={key} className="flex items-center justify-between">
                                                <span className="text-gray-500 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                <span className="font-bold text-gray-900 dark:text-gray-200 truncate max-w-[240px]">{String(val)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0c1422] flex items-center justify-between gap-3 shrink-0">
                    {isReinvite && !isConfirmingDecline ? (
                        inviteState === 'accepted' ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="text-xs font-bold rounded-xl"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        router.push('/doctor/care-networks');
                                        onClose();
                                    }}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                >
                                    View in Care Networks
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsConfirmingDecline(true)}
                                    disabled={isProcessingAction}
                                    className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs rounded-xl"
                                >
                                    Decline
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            router.push('/doctor/care-networks?tab=invitations');
                                            onClose();
                                        }}
                                        className="text-xs font-bold rounded-xl"
                                    >
                                        View in Care Networks
                                    </Button>
                                    <Button
                                        onClick={handleAcceptInvite}
                                        disabled={isProcessingAction}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20"
                                    >
                                        {isProcessingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Accept & Rejoin'}
                                    </Button>
                                </div>
                            </>
                        )
                    ) : isEnded ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="text-xs font-bold rounded-xl"
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    router.push('/doctor/care-networks?tab=history');
                                    onClose();
                                }}
                                className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                            >
                                View Care Networks
                            </Button>
                        </>
                    ) : isConfirmingDecline ? (
                        <div className="w-full flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsConfirmingDecline(false)}
                                className="text-xs font-bold rounded-xl"
                            >
                                Back
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="text-xs font-bold rounded-xl"
                            >
                                Close
                            </Button>
                            {(notification.action_url || notification.data?.action_url) && (
                                <Button
                                    onClick={() => {
                                        const url = notification.action_url || notification.data?.action_url;
                                        router.push(url);
                                        onClose();
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
                                >
                                    Open Link <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
