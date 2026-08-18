'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Building2, Users, Activity, CalendarDays, AlertCircle, RefreshCw, Plus,
    Edit2, Trash2, Search, Phone, Stethoscope, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonStatsGrid, SkeletonTable } from '@/components/ui/Skeleton';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DepartmentFormModal, DepartmentFormValue } from '@/components/clinic/DepartmentFormModal';
import { useClinicStore } from '@/stores/clinicStore';
import type { Department } from '@/stores/clinicStore';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function ClinicDepartmentsPage() {
    const {
        departments, departmentMeta, loadingDepartments, error, doctors,
        fetchDepartments, fetchDoctors, deleteDepartment, clearError,
    } = useClinicStore();
    const toast = useToast();
    const { dialogProps, confirm } = useConfirmDialog();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState<(DepartmentFormValue & { id: string }) | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const hasLoaded = !loadingDepartments;

    useEffect(() => {
        fetchDepartments();
        fetchDoctors({ page: 1, limit: 200 });
    }, [fetchDepartments, fetchDoctors]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return (departments || []).filter((dept) => {
            if (statusFilter === 'active' && !dept.is_active) return false;
            if (statusFilter === 'inactive' && dept.is_active) return false;
            if (!q) return true;
            return (
                dept.name.toLowerCase().includes(q) ||
                (dept.description || '').toLowerCase().includes(q) ||
                (dept.head_doctor_name || '').toLowerCase().includes(q)
            );
        });
    }, [departments, searchQuery, statusFilter]);

    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 12);
    const paginatedItems = paginate(page);

    const openAdd = () => {
        setEditingDept(null);
        setShowForm(true);
    };

    const openEdit = (dept: Department) => {
        setEditingDept({
            id: dept.id,
            name: dept.name || '',
            headDoctorId: dept.head_doctor_id || '',
            description: dept.description || '',
            contactExtension: dept.contact_extension || '',
            isActive: dept.is_active !== false,
        });
        setShowForm(true);
    };

    const handleToggleStatus = async (dept: Department) => {
        setActionLoading(dept.id);
        const success = await useClinicStore.getState().updateDepartment(dept.id, { is_active: !dept.is_active });
        setActionLoading(null);
        if (success) {
            toast.success(dept.is_active ? 'Department Deactivated' : 'Department Activated',
                dept.is_active ? `"${dept.name}" is now inactive` : `"${dept.name}" is now active`);
        } else {
            toast.error('Error', 'Failed to update department status');
        }
    };

    const handleDelete = async (dept: Department) => {
        const confirmed = await confirm({
            title: 'Delete Department',
            message: `Delete "${dept.name}"? This cannot be undone and will remove the department from your clinic.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(dept.id);
        const success = await deleteDepartment(dept.id);
        setActionLoading(null);
        if (success) toast.success('Department Deleted', `"${dept.name}" has been removed`);
        else toast.error('Error', 'Failed to delete department');
    };

    const MetricCard = ({ label, value, icon: Icon, accent }: {
        label: string; value: number; icon: typeof Users; accent: string;
    }) => (
        <Card padding="md" className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" />
            </div>
        </Card>
    );

    const metrics = [
        { label: 'Total Departments', value: departmentMeta.total, icon: Building2, accent: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' },
        { label: 'Active', value: departmentMeta.active, icon: Activity, accent: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' },
        { label: 'Doctors Assigned', value: departmentMeta.doctorsAssigned, icon: Users, accent: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
        { label: "Today's Appointments", value: departmentMeta.todayAppointments, icon: CalendarDays, accent: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Departments</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Organize your clinic into departments and assign doctors</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchDepartments()} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                    <Button onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>Add Department</Button>
                </div>
            </div>

            {error && !loadingDepartments && departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                        <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                    </div>
                    <p className="text-red-600 dark:text-red-400 font-medium">Failed to load departments</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                    <Button onClick={() => { clearError(); fetchDepartments(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
                </div>
            ) : !hasLoaded ? (
                <div className="space-y-6">
                    <SkeletonStatsGrid count={4} />
                    <SkeletonTable rows={5} />
                </div>
            ) : (
                <>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
                            <button onClick={() => clearError()} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-xs font-semibold uppercase">Dismiss</button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((metric) => (
                            <MetricCard key={metric.label} {...metric} />
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="w-full md:max-w-sm">
                            <Input
                                placeholder="Search by name, description or head doctor..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                leftIcon={<Search className="h-5 w-5" />}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => (
                                <Button
                                    key={filter}
                                    size="sm"
                                    variant={statusFilter === filter ? 'primary' : 'outline'}
                                    onClick={() => { setStatusFilter(filter); setPage(1); }}
                                >
                                    {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Inactive'}
                                    {filter !== 'all' && (
                                        <span className="ml-1 text-xs opacity-70">
                                            ({filter === 'active' ? departmentMeta.active : departmentMeta.inactive})
                                        </span>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {paginatedItems.length === 0 ? (
                        <Card padding="lg" className="text-center py-12">
                            <div className="mx-auto p-4 rounded-full bg-teal-50 dark:bg-teal-900/20 w-fit mb-3">
                                <Building2 className="h-10 w-10 text-teal-400" />
                            </div>
                            <p className="text-gray-700 dark:text-gray-200 font-semibold">
                                {departments.length === 0 ? 'No departments yet' : 'No matching departments'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {departments.length === 0
                                    ? 'Create your first department to organize doctors, e.g. Cardiology or Pediatrics.'
                                    : 'Try adjusting your search or status filter.'}
                            </p>
                            {departments.length === 0 && (
                                <Button className="mt-4" onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>
                                    Add Department
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedItems.map((dept) => (
                                <Card key={dept.id} padding="md" className="flex flex-col">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-xl flex-shrink-0 ${dept.is_active ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                <Building2 className={`h-5 w-5 ${dept.is_active ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/clinic/departments/${dept.id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block">
                                                    {dept.name}
                                                </Link>
                                                {dept.contact_extension && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Phone className="h-3 w-3" /> Ext. {dept.contact_extension}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <StatusBadge status={dept.is_active ? 'active' : 'inactive'} size="sm" />
                                    </div>

                                    {dept.description && (
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{dept.description}</p>
                                    )}

                                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                        <span className="flex items-center gap-1.5">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            {dept.doctor_count || 0} doctor{(dept.doctor_count || 0) === 1 ? '' : 's'}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarDays className="h-4 w-4 text-gray-400" />
                                            {dept.today_appointments || 0} today
                                        </span>
                                    </div>

                                    {dept.head_doctor_name ? (
                                        <div className="mt-3 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                                            {dept.head_doctor_profile_image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={dept.head_doctor_profile_image_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                            ) : (
                                                <div className="h-7 w-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                                    <Stethoscope className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Head of Department</p>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{dept.head_doctor_name}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> No head doctor assigned yet.
                                        </p>
                                    )}

                                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 mt-4">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEdit(dept)}
                                                disabled={actionLoading === dept.id}
                                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(dept)}
                                                disabled={actionLoading === dept.id}
                                                className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                title={dept.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                <Activity className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dept)}
                                                disabled={actionLoading === dept.id}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <Link
                                            href={`/clinic/departments/${dept.id}`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            View <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} itemsPerPage={itemsPerPage} />
                    )}
                </>
            )}

            <DepartmentFormModal
                open={showForm}
                onClose={() => setShowForm(false)}
                editing={editingDept}
            />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
