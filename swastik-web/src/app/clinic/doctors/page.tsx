'use client';

import { useCallback, useDeferredValue, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
        loadingDoctors,
        loadingInvites,
        error,
        fetchDoctors,
        fetchInvites,
        addDoctor,
        cancelInvite,
        removeDoctor,
        clearError,
    } = useClinicStore();

    const [tab, setTab] = useState<'roster' | 'invites'>(() => (searchParams.get('tab') === 'invites' ? 'invites' : 'roster'));
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

    useEffect(() => {
        if (tab === 'roster') void loadDoctors();
    }, [loadDoctors, tab]);

    useEffect(() => {
        if (tab === 'invites') void loadInvites();
    }, [tab, loadInvites]);

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
    }, [loadDoctors, loadInvites]));

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
                        onClick={() => void (tab === 'roster' ? loadDoctors() : loadInvites())} 
                        disabled={loadingDoctors || loadingInvites} 
                        leftIcon={<RefreshCw className={`h-4 w-4 ${loadingDoctors || loadingInvites ? 'animate-spin' : ''}`} />}
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
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                                                title="Remove Doctor"
                                            >
                                                {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
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
                                        <Button variant="ghost" size="sm" className="h-8 px-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300">
                                            View Profile
                                        </Button>
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
            ) : (
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
                            {invites.map((invite) => (
                                <Card key={invite.id} className="p-5 flex flex-col hover:shadow-md transition-shadow border border-amber-100 dark:border-amber-900/20">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            {invite.doctor.profile_image_url ? (
                                                <img src={invite.doctor.profile_image_url} alt={invite.doctor.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 opacity-80 grayscale" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{invite.doctor.name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Dr. {invite.doctor.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-32 sm:w-48">{invite.doctor.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 justify-center mb-4 text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-amber-500" />
                                            <span>Sent {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                            <span>Waiting for doctor's approval</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto">
                                        <StatusBadge status="pending" size="sm" />
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => void handleCancelInvite(invite.id)}
                                            disabled={actionLoading === invite.id}
                                            leftIcon={actionLoading === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
