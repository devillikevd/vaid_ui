'use client';

import { useCallback, useDeferredValue, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Stethoscope, Loader2, RefreshCw, AlertCircle, Search, Mail, Phone,
    UserCheck, Star, CalendarDays, Ban, BadgeCheck, Clock, UserPlus,
    X, CheckCircle2, ChevronRight, Briefcase, Plus, Hospital, ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useClinicInviteUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchWithAuth } from '@/lib/api';
import { InviteDoctorModal } from '@/components/clinic/InviteDoctorModal';

const PAGE_SIZE = 12;

export default function ClinicDoctorsPage() {
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
        addDoctor,
        cancelInvite,
        removeDoctor,
        clearError,
    } = useClinicStore();

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

    const [showInviteModal, setShowInviteModal] = useState(false);

    const loadDoctors = useCallback(async () => {
        await fetchDoctors({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
        });
    }, [deferredSearchQuery, fetchDoctors, page]);

    const loadInvites = useCallback(async () => {
        await fetchInvites({ page: 1, limit: 50, status: 'pending' });
    }, [fetchInvites]);

    const loadRequests = useCallback(async () => {
        await fetchJoinRequests({ page: 1, limit: 50, status: 'pending' });
    }, [fetchJoinRequests]);

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

    useEffect(() => {
        if (page > doctorsPagination.totalPages && doctorsPagination.totalPages > 0) {
            setPage(doctorsPagination.totalPages);
        }
    }, [doctorsPagination.totalPages, page]);

    // Real-time updates
    useClinicInviteUpdates(useCallback(() => {
        void loadInvites();
        void loadDoctors();
        void loadRequests();
    }, [loadDoctors, loadInvites, loadRequests]));

    const handleRemove = async (doctorId: string, name: string) => {
        const confirmed = await confirm({
            title: 'Remove Doctor',
            message: `Are you sure you want to remove Dr. ${name} from your clinic? This will cancel their active affiliation.`,
            confirmLabel: 'Remove',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(doctorId);
            const success = await removeDoctor(doctorId);
            if (success) {
                toast.success('Doctor Removed', `Dr. ${name} has been removed from your clinic.`);
                void loadDoctors();
            } else {
                toast.error('Failed to remove doctor', useClinicStore.getState().error || undefined);
            }
            setActionLoading(null);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        const confirmed = await confirm({
            title: 'Withdraw Request',
            message: 'Are you sure you want to withdraw this invitation?',
            confirmLabel: 'Withdraw',
            variant: 'danger',
        });
        if (confirmed) {
            setActionLoading(inviteId);
            const success = await cancelInvite(inviteId);
            if (success) {
                toast.success('Request Withdrawn', 'The invitation was successfully cancelled.');
                void loadInvites();
            } else {
                toast.error('Unable to withdraw request', useClinicStore.getState().error || undefined);
            }
            setActionLoading(null);
        }
    };

    const handleRespondRequest = async (requestId: string, doctorName: string, decision: 'accept' | 'reject') => {
        setActionLoading(requestId);
        const success = await respondToJoinRequest(requestId, decision);
        if (success) {
            toast.success(decision === 'accept' ? 'Request Accepted' : 'Request Rejected', `Successfully ${decision}ed join request from Dr. ${doctorName}.`);
            if (decision === 'accept') {
                void loadDoctors();
            }
        } else {
            toast.error(`Unable to ${decision} request`, useClinicStore.getState().error || undefined);
        }
        setActionLoading(null);
    };

    return (
        <div className="space-y-6">
            <ConfirmDialog {...dialogProps} />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Doctors</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your clinic&apos;s doctors, affiliations, and invitations.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => void (tab === 'roster' ? loadDoctors() : tab === 'invites' ? loadInvites() : loadRequests())} 
                        disabled={loadingDoctors || loadingInvites || loadingJoinRequests} 
                        leftIcon={<RefreshCw className={`h-4 w-4 ${loadingDoctors || loadingInvites || loadingJoinRequests ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>
                    <Button onClick={() => setShowInviteModal(true)} leftIcon={<UserPlus className="h-4 w-4" />}>
                        Invite Doctor
                    </Button>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300/80">Active Doctors</p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{doctorsPagination.total}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-100 dark:border-amber-900/30">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                        <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300/80">Pending Invitations</p>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{invitesPagination.total}</p>
                    </div>
                </Card>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            ) : null}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setTab('roster')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'roster'
                        ? 'border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    Roster ({doctorsPagination.total})
                </button>
                <button
                    onClick={() => setTab('invites')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'invites'
                        ? 'border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    Invitations ({invitesPagination.total})
                </button>
                <button
                    onClick={() => setTab('requests')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'requests'
                        ? 'border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    Join Requests ({joinRequestsPagination.total})
                </button>
            </div>

            {tab === 'roster' ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="w-full sm:max-w-md relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search doctors by name, specialization, or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {loadingDoctors && !doctors.length ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                        </div>
                    ) : doctors.length === 0 ? (
                        <Card className="text-center py-16 px-4 bg-gray-50/50 dark:bg-gray-900/20 border-dashed">
                            <div className="h-16 w-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Stethoscope className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No doctors found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'Invite a doctor to start building your clinic care team.'}
                            </p>
                            {!searchQuery && (
                                <Button onClick={() => setShowInviteModal(true)} className="mt-6" leftIcon={<UserPlus className="h-4 w-4" />}>
                                    Invite Doctor
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {doctors.map((member) => (
                                <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3">
                                                {member.profile_image_url ? (
                                                    <img src={member.profile_image_url} alt={member.name} className="h-12 w-12 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shrink-0">
                                                        <span className="text-lg font-bold text-white">{member.name.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Dr. {member.name}</h4>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{member.specialization || 'General Practice'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => void handleRemove(member.id, member.name)}
                                                disabled={actionLoading === member.id}
                                                className="p-2 text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-colors shrink-0"
                                                title="Remove Doctor"
                                            >
                                                {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge status={member.verification === 'verified' ? 'approved' : 'pending'} size="sm" />
                                                <StatusBadge status={member.is_available ? 'active' : 'inactive'} size="sm" />
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-gray-400" />
                                                Video + In-Person
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{member.todayAppointments ?? 0}</span> appointments today
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3 text-gray-500">
                                            {member.rating != null && member.rating > 0 && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                    {member.rating.toFixed(1)}
                                                </span>
                                            )}
                                            {member.experience_years ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />{member.experience_years} yrs
                                                </span>
                                            ) : null}
                                        </div>
                                        <Link href={`/doctors/${member.doctorId || member.id}`}>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300">
                                                View Profile
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                    {doctorsPagination.totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={doctorsPagination.totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            ) : tab === 'invites' ? (
                <div className="space-y-4">
                    {loadingInvites && !invites.length ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                        </div>
                    ) : invites.length === 0 ? (
                        <Card className="text-center py-16 px-4 bg-gray-50/50 dark:bg-gray-900/20 border-dashed">
                            <div className="h-16 w-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No pending invitations</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                Sent invitations to doctors will appear here while they are pending review.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {invites.map((invite) => {
                                const isChangesRequested = invite.status === 'changes_requested';
                                return (
                                    <Card 
                                        key={invite.id} 
                                        className={`p-5 flex flex-col hover:shadow-md transition-shadow border ${
                                            isChangesRequested 
                                                ? 'border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 ring-1 ring-purple-500/20' 
                                                : 'border-amber-100 dark:border-amber-900/20'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                {invite.doctor.profile_image_url ? (
                                                    <img src={invite.doctor.profile_image_url} alt={invite.doctor.name} className="h-11 w-11 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                                                ) : (
                                                    <div className="h-11 w-11 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                                                        <span>{invite.doctor.name.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Dr. {invite.doctor.name}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-36 sm:w-48">{invite.doctor.email}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                isChangesRequested 
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                            }`}>
                                                {isChangesRequested ? 'Changes Proposed' : 'Pending Review'}
                                            </span>
                                        </div>

                                        {/* Doctor Counter-Proposal Note */}
                                        {isChangesRequested && invite.counter_proposal && (
                                            <div className="mb-3 p-3 rounded-xl bg-purple-100/60 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-950 dark:text-purple-200">
                                                <span className="font-bold block mb-0.5">Doctor's Proposed Changes:</span>
                                                <p className="italic leading-relaxed">{invite.counter_proposal}</p>
                                            </div>
                                        )}

                                        {/* Proposed Terms Pills */}
                                        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
                                            {invite.practice_type && (
                                                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize font-medium">
                                                    {invite.practice_type.replace('_', ' ')}
                                                </span>
                                            )}
                                            {invite.fee_amount ? (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold">
                                                    ₹{invite.fee_amount}
                                                </span>
                                            ) : null}
                                            {invite.start_date && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium">
                                                    Starts {new Date(invite.start_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                            <span>Sent {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'Recently'}</span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                                                onClick={() => void handleCancelInvite(invite.id)}
                                                disabled={actionLoading === invite.id}
                                                leftIcon={actionLoading === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                            >
                                                Withdraw
                                            </Button>

                                            {isChangesRequested && (
                                                <Button
                                                    size="sm"
                                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                                                    onClick={() => setShowInviteModal(true)}
                                                >
                                                    Propose New Terms
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : tab === 'requests' ? (
                <div className="space-y-4">
                    {loadingJoinRequests && !joinRequests.length ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-pink-500 animate-spin" />
                        </div>
                    ) : joinRequests.length === 0 ? (
                        <Card className="text-center py-16 px-4 bg-gray-50/50 dark:bg-gray-900/20 border-dashed">
                            <div className="h-16 w-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <UserPlus className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No join requests</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                Doctors who want to partner and join your clinic will appear here.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {joinRequests.map((request: any) => (
                                <Card key={request.id} className="p-5 flex flex-col hover:shadow-md transition-shadow border border-blue-100 dark:border-blue-900/20">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            {request.doctor.profile_image_url ? (
                                                <img src={request.doctor.profile_image_url} alt={request.doctor.name} className="h-11 w-11 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                                            ) : (
                                                <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-sm text-blue-600 dark:text-blue-400 shrink-0">
                                                    <span>{request.doctor.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Dr. {request.doctor.name}</h4>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate w-36 sm:w-48">{request.doctor.specialization || request.specialization || 'Consultant Doctor'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Request Terms Breakdown */}
                                    <div className="space-y-2 mb-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
                                        {request.practice_type && (
                                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                <span>Practice Type:</span>
                                                <span className="font-bold text-gray-900 dark:text-white capitalize">{request.practice_type.replace('_', ' ')}</span>
                                            </div>
                                        )}
                                        {request.preferred_days?.length ? (
                                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                <span>Preferred Days:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{request.preferred_days.join(', ')}</span>
                                            </div>
                                        ) : null}
                                        {request.preferred_start_time && request.preferred_end_time && (
                                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                <span>Hours:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{request.preferred_start_time} - {request.preferred_end_time}</span>
                                            </div>
                                        )}
                                        {request.start_date && (
                                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                                                <span>Start Date:</span>
                                                <span className="font-bold text-gray-900 dark:text-white">{new Date(request.start_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {request.message && (
                                        <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/80 p-3 rounded-xl border border-gray-100 dark:border-gray-800 italic leading-relaxed">
                                            "{request.message}"
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Requested {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Recently'}</span>
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold text-xs rounded-xl"
                                            onClick={() => void handleRespondRequest(request.id, request.doctor.name, 'reject')}
                                            disabled={actionLoading === request.id}
                                        >
                                            Decline
                                        </Button>
                                        <Button 
                                            size="sm"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                                            onClick={() => void handleRespondRequest(request.id, request.doctor.name, 'accept')}
                                            disabled={actionLoading === request.id}
                                        >
                                            Accept & Affiliate
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Invite Doctor Modal */}
            <InviteDoctorModal 
                isOpen={showInviteModal} 
                onClose={() => {
                    setShowInviteModal(false);
                    void loadInvites(); // Reload invites in case a new one was added
                }} 
            />
        </div>
    );
}
