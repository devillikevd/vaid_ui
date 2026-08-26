'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Loader2, RefreshCw, UserPlus, AlertCircle, X, Shield, Briefcase, Clock, Building2, KeyRound, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { hospitalApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

interface Manager {
    id: string;
    user_id: string;
    role: string;
    staff_role?: string;
    shift?: string;
    created_at: string;
    user?: {
        name: string;
        email: string;
        phone?: string;
    };
    department?: {
        name: string;
    };
    name?: string;
    email?: string;
}

const STAFF_ROLES = [
    { value: 'receptionist', label: 'Receptionist (OPD Queue & Admissions)' },
    { value: 'nurse', label: 'Ward Nurse (Nursing Station & MAR)' },
    { value: 'pharmacist', label: 'Pharmacist (In-House Pharmacy)' },
    { value: 'lab_technician', label: 'Lab Technician (Pathology Lab)' },
    { value: 'radiologist', label: 'Radiologist (X-Ray & Scans)' },
    { value: 'billing_cashier', label: 'Billing Cashier (Invoices & Deposits)' },
    { value: 'tpa_officer', label: 'TPA Officer (Insurance Pre-Auth)' },
    { value: 'ot_coordinator', label: 'OT Coordinator (Surgeries Roster)' },
    { value: 'hospital_admin', label: 'Hospital Admin (General Manager)' },
];

