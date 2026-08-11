'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface SuperAdminActionsProps {
    providerId: string;
    providerType: string;
    currentStatus: string;
    onStatusChange: () => void;
}

export default function SuperAdminActions({ providerId, providerType, currentStatus, onStatusChange }: SuperAdminActionsProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reason, setReason] = useState('');
    const [actionType, setActionType] = useState<'suspend' | 'blacklist' | 'reactivate' | null>(null);
    const toast = useToast();

    const isSuspended = currentStatus === 'suspended' || currentStatus === 'blacklisted';

    const handleAction = async () => {
        if (!actionType) return;
        if ((actionType === 'suspend' || actionType === 'blacklist') && !reason.trim()) {
            toast.error('Reason Required', 'You must provide a reason for this action.');
            return;
        }

        setIsSubmitting(true);
        try {
            let res;
            if (actionType === 'reactivate') {
                res = await adminApi.reactivateProvider(providerType as any, providerId, reason);
            } else {
                // For this V1, both Suspend and Blacklist map to suspendProvider
                // You can distinguish by reason or in the future add a distinct blacklistProvider endpoint
                const prefix = actionType === 'blacklist' ? '[BLACKLISTED]' : '[SUSPENDED]';
                res = await adminApi.suspendProvider(providerType as any, providerId, `${prefix} ${reason}`);
            }

            if (res.success) {
                toast.success('Status Updated', `Provider has been successfully ${actionType}d.`);
                setReason('');
                setActionType(null);
                onStatusChange();
            } else {
                toast.error('Action Failed', res.error || `Failed to ${actionType} provider.`);
            }
        } catch (err) {
            toast.error('Error', 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-6 p-4 border border-red-500/20 bg-red-50 dark:bg-red-900/10 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Super Admin Controls</h3>
            </div>
            
            {!actionType ? (
                <div className="flex flex-wrap gap-3">
                    {isSuspended ? (
                        <Button 
                            variant="outline" 
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                            onClick={() => setActionType('reactivate')}
                            leftIcon={<UserCheck className="h-4 w-4" />}
                        >
                            Reactivate Provider
                        </Button>
                    ) : (
                        <>
                            <Button 
                                variant="outline" 
                                className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/30"
                                onClick={() => setActionType('suspend')}
                                leftIcon={<AlertTriangle className="h-4 w-4" />}
                            >
                                Suspend Account
                            </Button>
                            <Button 
                                variant="outline" 
                                className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                onClick={() => setActionType('blacklist')}
                                leftIcon={<UserX className="h-4 w-4" />}
                            >
                                Blacklist Provider
                            </Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4 max-w-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium capitalize">
                        {actionType} Provider
                    </p>
                    <Input 
                        placeholder={`Reason for ${actionType} (Internal & Audit Log)`} 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setActionType(null)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button 
                            className={actionType === 'reactivate' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}
                            onClick={handleAction} 
                            isLoading={isSubmitting}
                        >
                            Confirm {actionType}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
