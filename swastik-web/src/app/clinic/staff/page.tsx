'use client';

import { useCallback, useDeferredValue, useEffect, useState, useMemo } from 'react';
import {
    Stethoscope, Loader2, AlertCircle, RefreshCw, Search, Mail, Phone,
    UserCheck, Star, CalendarDays, Ban, BadgeCheck, Clock, UserPlus,
    Building2, Info, ShieldAlert, ArrowRight, Shield
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useAuthStore } from '@/stores/authStore';
import { useClinicInviteUpdates } from '@/hooks/useSocket';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getInitials } from '@/lib/utils';
import { InviteDoctorModal } from '@/components/clinic/InviteDoctorModal';

const PAGE_SIZE = 9;

export default function ClinicCareTeamPage() {
    const { user } = useAuthStore();
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
        clearError,
    } = useClinicStore();

    const [tab, setTab] = useState<'all' | 'doctors' | 'invites'>('all');
    const [showAdd, setShowAdd] = useState(false);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    // Filter status for invites tab
    const [inviteStatus, setInviteStatus] = useState('pending');

    const loadDoctors = useCallback(async () => {
        await fetchDoctors({
            page: tab === 'invites' ? 1 : page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
        });
    }, [deferredSearchQuery, fetchDoctors, page, tab]);

    const loadInvites = useCallback(async () => {
        await fetchInvites({ 
            page: tab === 'doctors' ? 1 : (tab === 'invites' ? page : 1), 
            limit: tab === 'all' ? 5 : PAGE_SIZE, 
            status: tab === 'all' ? 'pending' : inviteStatus 
        });
    }, [fetchInvites, inviteStatus, page, tab]);

    useEffect(() => {
        if (tab === 'all' || tab === 'doctors') void loadDoctors();
        if (tab === 'all' || tab === 'invites') void loadInvites();
    }, [loadDoctors, loadInvites, tab]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, tab]);

    useClinicInviteUpdates(useCallback(() => {
        void loadInvites();
        void loadDoctors();
    }, [loadDoctors, loadInvites]));



    const handleCancelInvite = async (inviteId: string, doctorName: string) => {
        const confirmed = await confirm({
            title: 'Withdraw Invite',
            message: `Withdraw the invitation sent to ${doctorName}?`,
            confirmLabel: 'Withdraw Invite',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(inviteId);
        const success = await cancelInvite(inviteId);
        if (success) toast.success('Invite Withdrawn', `Invite to ${doctorName} cancelled.`);
        else toast.error('Unable to withdraw invite', useClinicStore.getState().error || 'Please try again.');
        setActionLoading(null);
    };

    const totalMembers = 1 + doctorsPagination.total + invitesPagination.total;
    
    // Check loading states globally
    const isLoading = (loadingDoctors && doctors.length === 0) || (loadingInvites && invites.length === 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Care Team</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage the doctors and members connected to your clinic.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { tab === 'all' ? (loadDoctors(), loadInvites()) : tab === 'doctors' ? loadDoctors() : loadInvites(); }} disabled={loadingDoctors || loadingInvites} leftIcon={<RefreshCw className={`h-4 w-4 ${loadingDoctors || loadingInvites ? 'animate-spin' : ''}`} />}>Refresh</Button>
                    <Button onClick={() => setShowAdd(true)} leftIcon={<UserPlus className="h-4 w-4" />}>Invite Doctor</Button>
                </div>
            </div>

            {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    {error}
                </div>
            ) : null}

            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md" className="flex items-center gap-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-[#0B1020] border-indigo-100 dark:border-indigo-800/30">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Team Members</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMembers}</p>
                    </div>
                </Card>
                <Card padding="md" className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clinic Owner</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
                    </div>
                </Card>
                <Card padding="md" className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Doctors</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{doctorsPagination.total}</p>
                    </div>
                </Card>
                <Card padding="md" className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Invitations</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{tab === 'invites' && inviteStatus !== 'pending' ? (invites.filter(i => i.status === 'pending').length || 0) : invitesPagination.total}</p>
                    </div>
                </Card>
            </div>

            {/* Informational Message */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/10 p-3.5 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p>
                        Additional staff roles (Receptionist, Nurse, Accountant) will be available when clinic staff access control is fully enabled. Currently, manage your affiliated doctors and pending invitations here.
                    </p>
                </div>
            </div>

            {/* Tabs & Search */}
            <Card padding="none" className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-gray-800 p-2 gap-3">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2">
                        {[
                            { id: 'all', label: 'All Members', count: totalMembers },
                            { id: 'doctors', label: 'Doctors', count: doctorsPagination.total },
                            { id: 'invites', label: 'Pending Invitations', count: invitesPagination.total }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => { setTab(t.id as any); if (t.id === 'invites') setInviteStatus('pending'); }}
                                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                                    tab === t.id
                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t.label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${tab === t.id ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-200 dark:bg-gray-700'}`}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                    {(tab === 'all' || tab === 'doctors') && (
                        <div className="w-full sm:w-72 px-2 pb-2 sm:pb-0">
                            <Input
                                placeholder="Search care team..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<Search className="h-4 w-4" />}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}
                </div>
                
                {tab === 'invites' && (
                    <div className="bg-gray-50 dark:bg-[#0B1020]/50 p-3 flex gap-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
                        {['pending', 'accepted', 'rejected', 'expired', 'cancelled'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setInviteStatus(status)}
                                className={`px-3 py-1.5 text-xs font-medium capitalize rounded-full transition-colors ${
                                    inviteStatus === status 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
            ) : (
                <div className="space-y-8">
                    
                    {/* Clinic Owner Section (Only in 'all') */}
                    {tab === 'all' && (!searchQuery) && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-500" /> 
                                Clinic Administration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                <Card padding="md" className="relative overflow-hidden border-indigo-100 dark:border-indigo-900/30">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-100 to-transparent dark:from-indigo-900/20 rounded-bl-full -z-10" />
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                                            {getInitials(user?.name || 'Clinic Owner')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-bold text-gray-900 dark:text-white truncate">{user?.name || 'Clinic Owner'}</p>
                                                <StatusBadge status="active" size="sm" />
                                            </div>
                                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">Clinic Owner</p>
                                            
                                            <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{user?.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 truncate">
                                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{user?.phone || 'No phone added'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Doctors Section */}
                    {(tab === 'all' || tab === 'doctors') && (
                        <div>
                            {tab === 'all' && (
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-emerald-500" /> 
                                    Active Doctors
                                </h3>
                            )}
                            
                            {doctors.length === 0 ? (
                                <Card padding="lg" className="text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
                                        <Stethoscope className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No doctors affiliated yet</h4>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                                        Invite your first doctor to build your clinic care team and allow them to manage consultations.
                                    </p>
                                    <Button onClick={() => setShowAdd(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
                                        Invite Doctor
                                    </Button>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {doctors.map((doctor) => (
                                        <Card key={doctor.id} padding="md" className="flex flex-col h-full">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shadow-sm shrink-0">
                                                    {getInitials(doctor.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-bold text-gray-900 dark:text-white truncate" title={doctor.name}>{doctor.name}</p>
                                                        <StatusBadge status={doctor.status} size="sm" />
                                                    </div>
                                                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500 mt-0.5 truncate">
                                                        {doctor.specialization || 'General Practice'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
                                                {doctor.verification === 'verified' && (
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <BadgeCheck className="w-4 h-4" /> Verified Professional
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span>Today&apos;s Appointments: <strong className="text-gray-900 dark:text-white">{doctor.todayAppointments || 0}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <span>{doctor.status === 'active' ? 'Video + In-Person' : 'Video only'}</span>
                                                </div>
                                                {doctor.joined_at && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                                                        <span>Joined {new Date(doctor.joined_at).toLocaleDateString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {tab === 'doctors' && doctorsPagination.totalPages > 1 && (
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={doctorsPagination.totalPages}
                                        onPageChange={setPage}
                                        totalItems={doctorsPagination.total}
                                        itemsPerPage={PAGE_SIZE}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invites Section */}
                    {(tab === 'all' || tab === 'invites') && (
                        <div>
                            {tab === 'all' && (
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 mt-8 flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-orange-500" /> 
                                    Pending Invitations
                                </h3>
                            )}

                            {invites.length === 0 ? (
                                tab === 'invites' ? (
                                    <Card padding="lg" className="text-center flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                            <Mail className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No {inviteStatus} invitations</h4>
                                        <p className="text-gray-500 dark:text-gray-400">There are no invites matching this status.</p>
                                    </Card>
                                ) : null
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {invites.filter(i => tab === 'invites' || i.status === 'pending').map((invite) => (
                                        <Card key={invite.id} padding="md" className="flex flex-col h-full border-dashed border-gray-300 dark:border-gray-700 hover:border-solid transition-all">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold shadow-sm shrink-0">
                                                    {getInitials(invite.doctor.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 dark:text-white truncate" title={invite.doctor.name}>{invite.doctor.name}</p>
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                        {invite.doctor.specialization || 'General Practice'}
                                                    </p>
                                                </div>
                                                <StatusBadge status={invite.status} size="sm" />
                                            </div>

                                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 flex-1 mb-4">
                                                {invite.doctor.email && (
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Mail className="w-4 h-4 shrink-0 text-gray-400" />
                                                        <span className="truncate">{invite.doctor.email}</span>
                                                    </div>
                                                )}
                                                {invite.createdAt && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock className="w-4 h-4 shrink-0 text-gray-400" />
                                                        Sent {new Date(invite.createdAt).toLocaleDateString('en-IN')}
                                                    </div>
                                                )}
                                            </div>

                                            {invite.status === 'pending' && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                                                    disabled={actionLoading === invite.id}
                                                    onClick={() => void handleCancelInvite(invite.id, invite.doctor.name)}
                                                    leftIcon={actionLoading === invite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                >
                                                    Withdraw Request
                                                </Button>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                            
                            {tab === 'invites' && invitesPagination.totalPages > 1 && (
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={page}
                                        totalPages={invitesPagination.totalPages}
                                        onPageChange={setPage}
                                        totalItems={invitesPagination.total}
                                        itemsPerPage={PAGE_SIZE}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Invite Doctor Modal */}
            <InviteDoctorModal 
                isOpen={showAdd} 
                onClose={() => {
                    setShowAdd(false);
                    void loadInvites();
                }} 
            />

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
