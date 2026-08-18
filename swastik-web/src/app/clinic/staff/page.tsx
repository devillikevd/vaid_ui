/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useCallback, useDeferredValue, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
    Users, Stethoscope, ShieldCheck, Mail, Phone, Clock, UserPlus,
    RefreshCw, Search, X, CheckCircle2, Shield, Settings,
    Building2, FileText, Ban, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { useClinicStore, ClinicDoctor } from '@/stores/clinicStore';
import { useAuthStore } from '@/stores/authStore';
import { useClinicInviteUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { InviteDoctorModal } from '@/components/clinic/InviteDoctorModal';
import { DoctorDetailModal } from '@/components/clinic/DoctorDetailModal';

export default function ClinicStaffPage() {
    const { user } = useAuthStore();
    const {
        doctors,
        invites,
        loadingDoctors,
        loadingInvites,
        error,
        fetchDoctors,
        fetchInvites,
        cancelInvite,
        removeDoctor,
        clearError,
    } = useClinicStore();

    const [tab, setTab] = useState<'all' | 'admins' | 'doctors' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedDoctorForModal, setSelectedDoctorForModal] = useState<ClinicDoctor | null>(null);

    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadData = useCallback(async () => {
        await Promise.all([
            fetchDoctors({ page: 1, limit: 100 }),
            fetchInvites({ page: 1, limit: 100, status: 'pending' })
        ]);
    }, [fetchDoctors, fetchInvites]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useClinicInviteUpdates(useCallback(() => {
        void loadData();
    }, [loadData]));

    // Total counts
    const totalAdmins = 1; // Primary Clinic Owner/Admin
    const activeDoctorCount = doctors.length;
    const pendingInviteCount = invites.length;
    const totalTeamMembers = totalAdmins + activeDoctorCount + pendingInviteCount;

    // Filter by search query
    const q = deferredSearchQuery.toLowerCase();

    const ownerMatches = !q || Boolean(
        user?.name?.toLowerCase().includes(q) ||
        user?.email?.toLowerCase().includes(q) ||
        user?.phone?.toLowerCase().includes(q) ||
        'clinic owner'.includes(q) ||
        'administrator'.includes(q)
    );

    const filteredDoctors = useMemo(() => {
        if (!q) return doctors;
        return doctors.filter(d => 
            (d.name && d.name.toLowerCase().includes(q)) || 
            (d.email && d.email.toLowerCase().includes(q)) || 
            (d.phone && d.phone.toLowerCase().includes(q)) || 
            (d.specialization && d.specialization.toLowerCase().includes(q)) ||
            'doctor'.includes(q)
        );
    }, [doctors, q]);

    const filteredInvites = useMemo(() => {
        if (!q) return invites;
        return invites.filter(i => {
            const doc = i.doctor || {};
            return (doc.name && doc.name.toLowerCase().includes(q)) || 
                   (doc.email && doc.email.toLowerCase().includes(q)) || 
                   (doc.specialization && doc.specialization.toLowerCase().includes(q)) ||
                   'pending invite'.includes(q);
        });
    }, [invites, q]);

    const handleCancelInvite = async (inviteId: string, name: string) => {
        const confirmed = await confirm({
            title: 'Withdraw Invitation',
            message: `Withdraw the invitation for ${name}?`,
            confirmLabel: 'Withdraw',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(inviteId);
            const success = await cancelInvite(inviteId);
            if (success) {
                toast.success('Invitation Cancelled', `Invitation for ${name} has been withdrawn.`);
                void loadData();
            } else {
                toast.error('Unable to withdraw invite', useClinicStore.getState().error || 'Please try again.');
            }
            setActionLoading(null);
        }
    };

    const handleRemoveDoctor = async (doc: ClinicDoctor) => {
        const confirmed = await confirm({
            title: 'Remove Team Member',
            message: `Remove Dr. ${doc.name} from your clinic team? This will end their active clinic affiliation.`,
            confirmLabel: 'Remove Member',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(doc.id);
            const success = await removeDoctor(doc.doctorId || doc.id);
            if (success) {
                toast.success('Member Removed', `Dr. ${doc.name} removed from clinic team.`);
                if (selectedDoctorForModal?.id === doc.id) {
                    setSelectedDoctorForModal(null);
                }
                void loadData();
            } else {
                toast.error('Failed to remove member', useClinicStore.getState().error || 'Please try again.');
            }
            setActionLoading(null);
        }
    };

    const isLoading = loadingDoctors && loadingInvites && doctors.length === 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Clinic Team & Access
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Manage the people who can access and operate this clinic.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    <button
                        onClick={() => void loadData()}
                        disabled={loadingDoctors || loadingInvites}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingDoctors || loadingInvites ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Doctor</span>
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                    <button onClick={clearError} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Real Team Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Users className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Total Team Members</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{totalTeamMembers}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Clinic Admins</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{totalAdmins}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Active Doctors</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{activeDoctorCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Pending Access</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{pendingInviteCount}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Container */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Role Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <button
                            onClick={() => setTab('all')}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'all'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span>All Members</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                                {totalTeamMembers}
                            </span>
                        </button>

                        <button
                            onClick={() => setTab('admins')}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'admins'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span>Admins</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tab === 'admins' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                                {totalAdmins}
                            </span>
                        </button>

                        <button
                            onClick={() => setTab('doctors')}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'doctors'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span>Doctors</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tab === 'doctors' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                                {activeDoctorCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setTab('pending')}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'pending'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span>Pending</span>
                            {pendingInviteCount > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    tab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}>
                                    {pendingInviteCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Local Team Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search team by name, role, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 text-xs font-medium rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Content Groups */}
            {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading team members...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* 1. CLINIC ADMINISTRATION SECTION */}
                    {(tab === 'all' || tab === 'admins') && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Clinic Administration ({ownerMatches ? 1 : 0})
                                </h2>
                            </div>

                            {ownerMatches ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-blue-200 dark:border-blue-900/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all">
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold text-lg flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-sm shrink-0">
                                                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OW'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                                                            <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Owner & Admin
                                                        </span>
                                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                            Active
                                                        </span>
                                                    </div>

                                                    <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-snug mt-1.5 truncate">
                                                        {user?.name || 'Clinic Owner'}
                                                    </h3>

                                                    {user?.email && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {user.email}
                                                        </p>
                                                    )}
                                                    {user?.phone && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {user.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Access Scope */}
                                            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1.5">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
                                                    Access Scope:
                                                </span>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                                    Full Clinic Access: Clinic Profile, Doctors, Appointments, Patients, Diagnostic & Pharmacy Network, Settings.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 flex items-center justify-end">
                                            <Link
                                                href="/clinic/profile"
                                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 font-extrabold text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                                <span>Manage Profile</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No administration members match your search.</p>
                            )}
                        </div>
                    )}

                    {/* 2. MEDICAL TEAM SECTION */}
                    {(tab === 'all' || tab === 'doctors') && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Medical Team ({filteredDoctors.length})
                                </h2>
                            </div>

                            {filteredDoctors.length === 0 ? (
                                <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {searchQuery ? 'No doctors match your search.' : 'No doctors affiliated with this clinic yet.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredDoctors.map((doc) => {
                                        const isBusy = actionLoading === doc.id;
                                        return (
                                            <div
                                                key={doc.id}
                                                className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3.5">
                                                        {doc.profile_image_url ? (
                                                            <img
                                                                src={doc.profile_image_url}
                                                                alt={doc.name}
                                                                className="w-14 h-14 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                                                                {doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Active Doctor
                                                                </span>

                                                                {doc.is_approved && (
                                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                                                                        <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Verified
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-snug mt-1.5 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                                {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                                            </h3>

                                                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                                                                {doc.specialization}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                                                        <div className="flex justify-between">
                                                            <span>Today&apos;s Appointments:</span>
                                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{doc.todayAppointments || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Joined:</span>
                                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                                                {doc.joined_at ? new Date(doc.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedDoctorForModal(doc)}
                                                        className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                                                    >
                                                        View Doctor Profile
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. PENDING ACCESS SECTION */}
                    {(tab === 'all' || tab === 'pending') && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Pending Access & Invitations ({filteredInvites.length})
                                </h2>
                            </div>

                            {filteredInvites.length === 0 ? (
                                <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 text-center">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {searchQuery ? 'No pending invitations match your search.' : 'No pending invitations.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredInvites.map((inv) => {
                                        const doc = inv.doctor || {};
                                        const isBusy = actionLoading === inv.id;
                                        return (
                                            <div
                                                key={inv.id}
                                                className="bg-white dark:bg-[#111c2e] rounded-3xl border border-amber-200 dark:border-amber-900/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-base flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                                                            {doc.name ? doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                                    Pending Invite
                                                                </span>
                                                            </div>

                                                            <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-snug mt-1.5 truncate">
                                                                {doc.name || 'Invited Doctor'}
                                                            </h3>

                                                            {doc.email && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" /> {doc.email}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                                        <div className="flex justify-between">
                                                            <span>Specialization:</span>
                                                            <span className="font-bold text-gray-900 dark:text-gray-100">{doc.specialization || 'General'}</span>
                                                        </div>
                                                        {inv.expiresAt && (
                                                            <div className="flex justify-between text-[11px] text-gray-500">
                                                                <span>Expires:</span>
                                                                <span>{new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handleCancelInvite(inv.id, doc.name || 'Doctor')}
                                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                                        <span>Withdraw</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Invite Doctor Modal */}
            <InviteDoctorModal
                isOpen={showInviteModal}
                onClose={() => {
                    setShowInviteModal(false);
                    void loadData();
                }}
            />

            {/* Doctor Detail Modal */}
            <DoctorDetailModal
                isOpen={!!selectedDoctorForModal}
                onClose={() => setSelectedDoctorForModal(null)}
                doctor={selectedDoctorForModal}
                onEndAffiliation={(doc) => handleRemoveDoctor(doc)}
            />

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
