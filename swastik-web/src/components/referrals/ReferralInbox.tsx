
'use client';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UniversalReferral } from '@/types/referrals';
import { ReferralFilters } from './ReferralFilters';
import { ReferralDetailsDrawer } from './ReferralDetailsDrawer';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ReferralInboxProps {
    contextOrgId?: string;
}

export function ReferralInbox({ contextOrgId }: ReferralInboxProps = {}) {
    const toast = useToast();
    const [referrals, setReferrals] = useState<UniversalReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const loadReferrals = async () => {
        try {
            setLoading(true);
            const res = await api.universalReferrals.getReferralInbox({ status: statusFilter, urgency: urgencyFilter });
            if (res.success) { let data = (res.data as unknown as UniversalReferral[]) || []; if (contextOrgId) data = data.filter(r => r.receiver_id === contextOrgId); setReferrals(data); }
        } catch (error) {
            toast.error('Failed to load referral inbox');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReferrals(); }, [statusFilter, urgencyFilter]);

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.universalReferrals.updateReferralStatus(id, status);
            toast.success(`Referral marked as ${status}`);
            loadReferrals();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) return <div className="p-4 animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>;

    if (referrals.length === 0) return (
        <Card className="p-8 text-center bg-white dark:bg-gray-800 border dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Referrals</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your inbox is empty.</p>
        </Card>
    );

    return (
        <div className="space-y-4">
            <ReferralFilters status={statusFilter} urgency={urgencyFilter} onStatusChange={setStatusFilter} onUrgencyChange={setUrgencyFilter} />
            <ReferralDetailsDrawer id={selectedId!} isOpen={!!selectedId} onClose={() => setSelectedId(null)} />
            {referrals.map(ref => (
                <Card key={ref.id} className="p-4 flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-gray-800 border dark:border-gray-700">
                    <div>
                        <h4 className="font-medium text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => setSelectedId(ref.id)}>{ref.patient?.full_name || 'Unknown'}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">From: {ref.sender_snapshot?.name || ref.sender_type}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{ref.status}</span>
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{ref.urgency}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {ref.status === 'pending' && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => updateStatus(ref.id, 'rejected')}>Reject</Button>
                                <Button size="sm" onClick={() => updateStatus(ref.id, 'accepted')}>Accept</Button>
                            </>
                        )}
                        {ref.status === 'accepted' && (
                            <Button size="sm" onClick={() => updateStatus(ref.id, 'in_progress')}>Start</Button>
                        )}
                        {ref.status === 'in_progress' && (
                            <Button size="sm" onClick={() => updateStatus(ref.id, 'completed')}>Complete</Button>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    );
}
