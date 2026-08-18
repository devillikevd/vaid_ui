'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    Users,
    UserPlus,
    Shield,
    User,
    MoreVertical,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Crown,
    Search,
    X,
    Clock,
    Phone,
    Mail,
    Check,
    Ban,
    Trash2,
    RefreshCw,
    Info,
    ArrowRight,
    Lock,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { pharmacyApi } from '@/lib/api';

interface PharmacyMember {
    id: string;
    member_role: 'manager' | 'staff';
    status: 'active' | 'suspended' | 'invited' | 'removed';
    invited_by?: string;
    created_at: string;
    updated_at?: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        profile_image_url?: string;
    };
}

export default function PharmacyStaffPage() {
    const { user } = useAuthStore();
    const isOwner = user?.role === 'pharmacy_owner';

    const [members, setMembers] = useState<PharmacyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search and Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'manager' | 'staff' | 'active' | 'suspended'>('all');

    // Details Drawer
    const [selectedMember, setSelectedMember] = useState<PharmacyMember | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<'manager' | 'staff'>('staff');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Role Change Dialog
    const [roleChangeTarget, setRoleChangeTarget] = useState<{ member: PharmacyMember; newRole: 'manager' | 'staff' } | null>(null);
    const [roleChangeLoading, setRoleChangeLoading] = useState(false);

    // Status Action Dialog (Suspend / Remove / Activate)
    const [statusTarget, setStatusTarget] = useState<{ member: PharmacyMember; action: 'suspend' | 'remove' | 'activate' } | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    // Action menu popover
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Feedback Toast
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const fetchMembers = useCallback(async () => {
        if (!isOwner) return;
        setLoading(true);
        setError(null);
        try {
            const res = await pharmacyApi.getStaff();
            if (res.success) {
                setMembers((res.data as PharmacyMember[]) || []);
            } else {
                setError(res.message || 'Unable to load staff members. Please try again.');
            }
        } catch (err: unknown) {
            console.error('Staff load error:', err);
            setError((err as Error).message || 'Unable to load staff members. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [isOwner]);

    useEffect(() => {
        if (isOwner) {
            fetchMembers();
        }
    }, [isOwner, fetchMembers]);

    // Summary counts
    const counts = useMemo(() => {
        const total = members.length;
        const active = members.filter((m) => m.status === 'active').length;
        const suspended = members.filter((m) => m.status === 'suspended').length;
        const managers = members.filter((m) => m.member_role === 'manager').length;
        const staff = members.filter((m) => m.member_role === 'staff').length;
        return { total, active, suspended, managers, staff };
    }, [members]);

    // Filtered members
    const filteredMembers = useMemo(() => {
        return members.filter((m) => {
            const matchesSearch =
                !searchQuery.trim() ||
                (m.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterRole === 'manager') return m.member_role === 'manager';
            if (filterRole === 'staff') return m.member_role === 'staff';
            if (filterRole === 'active') return m.status === 'active';
            if (filterRole === 'suspended') return m.status === 'suspended';
            return true;
        });
    }, [members, searchQuery, filterRole]);

    // Add Member handler
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = addEmail.trim();
        if (!email) return;

        setAddLoading(true);
        setAddError(null);
        try {
            const res = await pharmacyApi.inviteStaff(email, addRole);
            if (res.success) {
                setShowAddModal(false);
                setAddEmail('');
                setAddRole('staff');
                showFeedback(res.message || 'Access granted to team member successfully.');
                fetchMembers();
            } else {
                setAddError(res.message || 'Failed to add member.');
            }
        } catch (err: unknown) {
            console.error('Add member error:', err);
            setAddError((err as Error).message || 'Failed to add member.');
        } finally {
            setAddLoading(false);
        }
    };

    // Role change handler
    const handleConfirmRoleChange = async () => {
        if (!roleChangeTarget) return;
        setRoleChangeLoading(true);
        try {
            const res = await pharmacyApi.updateStaffRole(roleChangeTarget.member.id, roleChangeTarget.newRole);
            if (res.success) {
                showFeedback(`Role updated to ${roleChangeTarget.newRole === 'manager' ? 'Manager' : 'Staff'}.`);
                setRoleChangeTarget(null);
                if (selectedMember?.id === roleChangeTarget.member.id) {
                    setSelectedMember({ ...selectedMember, member_role: roleChangeTarget.newRole });
                }
                fetchMembers();
            } else {
                showFeedback(res.message || 'Failed to update role.', 'error');
            }
        } catch (err: unknown) {
            showFeedback((err as Error).message || 'Failed to update role.', 'error');
        } finally {
            setRoleChangeLoading(false);
        }
    };

    // Status change handler (suspend/remove/activate)
    const handleConfirmStatusChange = async () => {
        if (!statusTarget) return;
        setStatusLoading(true);
        try {
            const action = statusTarget.action === 'activate' ? 'suspend' : statusTarget.action;
            const res = await pharmacyApi.updateStaffStatus(
                statusTarget.member.id,
                statusTarget.action === 'activate' ? 'suspend' : statusTarget.action
            );
            if (res.success) {
                showFeedback(
                    statusTarget.action === 'remove'
                        ? 'Member removed from pharmacy.'
                        : statusTarget.action === 'suspend'
                        ? 'Member access suspended.'
                        : 'Member reactivated.'
                );
                setStatusTarget(null);
                if (selectedMember?.id === statusTarget.member.id) {
                    setSelectedMember(null);
                }
                fetchMembers();
            } else {
                showFeedback(res.message || 'Action failed.', 'error');
            }
        } catch (err: unknown) {
            showFeedback((err as Error).message || 'Action failed.', 'error');
        } finally {
            setStatusLoading(false);
        }
    };

    // Access Denied for non-owner
    if (!isOwner) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 w-16 h-16 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Restricted</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Team member delegation and access control is restricted to the <strong>Pharmacy Owner</strong>.
                </p>
                <div className="pt-2">
                    <Link href="/pharmacy/dashboard">
                        <Button variant="primary">Return to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-300" onClick={() => setActiveMenuId(null)}>
            {/* Feedback Alert */}
            {feedback && (
                <div
                    className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-lg border flex items-center gap-2.5 text-sm font-medium animate-in slide-in-from-bottom-3 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                    }`}
                >
                    {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <Users className="h-6 w-6" />
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            Staff Management
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Manage your pharmacy team and access levels.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMembers}
                        disabled={loading}
                        leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setAddError(null);
                            setShowAddModal(true);
                        }}
                        leftIcon={<UserPlus className="h-4 w-4" />}
                    >
                        + Add Team Member
                    </Button>
                </div>
            </div>

            {/* Role Legend Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 text-xs">
                <div className="flex items-start gap-2.5">
                    <Crown className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">Owner</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-1.5">— Full access & configuration</span>
                    </div>
                </div>
                <div className="flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">Manager</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-1.5">— Operational management</span>
                    </div>
                </div>
                <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">Staff</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-1.5">— Counter & fulfillment operations</span>
                    </div>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[11px] font-medium text-gray-500">Total Members</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{counts.total}</p>
                </Card>
                <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{counts.active}</p>
                </Card>
                <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Managers</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">{counts.managers}</p>
                </Card>
                <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Staff Members</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{counts.staff}</p>
                </Card>
                <Card padding="sm" className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[11px] font-medium text-red-500">Suspended</p>
                    <p className="text-xl font-bold text-red-500 mt-0.5">{counts.suspended}</p>
                </Card>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {(['all', 'manager', 'staff', 'active', 'suspended'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilterRole(tab)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap ${
                                filterRole === tab
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    <p className="text-sm font-medium text-gray-500">Loading team members...</p>
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Unable to load staff members.</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 mb-4">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchMembers} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                        Retry
                    </Button>
                </div>
            ) : members.length === 0 ? (
                /* Empty State */
                <Card padding="lg" className="border-gray-200 dark:border-gray-800 text-center py-16">
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 w-16 h-16 mx-auto flex items-center justify-center mb-3">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">No team members yet</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 mb-6">
                        Add your first Manager or Staff member to delegate pharmacy operations, counter sales, and dispensing.
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setAddError(null);
                            setShowAddModal(true);
                        }}
                        leftIcon={<UserPlus className="h-4 w-4" />}
                    >
                        + Add Team Member
                    </Button>
                </Card>
            ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                    No members match &quot;{searchQuery}&quot; in the &quot;{filterRole}&quot; view.
                </div>
            ) : (
                /* Member List Table / Cards */
                <Card padding="none" className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400">
                                    <th className="py-3 px-4 font-semibold">Member</th>
                                    <th className="py-3 px-4 font-semibold">Email</th>
                                    <th className="py-3 px-4 font-semibold">Role</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                    <th className="py-3 px-4 font-semibold">Joined Date</th>
                                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredMembers.map((member) => {
                                    const initials = (member.user?.name || member.user?.email || 'M')
                                        .split(' ')
                                        .map((p) => p[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase();

                                    const isManager = member.member_role === 'manager';
                                    const isActive = member.status === 'active';

                                    return (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedMember(member)}
                                        >
                                            {/* Member Avatar + Name */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                                            isManager
                                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                                        }`}
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                            {member.user?.name || 'Unnamed User'}
                                                        </p>
                                                        {member.user?.phone && (
                                                            <p className="text-[10px] text-gray-400">{member.user.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-400">
                                                {member.user?.email}
                                            </td>

                                            {/* Role */}
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                                                        isManager
                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                                                    }`}
                                                >
                                                    {isManager ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                                    {isManager ? 'Manager' : 'Staff'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        isActive
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                                                    }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {isActive ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>

                                            {/* Joined Date */}
                                            <td className="py-3.5 px-4 text-gray-500">
                                                {member.created_at
                                                    ? new Date(member.created_at).toLocaleDateString('en-IN', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : '—'}
                                            </td>

                                            {/* Actions */}
                                            <td
                                                className="py-3.5 px-4 text-right relative"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="inline-block text-left">
                                                    <button
                                                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>

                                                    {activeMenuId === member.id && (
                                                        <div className="absolute right-4 top-10 z-30 w-44 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-1 text-xs">
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setSelectedMember(member);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                                            >
                                                                <Info className="h-3.5 w-3.5 text-gray-400" />
                                                                View Permissions
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setRoleChangeTarget({
                                                                        member,
                                                                        newRole: isManager ? 'staff' : 'manager',
                                                                    });
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                                            >
                                                                <Shield className="h-3.5 w-3.5 text-orange-500" />
                                                                Change to {isManager ? 'Staff' : 'Manager'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setStatusTarget({
                                                                        member,
                                                                        action: isActive ? 'suspend' : 'activate',
                                                                    });
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
                                                            >
                                                                <Ban className="h-3.5 w-3.5" />
                                                                {isActive ? 'Suspend Access' : 'Reactivate'}
                                                            </button>
                                                            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenuId(null);
                                                                    setStatusTarget({ member, action: 'remove' });
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Remove Member
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* MEMBER DETAILS DRAWER */}
            {selectedMember && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in"
                    onClick={() => setSelectedMember(null)}
                >
                    <div
                        className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <User className="h-4 w-4 text-orange-600" />
                                    Team Member Details
                                </h3>
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Profile Information */}
                            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        selectedMember.member_role === 'manager'
                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                    }`}
                                >
                                    {(selectedMember.user?.name || selectedMember.user?.email || 'M').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                        {selectedMember.user?.name || 'Unnamed User'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono truncate">{selectedMember.user?.email}</p>
                                    {selectedMember.user?.phone && (
                                        <p className="text-xs text-gray-400 mt-0.5">{selectedMember.user.phone}</p>
                                    )}
                                </div>
                            </div>

                            {/* Meta & Status */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-gray-500">Role</span>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 capitalize mt-0.5 flex items-center gap-1">
                                        {selectedMember.member_role === 'manager' ? (
                                            <Shield className="h-3.5 w-3.5 text-orange-500" />
                                        ) : (
                                            <User className="h-3.5 w-3.5 text-blue-500" />
                                        )}
                                        {selectedMember.member_role}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                                    <span className="text-gray-500">Status</span>
                                    <p className="font-bold text-emerald-600 capitalize mt-0.5 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {selectedMember.status}
                                    </p>
                                </div>
                            </div>

                            {/* RBAC Permission Matrix */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    E2 Backend Permissions
                                </h4>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                    <div className="py-2 flex items-center justify-between">
                                        <span>POS Counter Immediate Checkout</span>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="py-2 flex items-center justify-between">
                                        <span>Prescription Fulfillment & Dispensing</span>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="py-2 flex items-center justify-between">
                                        <span>Order Status Updates</span>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="py-2 flex items-center justify-between">
                                        <span>Inventory Stock Management</span>
                                        {selectedMember.member_role === 'manager' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <span className="text-[10px] text-gray-400">View only</span>
                                        )}
                                    </div>
                                    <div className="py-2 flex items-center justify-between">
                                        <span>Advanced Analytics & Reports</span>
                                        {selectedMember.member_role === 'manager' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Lock className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                                        )}
                                    </div>
                                    <div className="py-2 flex items-center justify-between">
                                        <span>Customer Reviews & Responses</span>
                                        {selectedMember.member_role === 'manager' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Lock className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700" />
                                        )}
                                    </div>
                                    <div className="py-2 flex items-center justify-between text-gray-400">
                                        <span>Staff & Pharmacy Settings</span>
                                        <span className="text-[10px] font-bold text-amber-600">Owner Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Actions */}
                        <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setRoleChangeTarget({
                                        member: selectedMember,
                                        newRole: selectedMember.member_role === 'manager' ? 'staff' : 'manager',
                                    });
                                }}
                            >
                                Switch Role to {selectedMember.member_role === 'manager' ? 'Staff' : 'Manager'}
                            </Button>
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={() => {
                                    setStatusTarget({ member: selectedMember, action: 'remove' });
                                }}
                            >
                                Remove From Pharmacy
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD TEAM MEMBER MODAL */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-5 animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-orange-600" />
                                Add Team Member
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Give an existing Vaididea user access to your pharmacy.
                            </p>
                        </div>

                        {addError && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <span>{addError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAddMember} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Vaididea Account Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. member@vaididea.com"
                                    value={addEmail}
                                    onChange={(e) => setAddEmail(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <p className="text-[11px] text-gray-400">
                                    User must already have registered an account on the platform.
                                </p>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Assign Role <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Staff Card */}
                                    <div
                                        onClick={() => setAddRole('staff')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            addRole === 'staff'
                                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5 text-blue-500" />
                                                Staff
                                            </span>
                                            {addRole === 'staff' && <Check className="h-3.5 w-3.5 text-orange-600" />}
                                        </div>
                                        <p className="text-[10px] text-gray-500">
                                            Counter sales, orders, and prescription fulfillment operations.
                                        </p>
                                    </div>

                                    {/* Manager Card */}
                                    <div
                                        onClick={() => setAddRole('manager')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                            addRole === 'manager'
                                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs flex items-center gap-1.5">
                                                <Shield className="h-3.5 w-3.5 text-orange-500" />
                                                Manager
                                            </span>
                                            {addRole === 'manager' && <Check className="h-3.5 w-3.5 text-orange-600" />}
                                        </div>
                                        <p className="text-[10px] text-gray-500">
                                            Operational management, inventory, analytics, and reviews.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Manager Warning Confirmation */}
                            {addRole === 'manager' && (
                                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                    <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span>
                                        Manager access includes operational pharmacy permissions but does not allow Staff Management or Pharmacy Profile settings.
                                    </span>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddModal(false)}
                                    disabled={addLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    disabled={addLoading || !addEmail.trim()}
                                    leftIcon={addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                                >
                                    Grant Access
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRM ROLE CHANGE DIALOG */}
            {roleChangeTarget && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setRoleChangeTarget(null)}
                >
                    <div
                        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            Change Role to {roleChangeTarget.newRole === 'manager' ? 'Manager' : 'Staff'}?
                        </h4>
                        <p className="text-xs text-gray-500">
                            This will update permissions for <strong>{roleChangeTarget.member.user?.name || roleChangeTarget.member.user?.email}</strong>.
                            {roleChangeTarget.newRole === 'manager'
                                ? ' They will gain access to Inventory, Analytics, and Customer Reviews.'
                                : ' They will be restricted to Counter Sales and Order Fulfillment.'}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setRoleChangeTarget(null)} disabled={roleChangeLoading}>
                                Cancel
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleConfirmRoleChange} disabled={roleChangeLoading}>
                                {roleChangeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Change'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM STATUS / REMOVAL DIALOG */}
            {statusTarget && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setStatusTarget(null)}
                >
                    <div
                        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {statusTarget.action === 'remove'
                                ? 'Remove Team Member?'
                                : statusTarget.action === 'suspend'
                                ? 'Suspend Member Access?'
                                : 'Reactivate Member?'}
                        </h4>
                        <p className="text-xs text-gray-500">
                            {statusTarget.action === 'remove'
                                ? `Are you sure you want to remove ${statusTarget.member.user?.name || statusTarget.member.user?.email} from this pharmacy? Their role will be reverted to patient.`
                                : statusTarget.action === 'suspend'
                                ? `Suspending ${statusTarget.member.user?.name || statusTarget.member.user?.email} will temporarily block them from accessing this pharmacy portal.`
                                : `Reactivate access for ${statusTarget.member.user?.name || statusTarget.member.user?.email}?`}
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setStatusTarget(null)} disabled={statusLoading}>
                                Cancel
                            </Button>
                            <Button
                                variant={statusTarget.action === 'remove' ? 'danger' : 'primary'}
                                size="sm"
                                onClick={handleConfirmStatusChange}
                                disabled={statusLoading}
                            >
                                {statusLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : statusTarget.action === 'remove' ? (
                                    'Remove'
                                ) : statusTarget.action === 'suspend' ? (
                                    'Suspend'
                                ) : (
                                    'Reactivate'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
