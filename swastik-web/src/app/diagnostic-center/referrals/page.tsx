
'use client';
import React, { useState } from 'react';
import { ReferralInbox } from '@/components/referrals/ReferralInbox';
import { ReferralSent } from '@/components/referrals/ReferralSent';
import { PageHeader } from '@/components/shared/PageHeader';

export default function ReferralsPage() {
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <PageHeader title="Universal Referrals" subtitle="Manage incoming and outgoing referrals" />
            
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button 
                    onClick={() => setActiveTab('inbox')}
                    className={`font-medium text-sm px-4 py-2 ${activeTab === 'inbox' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Inbox
                </button>
                <button 
                    onClick={() => setActiveTab('sent')}
                    className={`font-medium text-sm px-4 py-2 ${activeTab === 'sent' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    Sent
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'inbox' ? <ReferralInbox /> : <ReferralSent />}
            </div>
        </div>
    );
}
