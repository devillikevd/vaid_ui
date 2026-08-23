
'use client';
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { UniversalReferral } from '@/types/referrals';
import { Button } from '@/components/ui/Button';
import { ReferralAttachmentList } from './ReferralAttachmentList';

export function ReferralDetailsDrawer({ id, isOpen, onClose }: { id: string, isOpen: boolean, onClose: () => void }) {
    const [referral, setReferral] = useState<UniversalReferral | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && id) {
            setLoading(true);
            api.universalReferrals.getReferral(id)
                .then(res => res.success && setReferral(res.data as unknown as UniversalReferral))
                .finally(() => setLoading(false));
        }
    }, [id, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-xl border-l dark:border-gray-700 overflow-y-auto transform transition-transform">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Referral Details</h2>
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                ) : referral ? (
                    <div className="space-y-6 text-gray-800 dark:text-gray-200">
                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">Header</h3>
                            <p><strong>Patient:</strong> {referral.patient?.full_name}</p>
                            <p><strong>Status:</strong> <span className="capitalize">{referral.status}</span></p>
                            <p><strong>Urgency:</strong> <span className="capitalize">{referral.urgency}</span></p>
                        </section>

                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">Route</h3>
                            <p>{referral.sender_snapshot?.name || referral.sender_type} &rarr; {referral.receiver_snapshot?.name || referral.receiver_type}</p>
                        </section>

                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">Clinical Context</h3>
                            <p><strong>Reason:</strong> {referral.reason}</p>
                            {referral.clinical_summary && <p><strong>Summary:</strong> {referral.clinical_summary}</p>}
                        </section>

                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">Attachments</h3>
                            <ReferralAttachmentList referralId={referral.id} attachments={referral.attachments || []} readonly={true} />
                        </section>

                        <section>
                            <h3 className="font-semibold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2 mb-2">Timeline</h3>
                            <p className="text-sm">Created: {new Date(referral.created_at).toLocaleString()}</p>
                            {referral.accepted_at && <p className="text-sm">Accepted: {new Date(referral.accepted_at).toLocaleString()}</p>}
                            {referral.completed_at && <p className="text-sm">Completed: {new Date(referral.completed_at).toLocaleString()}</p>}
                            
                            {referral.receiver_type === 'hospital' && referral.hospital_admission_status && (
                                <p className="text-sm mt-2 text-blue-600 dark:text-blue-400"><strong>Admission State:</strong> {referral.hospital_admission_status}</p>
                            )}
                        </section>
                    </div>
                ) : (
                    <p>Failed to load referral details.</p>
                )}
            </div>
        </div>
    );
}
