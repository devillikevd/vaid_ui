'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { diagnosticCenterApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { 
    AlertCircle, Users, PlusCircle, Search, Shield, MoreVertical, 
    CheckCircle2, XCircle, Trash2, Edit2, Activity,
    Mail, Calendar, Briefcase, RefreshCw, X
} from 'lucide-react';

export interface DiagnosticStaffMember {
    id: string;
    member_role: 'manager' | 'lab_technician';
    status: 'invited' | 'active' | 'suspended' | 'removed';
    created_at: string;
    user: {
        name: string;
        email: string;
    };
}

export default function StaffManagementPage() {
    const { user } = useAuthStore();
    const toast = useToast();
    const [staff, setStaff] = useState<DiagnosticStaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Drawer states
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<DiagnosticStaffMember | null>(null);

    // Form states
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState('manager');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user?.role === 'diagnostic_center_owner') {
            fetchStaff();
        }
    }, [user?.role]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await diagnosticCenterApi.getStaff();
            if (response.success) {
                setStaff((response.data as DiagnosticStaffMember[]) || []);
            } else {
                setError(response.message || 'Failed to load staff');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addEmail || !addEmail.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await diagnosticCenterApi.inviteStaff(addEmail, addRole);
            if (response.success) {
                toast.success('Team member added successfully.');
                setIsAddDrawerOpen(false);
                setAddEmail('');
                setAddRole('manager');
                fetchStaff();
            } else {
                toast.error(response.message || 'Unable to add team member. Please try again.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Unable to add team member. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            const res = await diagnosticCenterApi.updateStaffRole(memberId, newRole);
            if (res.success) {
                toast.success('Role updated successfully.');
                fetchStaff();
            }
        } catch (err: unknown) {
            toast.error('Failed to update role.');
        }
    };

    const handleStatusChange = async (memberId: string, currentStatus: string) => {
        const action = currentStatus === 'active' ? 'suspend' : 'activate';
        if (action === 'suspend' && !confirm('Are you sure you want to suspend this member?')) return;
        
        try {
            const res = await diagnosticCenterApi.updateStaffStatus(memberId, action);
            if (res.success) {
                toast.success(`Member ${action}d successfully.`);
                fetchStaff();
            }
        } catch (err: unknown) {
            toast.error('Failed to update status.');
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member? This action cannot be undone.')) return;
        try {
            const res = await diagnosticCenterApi.removeStaff(memberId);
            if (res.success) {
                toast.success('Staff member removed successfully.');
                setIsDetailsDrawerOpen(false);
                fetchStaff();
            }
        } catch (err: unknown) {
            toast.error('Failed to remove member.');
        }
    };

    // Client-side filtering because backend getDiagnosticMembers returns full list for center
    const filteredStaff = useMemo(() => {
        return staff.filter((m) => {
            const searchStr = searchTerm.toLowerCase();
            const nameMatches = m.user?.name?.toLowerCase().includes(searchStr);
            const emailMatches = m.user?.email?.toLowerCase().includes(searchStr);
            const matchesSearch = nameMatches || emailMatches;
            
            const matchesRole = roleFilter === 'all' || m.member_role === roleFilter;
            const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [staff, searchTerm, roleFilter, statusFilter]);

    const activeCount = staff.filter(m => m.status === 'active').length;
    const managerCount = staff.filter(m => m.member_role === 'manager').length;
    const techCount = staff.filter(m => m.member_role === 'lab_technician').length;

    if (user?.role !== 'diagnostic_center_owner') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Shield className="h-16 w-16 text-slate-300 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Access Denied</h1>
                <p className="text-slate-500 mt-2">Only center owners can manage staff.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* 1. Header */}
            <PageHeader 
                title="Staff Management"
                subtitle="Manage your diagnostic center team and access roles."
                actions={
                    <>
                        <button 
                            onClick={fetchStaff}
                            disabled={loading}
                            className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:bg-slate-800/50 rounded-[10px] border border-slate-200 dark:border-slate-700 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button 
                            onClick={() => setIsAddDrawerOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] transition-all font-medium text-sm shadow-sm hover:shadow"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add Staff
                        </button>
                    </>
                }
            />

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Staff</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{loading ? '-' : staff.length}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Staff</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{loading ? '-' : activeCount}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Managers</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{loading ? '-' : managerCount}</p>
                    </div>
                </div></DashboardCard>
                <DashboardCard noPadding><div className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lab Technicians</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{loading ? '-' : techCount}</p>
                    </div>
                </div></DashboardCard>
            </div>

            {/* 3. Filters */}
            <DashboardCard noPadding><div className="p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-transparent focus:bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 border-transparent focus:bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">All Roles</option>
                            <option value="manager">Manager</option>
                            <option value="lab_technician">Lab Technician</option>
                        </select>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 border-transparent focus:bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 font-medium text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="invited">Invited</option>
                        </select>
                    </div>
                </div>
            </div></DashboardCard>

            {/* 4. Main Content (Mutually Exclusive States) */}
            {error ? (
                <DashboardCard noPadding><div className="py-16 text-center flex flex-col items-center">
                    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{error}</h3>
                    <button onClick={fetchStaff} className="mt-4 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        Try Again
                    </button>
                </div></DashboardCard>
            ) : loading ? (
                <DashboardCard noPadding><div className="p-0 overflow-hidden divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 w-1/3">
                                <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                                </div>
                            </div>
                            <div className="h-6 bg-slate-100 rounded-full animate-pulse w-20 hidden sm:block" />
                            <div className="h-6 bg-slate-100 rounded-full animate-pulse w-20 hidden sm:block" />
                            <div className="h-8 w-8 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div></DashboardCard>
            ) : filteredStaff.length === 0 ? (
                <DashboardCard noPadding><div className="py-16 text-center flex flex-col items-center">
                    <Users className="h-10 w-10 text-slate-300 mb-3" />
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">No staff found.</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {staff.length === 0 ? "You haven't added any staff yet." : "Clear filters or invite a new team member."}
                    </p>
                </div></DashboardCard>
            ) : (
                <DashboardCard noPadding><div className="p-0 overflow-hidden">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-[#1a202c]">
                            <thead className="bg-slate-50 dark:bg-slate-800/50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-5 py-3.5 font-medium">Name</th>
                                    <th className="px-5 py-3.5 font-medium">Contact</th>
                                    <th className="px-5 py-3.5 font-medium">Role</th>
                                    <th className="px-5 py-3.5 font-medium">Status</th>
                                    <th className="px-5 py-3.5 font-medium">Joined</th>
                                    <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStaff.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50 dark:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => { setSelectedMember(member); setIsDetailsDrawerOpen(true); }}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                                                    {member.user?.name ? member.user.name[0].toUpperCase() : member.user?.email[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{member.user?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">{member.user?.email}</td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-medium uppercase tracking-wider">
                                                {member.member_role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                                member.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                                member.status === 'invited' ? 'bg-amber-50 text-amber-700' :
                                                member.status === 'suspended' ? 'bg-red-50 text-red-700' :
                                                'bg-slate-100 text-slate-700 dark:text-slate-300'
                                            }`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">
                                            {new Date(member.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setIsDetailsDrawerOpen(true); }} className="p-2 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredStaff.map((member) => (
                            <div key={member.id} className="p-4 hover:bg-slate-50 dark:bg-slate-800/50 cursor-pointer" onClick={() => { setSelectedMember(member); setIsDetailsDrawerOpen(true); }}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            {member.user?.name ? member.user.name[0].toUpperCase() : member.user?.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{member.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{member.user?.email}</div>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                        member.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                        member.status === 'invited' ? 'bg-amber-50 text-amber-700' :
                                        member.status === 'suspended' ? 'bg-red-50 text-red-700' :
                                        'bg-slate-100 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {member.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-3 pl-12">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                                        {member.member_role.replace('_', ' ')}
                                    </span>
                                    <button className="p-1.5 text-slate-400 hover:text-purple-600 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div></DashboardCard>
            )}

            {/* 5. Add Drawer */}
            {isAddDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsAddDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Staff Member</h2>
                            <button onClick={() => setIsAddDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-800/50/50">
                            <form id="add-member-form" onSubmit={handleAddMember} className="space-y-5">
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input 
                                            type="email" 
                                            required
                                            value={addEmail}
                                            onChange={(e) => setAddEmail(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all bg-white dark:bg-slate-900"
                                            placeholder="doctor@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">Role Assignment</label>
                                    <div className="space-y-2.5">
                                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${addRole === 'manager' ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600/20' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 bg-white dark:bg-slate-900'}`}>
                                            <input type="radio" name="role" value="manager" checked={addRole === 'manager'} onChange={() => setAddRole('manager')} className="mt-0.5 accent-purple-600" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Manager</div>
                                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">Full operational access. Can view analytics, manage bookings, and edit the test catalog.</div>
                                            </div>
                                        </label>
                                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${addRole === 'lab_technician' ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600/20' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 bg-white dark:bg-slate-900'}`}>
                                            <input type="radio" name="role" value="lab_technician" checked={addRole === 'lab_technician'} onChange={() => setAddRole('lab_technician')} className="mt-0.5 accent-purple-600" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lab Technician</div>
                                                <div className="text-xs text-slate-500 mt-1 leading-relaxed">Restricted access. Can view the work queue, collect samples, and upload results.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <button 
                                type="submit" 
                                form="add-member-form"
                                disabled={isSubmitting}
                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Sending Invite...' : 'Send Invitation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Details Drawer */}
            {isDetailsDrawerOpen && selectedMember && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsDetailsDrawerOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Staff Profile</h2>
                            <button onClick={() => setIsDetailsDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800/50/50 p-6 space-y-6">
                            
                            <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                                <div className="h-16 w-16 rounded-full bg-purple-100 text-purple-700 text-2xl flex items-center justify-center font-bold mb-3">
                                    {selectedMember.user?.name ? selectedMember.user.name[0].toUpperCase() : selectedMember.user?.email[0].toUpperCase()}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedMember.user?.name || 'Unknown'}</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{selectedMember.user?.email}</p>
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {selectedMember.member_role.replace('_', ' ')}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        selectedMember.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                        selectedMember.status === 'invited' ? 'bg-amber-50 text-amber-700' :
                                        selectedMember.status === 'suspended' ? 'bg-red-50 text-red-700' :
                                        'bg-slate-100 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {selectedMember.status}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50/50 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account Details</h4>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Joined Date</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {new Date(selectedMember.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Access Level</p>
                                        <div className="space-y-2">
                                            {selectedMember.member_role === 'manager' ? (
                                                <>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Full Dashboard Analytics</div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Manage All Bookings</div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Edit Test Catalog</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> View Work Queue</div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Upload Test Results</div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500"><XCircle className="h-4 w-4 text-slate-300 shrink-0" /> No Analytics Access</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid gap-2">
                            <button 
                                onClick={() => handleRoleChange(selectedMember.id, selectedMember.member_role === 'manager' ? 'lab_technician' : 'manager')}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all shadow-sm"
                            >
                                <Edit2 className="h-4 w-4 text-slate-400" />
                                Change Role to {selectedMember.member_role === 'manager' ? 'Lab Technician' : 'Manager'}
                            </button>
                            <button 
                                onClick={() => handleStatusChange(selectedMember.id, selectedMember.status)}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${
                                    selectedMember.status === 'active' 
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                }`}
                            >
                                <Shield className="h-4 w-4 opacity-70" />
                                {selectedMember.status === 'active' ? 'Suspend Access' : 'Activate Access'}
                            </button>
                            <button 
                                onClick={() => handleRemove(selectedMember.id)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-all shadow-sm"
                            >
                                <Trash2 className="h-4 w-4 opacity-70" />
                                Remove Staff Member
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
