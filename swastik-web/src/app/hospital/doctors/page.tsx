/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useCallback, useDeferredValue, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Stethoscope, Loader2, RefreshCw, AlertCircle, Search, Mail, Phone,
    UserCheck, Star, CalendarDays, Ban, BadgeCheck, Clock, UserPlus,
    X, CheckCircle2, ChevronRight, Briefcase, Plus, Hospital, ShieldCheck,
    Building2, Video, FileText, Send, AlertTriangle, ArrowRight, Check, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHospitalStore, HospitalDoctor } from '@/stores/hospitalStore';

import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { InviteDoctorModal } from '@/components/hospital/InviteDoctorModal';
import { DoctorDetailModal } from '@/components/hospital/DoctorDetailModal';

const PAGE_SIZE = 12;

export default function HospitalDoctorsPage() {
    const searchParams = useSearchParams();
    const {
        doctors,
        doctorsPagination,
        invites,
        invitesPagination,
        joinRequests,
        joinRequestsPagination,
        loadingDoctors,
        loadingInvites,
        loadingJoinRequests,
        error,
        fetchDoctors,
        fetchInvites,
        fetchJoinRequests,
        respondToJoinRequest,
        cancelInvite,
        removeDoctor,
        clearError,
    } = useHospitalStore();

    const [tab, setTab] = useState<'roster' | 'invites' | 'requests'>(() => {
        const t = searchParams.get('tab');
        if (t === 'invites' || t === 'requests') return t as any;
        return 'roster';
    });

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    // Modals
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedDoctorForModal, setSelectedDoctorForModal] = useState<HospitalDoctor | null>(null);

    const loadDoctors = useCallback(async () => {
        await fetchDoctors(page, deferredSearchQuery || undefined, PAGE_SIZE);
    }, [deferredSearchQuery, fetchDoctors, page]);

    const loadInvites = useCallback(async () => {
        await fetchInvites({ page: 1, limit: 50, status: 'pending' });
    }, [fetchInvites]);

    const loadRequests = useCallback(async () => {
        await fetchJoinRequests({ page: 1, limit: 50, status: 'pending' });
    }, [fetchJoinRequests]);

    const refreshAll = useCallback(async () => {
        if (tab === 'roster') await loadDoctors();
        else if (tab === 'invites') await loadInvites();
        else if (tab === 'requests') await loadRequests();
    }, [loadDoctors, loadInvites, loadRequests, tab]);

    // Initial and tab-dependent loads
    useEffect(() => {
        if (tab === 'roster') void loadDoctors();
    }, [loadDoctors, tab]);

    useEffect(() => {
        if (tab === 'invites') void loadInvites();
    }, [tab, loadInvites]);

    useEffect(() => {
        if (tab === 'requests') void loadRequests();
    }, [tab, loadRequests]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery]);

    // Total today appointments across all active doctors
    const totalTodayAppointments = useMemo(() => {
        return doctors.reduce((acc, d) => acc + (d.appointmentsToday || d.todayAppointments || 0), 0);
    }, [doctors]);

    const handleRemoveDoctor = async (doc: HospitalDoctor) => {
        const confirmed = await confirm({
            title: 'End Doctor Affiliation',
            message: `Are you sure you want to end affiliation with Dr. ${doc.name}? They will no longer be listed under your hospital's public roster or receive hospital bookings.`,
            confirmLabel: 'End Affiliation',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(doc.id);
            const success = await removeDoctor((doc as any).doctorId || doc.id);
            if (success) {
                toast.success('Affiliation Ended', `Dr. ${doc.name} has been removed from your active roster.`);
                if (selectedDoctorForModal?.id === doc.id) {
                    setSelectedDoctorForModal(null);
                }
                void loadDoctors();
            } else {
                toast.error('Failed to end affiliation', useHospitalStore.getState().error || 'Please try again.');
            }
            setActionLoading(null);
        }
    };

    const handleCancelInvite = async (inviteId: string, doctorName: string) => {
        const confirmed = await confirm({
            title: 'Withdraw Invitation',
            message: `Are you sure you want to withdraw the invitation sent to ${doctorName}?`,
            confirmLabel: 'Withdraw Invite',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(inviteId);
            const success = await cancelInvite(inviteId);
            if (success) {
                toast.success('Invitation Withdrawn', 'The invitation was cancelled successfully.');
                void loadInvites();
            } else {
                toast.error('Unable to withdraw invite', useHospitalStore.getState().error || 'Please try again.');
            }
            setActionLoading(null);
        }
    };

    const handleRespondRequest = async (requestId: string, doctorName: string, decision: 'accept' | 'reject') => {
        setActionLoading(requestId);
        const success = await respondToJoinRequest(requestId, decision);
        if (success) {
            toast.success(
                decision === 'accept' ? 'Join Request Accepted' : 'Join Request Declined',
                `Successfully ${decision === 'accept' ? 'accepted' : 'declined'} request from Dr. ${doctorName}.`
            );
            void loadRequests();
            if (decision === 'accept') {
                void loadDoctors();
            }
        } else {
            toast.error(`Unable to ${decision} request`, useHospitalStore.getState().error || 'Please try again.');
        }
        setActionLoading(null);
    };

    const isLoading = (tab === 'roster' && loadingDoctors && doctors.length === 0) ||
                      (tab === 'invites' && loadingInvites && invites.length === 0) ||
                      (tab === 'requests' && loadingJoinRequests && joinRequests.length === 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Doctors
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Manage your hospital&apos;s doctors, affiliations, and invitations.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    <button
                        onClick={refreshAll}
                        disabled={loadingDoctors || loadingInvites || loadingJoinRequests}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingDoctors || loadingInvites || loadingJoinRequests ? 'animate-spin' : ''}`} />
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

            {/* Error Notification */}
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

            {/* Real Doctor Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Active Doctors</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{doctorsPagination.total || doctors.length}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Pending Invites</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{invitesPagination.total || invites.length}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/60 rounded-2xl text-purple-600 dark:text-purple-400 shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Join Requests</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{joinRequestsPagination.total || joinRequests.length}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#111c2e] p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Today&apos;s Appointments</p>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{totalTodayAppointments}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs & Search Controls */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <button
                            onClick={() => { setTab('roster'); setPage(1); }}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'roster'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Active Roster</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tab === 'roster' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                                {doctorsPagination.total || doctors.length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setTab('invites'); setPage(1); }}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'invites'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Pending Invites</span>
                            {invites.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    tab === 'invites' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}>
                                    {invites.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => { setTab('requests'); setPage(1); }}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
                                tab === 'requests'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Join Requests</span>
                            {joinRequests.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    tab === 'requests' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                }`}>
                                    {joinRequests.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Local Roster Search */}
                    {tab === 'roster' && (
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, specialty, or email..."
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
                    )}
                </div>
            </div>

            {/* TAB CONTENT: ACTIVE ROSTER */}
            {tab === 'roster' && (
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading affiliated doctors...</p>
                        </div>
                    ) : doctors.length === 0 ? (
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                                <Stethoscope className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                                {searchQuery ? 'No doctors found' : 'No doctors affiliated yet'}
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                {searchQuery 
                                    ? `No doctors matched "${searchQuery}". Try searching another name or specialty.`
                                    : 'Invite verified doctors to your hospital to start offering consultations and building your hospitalal network.'}
                            </p>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="mt-5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Invite Doctor</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Responsive 3-Col Desktop, 2-Col Tablet, 1-Col Mobile Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {doctors.map((doc) => {
                                    const ratingVal = typeof doc.rating === 'number' ? doc.rating : parseFloat(String(doc.rating || '0'));
                                    const isBusy = actionLoading === doc.id;
                                    const practiceTypeLabel = (doc as any).practice_type === 'visiting' 
                                        ? 'Visiting' 
                                        : (doc as any).practice_type === 'part_time' 
                                        ? 'Part-Time' 
                                        : (doc as any).practice_type === 'contract' 
                                        ? 'Contract' 
                                        : 'Full-Time';

                                    const modes = Array.isArray((doc as any).consultation_modes) && (doc as any).consultation_modes.length > 0 
                                        ? (doc as any).consultation_modes 
                                        : ['in_hospital', 'video'];

                                    return (
                                        <div
                                            key={doc.id}
                                            className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700/80 p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
                                        >
                                            {/* Top Card Section: Avatar + Identity */}
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3.5">
                                                    {(doc as any).profile_image_url ? (
                                                        <img
                                                            src={(doc as any).profile_image_url}
                                                            alt={doc.name}
                                                            className="w-14 h-14 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                                                            {doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Active
                                                            </span>

                                                            {(doc as any).is_approved && (
                                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                                                                    <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Verified
                                                                </span>
                                                            )}

                                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 ml-auto">
                                                                {practiceTypeLabel}
                                                            </span>
                                                        </div>

                                                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-snug mt-1.5 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                            {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                                        </h3>

                                                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                                                            {doc.specialization}
                                                            {Boolean((doc as any).experience_years && (doc as any).experience_years > 0) && ` • ${(doc as any).experience_years} yrs exp`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Practice & Details Row */}
                                                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800/80 space-y-2 text-xs">
                                                    
                                                    {/* Consultation Modes & Dept */}
                                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                        <span className="font-semibold text-gray-500">Modes:</span>
                                                        <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                                                            {modes.includes('in_hospital') && (
                                                                <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                                                                    <Building2 className="w-3 h-3" /> OPD
                                                                </span>
                                                            )}
                                                            {modes.includes('video') && (
                                                                <span className="flex items-center gap-0.5 text-blue-700 dark:text-blue-400">
                                                                    <Video className="w-3 h-3" /> Video
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Today's Appointments & Upcoming */}
                                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
                                                        <span className="font-semibold text-gray-500">Today&apos;s Appointments:</span>
                                                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                                            {(doc as any).todayAppointments || 0} today
                                                        </span>
                                                    </div>

                                                    {/* Rating & Performance */}
                                                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800">
                                                        <span className="font-semibold text-gray-500">Rating:</span>
                                                        <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100">
                                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                            <span>{ratingVal > 0 ? ratingVal.toFixed(1) : 'New'}</span>
                                                            {(doc as any).total_reviews ? <span className="text-[10px] text-gray-500 font-normal">({(doc as any).total_reviews})</span> : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDoctorForModal(doc)}
                                                    className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                                                >
                                                    View Details
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleRemoveDoctor(doc)}
                                                    className="w-full py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 font-extrabold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'End Affiliation'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {doctorsPagination.totalPages > 1 && (
                                <div className="pt-4">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={doctorsPagination.totalPages}
                                        onPageChange={setPage}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAB CONTENT: PENDING INVITATIONS */}
            {tab === 'invites' && (
                <div className="space-y-4">
                    {loadingInvites && invites.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading pending invitations...</p>
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 rounded-3xl flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                                No pending invitations
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                All sent doctor invitations have been accepted or processed. You can send a new invitation anytime.
                            </p>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="mt-5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Invite Doctor</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {invites.map((inv) => {
                                const doc = inv.doctor || {};
                                const isBusy = actionLoading === inv.id;
                                return (
                                    <div
                                        key={inv.id}
                                        className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-base flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
                                                    {doc.name ? doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                                                            {doc.name || 'Doctor'}
                                                        </h3>
                                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            Invitation Sent
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                                        {doc.specialization || 'General'}
                                                    </p>
                                                    {doc.email && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {doc.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Proposed Practice:</span>
                                                <span className="font-bold text-gray-900 dark:text-gray-100">{inv.practice_type || 'Full-Time'}</span>
                                            </div>
                                            {inv.fee_amount && (
                                                <div className="flex justify-between">
                                                    <span>Proposed Fee:</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">₹{inv.fee_amount}</span>
                                                </div>
                                            )}
                                            {inv.expiresAt && (
                                                <div className="flex justify-between text-[11px] text-gray-500">
                                                    <span>Expires:</span>
                                                    <span>{new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleCancelInvite(inv.id, doc.name || 'Doctor')}
                                                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                                <span>Withdraw Invitation</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: JOIN REQUESTS */}
            {tab === 'requests' && (
                <div className="space-y-4">
                    {loadingJoinRequests && joinRequests.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading join requests...</p>
                        </div>
                    ) : joinRequests.length === 0 ? (
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/60 rounded-3xl flex items-center justify-center mx-auto mb-4 text-purple-600 dark:text-purple-400">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                                No pending join requests
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                When doctors discover your hospital on the Vaididea network and request to join, their proposals will appear here for review.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {joinRequests.map((req) => {
                                const doc = req.doctor || {};
                                const isBusy = actionLoading === req.id;
                                return (
                                    <div
                                        key={req.id}
                                        className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-extrabold text-base flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
                                                    {doc.name ? doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                                                            {doc.name || 'Doctor'}
                                                        </h3>
                                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                            Join Request
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                                        {doc.specialization || 'Doctor'}
                                                    </p>
                                                    {doc.email && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {doc.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {req.message && (
                                            <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs text-gray-700 dark:text-gray-300">
                                                <span className="font-bold text-purple-900 dark:text-purple-300 block mb-0.5">Doctor Message:</span>
                                                <p className="italic">{req.message}</p>
                                            </div>
                                        )}

                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                                            {req.practice_type && (
                                                <div className="flex justify-between">
                                                    <span>Practice Type:</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{req.practice_type}</span>
                                                </div>
                                            )}
                                            {req.preferred_days && req.preferred_days.length > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Preferred Days:</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{req.preferred_days.join(', ')}</span>
                                                </div>
                                            )}
                                            {req.preferred_start_time && (
                                                <div className="flex justify-between">
                                                    <span>Preferred Hours:</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{req.preferred_start_time} - {req.preferred_end_time}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleRespondRequest(req.id, doc.name || 'Doctor', 'reject')}
                                                className="w-full py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                                Decline
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleRespondRequest(req.id, doc.name || 'Doctor', 'accept')}
                                                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                <span>Accept Request</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Invite Doctor Modal */}
            <InviteDoctorModal
                isOpen={showInviteModal}
                onClose={() => {
                    setShowInviteModal(false);
                    void loadInvites();
                    void loadDoctors();
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