export default function HospitalManagersPage() {
    const { user } = useAuthStore();
    const canManageManagers = user?.role === 'hospital_owner' || user?.role === 'hospital_manager';
    const [managers, setManagers] = useState<Manager[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addData, setAddData] = useState({
        email: '',
        name: '',
        phone: '',
        password: 'Staff@123',
        staffRole: 'hospital_admin',
        shift: 'general',
    });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const toast = useToast();

    const fetchManagers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await hospitalApi.getManagers();
            if (response.success) {
                const data = response.data as Record<string, unknown>;
                setManagers((data.managers || data.data || data || []) as Manager[]);
            } else {
                setError(response.error || 'Failed to load staff roster');
            }
        } catch (err) {
            console.error('Error fetching staff:', err);
            setError('Failed to connect to server. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleAddManager = async () => {
        if (!canManageManagers) return;
        if (!addData.email.trim() || !addData.name.trim()) return;
        setActionLoading('add');
        try {
            const response = await hospitalApi.addManager({
                email: addData.email.trim(),
                name: addData.name.trim(),
                phone: addData.phone.trim() || undefined,
                password: addData.password || 'Staff@123',
                staffRole: addData.staffRole,
                role: addData.staffRole,
                shift: addData.shift,
            });
            if (response.success) {
                toast.success('Staff Member Created', `${addData.name} added! Login: ${addData.email} / Password: ${addData.password || 'Staff@123'}`);
                setShowAddModal(false);
                setAddData({ email: '', name: '', phone: '', password: 'Staff@123', staffRole: 'hospital_admin', shift: 'general' });
                fetchManagers();
            } else {
                toast.error('Failed', response.error || 'Could not add staff member');
            }
        } catch (err) {
            console.error('Error adding staff:', err);
            toast.error('Error', 'Failed to connect to server');
        } finally {
            setActionLoading(null);
        }
    };

    const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<{ id: string; name: string; email: string } | null>(null);
    const [newStaffPassword, setNewStaffPassword] = useState('Staff@123');

    const handleResetPassword = async () => {
        if (!selectedStaffForPassword || !newStaffPassword.trim()) return;
        setActionLoading('reset_pwd');
        try {
            const res = await hospitalApi.resetStaffPassword(selectedStaffForPassword.id, newStaffPassword.trim());
            if (res.success) {
                toast.success('Password Updated', `New password set for ${selectedStaffForPassword.name}`);
                setSelectedStaffForPassword(null);
                setNewStaffPassword('Staff@123');
            } else {
                toast.error('Failed', res.error || 'Could not reset password');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveStaff = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke workstation access for ${name}?`)) return;
        setActionLoading(`remove_${id}`);
        try {
            const res = await hospitalApi.removeManager(id);
            if (res.success) {
                toast.success('Staff Access Revoked', `${name} removed from hospital roster`);
                fetchManagers();
            } else {
                toast.error('Failed', res.error || 'Could not remove staff');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = managers.filter((m) => {
        const name = m.user?.name || m.name || '';
        const email = m.user?.email || m.email || '';
        const role = m.staff_role || m.role || '';
        return (
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            role.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    if (isLoading && managers.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-7 w-7 text-teal-600" />
                        Hospital Staff & Role Management (RBAC)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Assign staff roles (Reception, Nursing, Pharmacy, Lab, Billing, Admin) to grant workstation access
                    </p>
                </div>
                {canManageManagers && (
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" /> Add Staff Member
                    </Button>
                )}
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={fetchManagers} className="ml-auto">
                        Retry
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by staff name, email, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" onClick={fetchManagers} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Staff List Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                            <tr>
                                <th className="py-3 px-4">Staff Member</th>
                                <th className="py-3 px-4 hidden md:table-cell">Email & Phone</th>
                                <th className="py-3 px-4">Designated Workstation Role</th>
                                <th className="py-3 px-4 hidden sm:table-cell">Shift</th>
                                <th className="py-3 px-4 hidden lg:table-cell">Added On</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-500">
                                        No staff members found. Click &quot;Add Staff Member&quot; to onboard staff.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((mgr) => {
                                    const roleStr = (mgr.staff_role || mgr.role || 'hospital_admin').replace('_', ' ');
                                    return (
                                        <tr key={mgr.id || mgr.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                                                        <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                                    </div>
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {mgr.user?.name || mgr.name || 'Staff Member'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                <div>{mgr.user?.email || mgr.email || '—'}</div>
                                                {mgr.user?.phone && <div className="text-xs text-gray-400 font-mono">{mgr.user.phone}</div>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                                                    <Briefcase className="h-3 w-3 mr-1" />
                                                    {roleStr}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-gray-500 hidden sm:table-cell capitalize">
                                                <Clock className="h-3 w-3 inline mr-1 text-gray-400" />
                                                {mgr.shift || 'general'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-gray-400 hidden lg:table-cell">
                                                {mgr.created_at ? new Date(mgr.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {canManageManagers && (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStaffForPassword({
                                                                    id: mgr.id,
                                                                    name: mgr.user?.name || mgr.name || 'Staff Member',
                                                                    email: mgr.user?.email || mgr.email || '',
                                                                });
                                                                setNewStaffPassword('Staff@123');
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                                            title="Reset / Change Password"
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveStaff(mgr.id, mgr.user?.name || mgr.name || 'Staff Member')}
                                                            disabled={actionLoading === `remove_${mgr.id}`}
                                                            className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                                                            title="Revoke Workstation Access"
                                                        >
                                                            {actionLoading === `remove_${mgr.id}` ? (
                                                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add Staff Modal */}
            {canManageManagers && showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md border">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                Add Hospital Staff Member
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Staff Email *
                                </label>
                                <Input
                                    value={addData.email}
                                    onChange={(e) => setAddData((d) => ({ ...d, email: e.target.value }))}
                                    placeholder="nurse@hospital.com"
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Staff must have an existing platform account with this email.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Full Name *
                                </label>
                                <Input
                                    value={addData.name}
                                    onChange={(e) => setAddData((d) => ({ ...d, name: e.target.value }))}
                                    placeholder="e.g. Sister Mary / Ramesh Patel"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Initial Password (For Staff Login) *
                                </label>
                                <Input
                                    type="text"
                                    value={addData.password}
                                    onChange={(e) => setAddData((d) => ({ ...d, password: e.target.value }))}
                                    placeholder="e.g. Staff@123"
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Give this password to the staff member so they can login immediately.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Workstation Role (Determines dashboard access) *
                                </label>
                                <select
                                    value={addData.staffRole}
                                    onChange={(e) => setAddData((d) => ({ ...d, staffRole: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                                >
                                    {STAFF_ROLES.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Shift
                                    </label>
                                    <select
                                        value={addData.shift}
                                        onChange={(e) => setAddData((d) => ({ ...d, shift: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                                    >
                                        <option value="general">General (9 to 5)</option>
                                        <option value="morning">Morning Shift</option>
                                        <option value="evening">Evening Shift</option>
                                        <option value="night">Night Shift</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Phone (Optional)
                                    </label>
                                    <Input
                                        value={addData.phone}
                                        onChange={(e) => setAddData((d) => ({ ...d, phone: e.target.value }))}
                                        placeholder="+91XXXXXXXXXX"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                            <Button variant="outline" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddManager}
                                disabled={actionLoading === 'add' || !addData.email || !addData.name}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {actionLoading === 'add' && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                                Save Staff
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {canManageManagers && selectedStaffForPassword && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm border p-5 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-teal-600" />
                                Reset Staff Password
                            </h3>
                            <button onClick={() => setSelectedStaffForPassword(null)}><X className="h-4 w-4 text-gray-400" /></button>
                        </div>
                        <div className="text-xs text-gray-500">
                            Set a new login password for <strong className="text-gray-900 dark:text-white">{selectedStaffForPassword.name}</strong> ({selectedStaffForPassword.email}).
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                New Password (min 6 chars) *
                            </label>
                            <Input
                                type="text"
                                value={newStaffPassword}
                                onChange={(e) => setNewStaffPassword(e.target.value)}
                                placeholder="e.g. Nurse@2026 / Staff@123"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => setSelectedStaffForPassword(null)}>Cancel</Button>
                            <Button
                                size="sm"
                                onClick={handleResetPassword}
                                disabled={actionLoading === 'reset_pwd' || !newStaffPassword.trim() || newStaffPassword.length < 6}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                            >
                                {actionLoading === 'reset_pwd' && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                Update Password
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
