'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
    Building2, Activity, MapPin, Phone, Mail, Clock, Calendar, AlertCircle, Loader2, RefreshCw, CheckCircle, XCircle, Search, ChevronRight, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { pharmacyApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface FacilitySummary {
    id: string;
    type: string;
    label: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
}

interface ProviderInvite {
    id: string;
    facility_type: string;
    facility_id: string;
    status: string;
    created_at: string;
    expires_at: string;
    facility: FacilitySummary;
    invitedBy?: { name?: string; email?: string; phone?: string };
}

interface ProviderAssociation extends FacilitySummary {
    associationId: string;
    facilityId: string;
    facilityType: string;
    associatedAt: string;
}

export default function PharmacyAssociationsPage() {
    const [invites, setInvites] = useState<ProviderInvite[]>([]);
    const [partners, setPartners] = useState<ProviderAssociation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'hospital' | 'clinic'>('all');

    const [selectedPartner, setSelectedPartner] = useState<ProviderAssociation | null>(null);

    const toast = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [invitesRes, partnersRes] = await Promise.all([
                pharmacyApi.getAssociationInvites(),
                pharmacyApi.getAssociations()
            ]);

            if (invitesRes.success && partnersRes.success) {
                setInvites((invitesRes.data as ProviderInvite[]) || []);
                setPartners((partnersRes.data as ProviderAssociation[]) || []);
            } else {
                setError(invitesRes.error || partnersRes.error || 'Failed to load partner network data');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while loading partner network');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInviteResponse = async (inviteId: string, decision: 'accept' | 'reject') => {
        setActionLoading(inviteId);
        try {
            const res = await pharmacyApi.respondToAssociationInvite(inviteId, decision);
            if (res.success) {
                toast.success(`Invitation ${decision}ed successfully`);
                loadData(); // Refresh both lists
            } else {
                toast.error(res.error || `Failed to ${decision} invitation`);
            }
        } catch (err: any) {
            toast.error(err.message || `Error ${decision}ing invitation`);
        } finally {
            setActionLoading(null);
        }
    };

    const pendingInvites = invites.filter(inv => inv.status === 'pending');

    const filteredInvites = useMemo(() => {
        return pendingInvites.filter(inv => {
            if (filterType !== 'all' && inv.facility_type !== filterType) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = inv.facility?.name?.toLowerCase().includes(q);
                const cityMatch = inv.facility?.city?.toLowerCase().includes(q);
                const stateMatch = inv.facility?.state?.toLowerCase().includes(q);
                return nameMatch || cityMatch || stateMatch;
            }
            return true;
        });
    }, [pendingInvites, filterType, searchQuery]);

    const filteredPartners = useMemo(() => {
        return partners.filter(p => {
            if (filterType !== 'all' && p.facilityType !== filterType) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = p.name?.toLowerCase().includes(q);
                const cityMatch = p.city?.toLowerCase().includes(q);
                const stateMatch = p.state?.toLowerCase().includes(q);
                return nameMatch || cityMatch || stateMatch;
            }
            return true;
        });
    }, [partners, filterType, searchQuery]);

    if (loading && partners.length === 0 && invites.length === 0) {
        return (
            <div className="space-y-6">
                <div className="h-20 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error && partners.length === 0 && invites.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unable to load partner network.</h3>
                <p className="text-gray-600">{error}</p>
                <Button onClick={loadData} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Partner Network</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage hospitals, clinics and other organizations connected to your pharmacy.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* KPI Cards */}
                    <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-900/50 dark:bg-orange-900/20">
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-400">Active Partners</span>
                        <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-800 dark:text-orange-300">
                            {partners.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900/50 dark:bg-blue-900/20">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-400">Pending Invites</span>
                        <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-800 dark:text-blue-300">
                            {pendingInvites.length}
                        </span>
                    </div>
                    <Button onClick={loadData} variant="outline" size="sm" aria-label="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search & Filters */}
            <Card padding="sm" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 p-1">
                    <button 
                        onClick={() => setFilterType('all')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterType === 'all' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterType('hospital')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterType === 'hospital' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        Hospitals
                    </button>
                    <button 
                        onClick={() => setFilterType('clinic')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterType === 'clinic' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                    >
                        Clinics
                    </button>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search partner organization, city, or state..."
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Pending Invitations */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Pending Invitations
                    {filteredInvites.length > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{filteredInvites.length}</span>
                    )}
                </h2>
                
                {filteredInvites.length === 0 ? (
                    <Card padding="lg" className="border-dashed border-gray-300 dark:border-gray-700">
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Mail className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">No pending invitations</h3>
                            <p className="mt-1 text-sm">New hospital or clinic invitations will appear here.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {filteredInvites.map(invite => {
                            const isExpired = !!invite.expires_at && new Date(invite.expires_at).getTime() < Date.now();
                            return (
                                <Card key={invite.id} padding="md" className="border-blue-100 dark:border-blue-900/50 relative overflow-hidden">
                                    {/* Left Accent Bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                    <div className="pl-2 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                        {invite.facility_type}
                                                    </span>
                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                                                        Pending
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invite.facility?.name}</h3>
                                                <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {invite.facility?.city}{invite.facility?.state ? `, ${invite.facility.state}` : ''}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">
                                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Sent: {new Date(invite.created_at).toLocaleDateString()}</span>
                                            {invite.expires_at && (
                                                <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500 font-bold' : ''}`}>
                                                    <Clock className="h-3.5 w-3.5" /> Expires: {new Date(invite.expires_at).toLocaleDateString()} {isExpired && '(Expired)'}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-2">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleInviteResponse(invite.id, 'reject')}
                                                disabled={!!actionLoading || isExpired}
                                                leftIcon={actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                            >
                                                Reject
                                            </Button>
                                            <Button 
                                                onClick={() => handleInviteResponse(invite.id, 'accept')}
                                                disabled={!!actionLoading || isExpired}
                                                leftIcon={actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            >
                                                Accept Invite
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Active Partners */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    Active Partners
                    {filteredPartners.length > 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">{filteredPartners.length}</span>
                    )}
                </h2>

                {filteredPartners.length === 0 ? (
                    <Card padding="lg" className="border-dashed border-gray-300 dark:border-gray-700">
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">No active partners yet</h3>
                            <p className="mt-1 text-sm">Connect with hospitals or clinics to unlock supported pharmacy workflows.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {filteredPartners.map(partner => (
                            <Card 
                                key={partner.associationId} 
                                padding="md" 
                                className="hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors relative overflow-hidden" 
                                onClick={() => setSelectedPartner(partner)}
                            >
                                {/* Left Accent Bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                <div className="pl-2 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-1 rounded-full bg-gray-100 p-2.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                {partner.facilityType === 'hospital' ? <Building2 className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{partner.name}</h3>
                                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                        {partner.facilityType}
                                                    </span>
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {partner.city}{partner.state ? `, ${partner.state}` : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 mt-2" />
                                    </div>
                                    
                                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" /> Connected: {new Date(partner.associatedAt).toLocaleDateString()}
                                        </div>
                                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Details Drawer */}
            {selectedPartner && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setSelectedPartner(null)}>
                    <div 
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900 animate-in slide-in-from-right duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Partner Details</h2>
                            <button onClick={() => setSelectedPartner(null)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Organization Profile */}
                            <div className="flex items-start gap-4">
                                <div className="rounded-full bg-orange-100 p-4 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                    {selectedPartner.facilityType === 'hospital' ? <Building2 className="h-8 w-8" /> : <Activity className="h-8 w-8" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPartner.name}</h3>
                                    <div className="mt-2 flex gap-2">
                                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                            {selectedPartner.label || selectedPartner.facilityType}
                                        </span>
                                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1">
                                            Active Partner
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-800" />

                            {/* Partnership Info */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Partnership</div>
                                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Connected Since</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(selectedPartner.associatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <span className="text-green-600 font-medium">Active</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Contact</div>
                                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-900 dark:text-gray-100">{selectedPartner.email || 'No email provided'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-900 dark:text-gray-100">{selectedPartner.phone || 'No phone provided'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Location</div>
                                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700 space-y-2 text-sm">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <div className="text-gray-900 dark:text-gray-100">
                                            {selectedPartner.address ? <p>{selectedPartner.address}</p> : null}
                                            <p>{[selectedPartner.city, selectedPartner.state].filter(Boolean).join(', ')}</p>
                                            {selectedPartner.pincode ? <p>{selectedPartner.pincode}</p> : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions (if any future backend actions are supported, they go here) */}
                        <div className="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedPartner(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
