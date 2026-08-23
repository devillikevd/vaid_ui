'use client';
import React, { useState, useEffect } from 'react';
import { useDoctorStore } from '@/stores/doctorStore';
import { ReferralInbox } from '@/components/referrals/ReferralInbox';
import { ReferralSent } from '@/components/referrals/ReferralSent';
import { CreateReferralModal } from '@/components/referrals/CreateReferralModal';
import { Button } from '@/components/ui/Button';
import { Building2, Plus } from 'lucide-react';

export default function DoctorReferralsPage() {
    const { organizations, fetchOrganizations, loadingOrganizations } = useDoctorStore();
    const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (!organizations || organizations.length === 0) {
            fetchOrganizations();
        }
    }, [organizations, fetchOrganizations]);

    useEffect(() => {
        if (organizations && organizations.length > 0 && !activeOrgId) {
            setActiveOrgId(organizations[0].id);
        }
    }, [organizations, activeOrgId]);

    if (loadingOrganizations) {
        return <div className="p-8 text-center text-gray-500">Loading organizations...</div>;
    }

    if (!organizations || organizations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Building2 className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Active Organization</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md text-center">
                    Join or activate a Clinic/Hospital network before sending referrals.
                </p>
            </div>
        );
    }

    const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Working as:</span>
                        <select 
                            className="bg-white dark:bg-[#131A2B] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={activeOrgId || ''}
                            onChange={(e) => setActiveOrgId(e.target.value)}
                        >
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>
                                    {org.organization_type === 'hospital' ? '🏥' : '⚕️'} {org.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Referral
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'inbox'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    Inbox
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'sent'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    Sent
                </button>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'inbox' ? (
                    <ReferralInbox contextOrgId={activeOrg.id} />
                ) : (
                    <ReferralSent contextOrgId={activeOrg.id} />
                )}
            </div>

            {isCreateModalOpen && (
                <CreateReferralModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    contextOrgId={activeOrg.id}
                    contextOrgType={activeOrg.organization_type}
                    contextOrgName={activeOrg.name}
                />
            )}
        </div>
    );
}
