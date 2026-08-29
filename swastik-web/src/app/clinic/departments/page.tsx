'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Building2, Users, Activity, AlertCircle, RefreshCw, Plus,
    Edit2, Trash2, Search, Phone, ArrowRight, ShieldCheck,
    UserCheck, UserPlus, UserX, Sparkles, Check, CheckCircle2,
    Layers, AlertTriangle
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
import { AssignDoctorsModal } from '@/components/clinic/AssignDoctorsModal';
import { ChooseDepartmentModal } from '@/components/clinic/ChooseDepartmentModal';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { useClinicStore } from '@/stores/clinicStore';
import { getSuggestedDepartment, findMatchingDepartment, normalizeDeptName } from '@/lib/smartDepartmentSuggestions';
import type { Department, ClinicDoctor } from '@/stores/clinicStore';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function ClinicDepartmentsPage() {
    const {
        departments,
        loadingDepartments,
        error,
        doctors,
        fetchDepartments,
        fetchDoctors,
        addDepartment,
        assignDoctorToDepartment,
        deleteDepartment,
        clearError,
    } = useClinicStore();

    const toast = useToast();
    const { dialogProps, confirm } = useConfirmDialog();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // Modals state
    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState<(DepartmentFormValue & { id: string }) | null>(null);
    const [formInitialValues, setFormInitialValues] = useState<Partial<DepartmentFormValue> | null>(null);
    const [selectedDeptForAssign, setSelectedDeptForAssign] = useState<Department | null>(null);
    const [doctorForChooseDept, setDoctorForChooseDept] = useState<{ doctor: ClinicDoctor; suggestedName: string | null } | null>(null);

    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const refreshData = useCallback(async () => {
        await Promise.all([
            fetchDepartments(),
            fetchDoctors({ page: 1, limit: 100 }),
        ]);
    }, [fetchDepartments, fetchDoctors]);

    useEffect(() => {
        void refreshData();
    }, [refreshData]);

    // Active affiliated doctors (is_active !== false and status !== 'inactive')
    const activeDoctorsList = useMemo(() => {
        return (doctors || []).filter((d) => d.status !== 'inactive');
    }, [doctors]);

    // Compute assigned vs unassigned doctors
    const { assignedDoctorIds, unassignedDoctors, assignedDoctors, assignedCount, unassignedCount } = useMemo(() => {
        const assignedSet = new Set<string>();
        const assigned: ClinicDoctor[] = [];
        const unassigned: ClinicDoctor[] = [];

        for (const doc of activeDoctorsList) {
            const docId = doc.id || doc.doctorId;
            const hasDepts = (Array.isArray(doc.departments) && doc.departments.length > 0) || Boolean(doc.department);
            const isHead = (departments || []).some((dept) => dept.head_doctor_id === docId);

            if (hasDepts || isHead) {
                assignedSet.add(docId);
                assigned.push(doc);
            } else {
                unassigned.push(doc);
            }
        }

        return {
            assignedDoctorIds: assignedSet,
            assignedDoctors: assigned,
            unassignedDoctors: unassigned,
            assignedCount: assignedSet.size,
            unassignedCount: unassigned.length,
        };
    }, [activeDoctorsList, departments]);

    // Statistics Cards
    const totalDepartments = departments.length;
    const activeDepartmentsCount = departments.filter((d) => d.is_active !== false).length;
    const inactiveDepartmentsCount = totalDepartments - activeDepartmentsCount;

    // Search and Filter departments
    const filteredDepartments = useMemo(() => {
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

    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filteredDepartments, 12);
    const paginatedDepartments = paginate(page);

    // Handlers
    const openAdd = (prefill?: Partial<DepartmentFormValue>) => {
        setEditingDept(null);
        setFormInitialValues(prefill || null);
        setShowForm(true);
    };

    const openEdit = (dept: Department) => {
        setFormInitialValues(null);
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
            toast.success(
                dept.is_active ? 'Department Deactivated' : 'Department Activated',
                dept.is_active ? `"${dept.name}" is now inactive` : `"${dept.name}" is now active`
            );
            void refreshData();
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
        if (success) {
            toast.success('Department Deleted', `"${dept.name}" has been removed`);
            void refreshData();
        } else {
            toast.error('Error', 'Failed to delete department');
        }
    };

    // Direct Assignment to existing department
    const handleAssignToExisting = async (doc: ClinicDoctor, deptId: string, deptName: string) => {
        const docId = doc.id || doc.doctorId;
        setActionLoading(docId);
        const success = await assignDoctorToDepartment(deptId, docId);
        setActionLoading(null);

        if (success) {
            toast.success(
                'Doctor Assigned',
                `${doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`} assigned to ${deptName}`
            );
            void refreshData();
        } else {
            toast.error('Error', 'Failed to assign doctor to department');
        }
    };

    // Smart Create Department & Assign Doctor
    const handleCreateAndAssign = async (doc: ClinicDoctor, suggestedDeptName: string) => {
        const docId = doc.id || doc.doctorId;
        const doctorName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
        setActionLoading(docId);

        // 1. Check if department already exists (duplicate protection)
        const existingMatch = findMatchingDepartment(suggestedDeptName, departments);
        if (existingMatch) {
            const success = await assignDoctorToDepartment(existingMatch.id, docId);
            setActionLoading(null);
            if (success) {
                toast.success('Doctor Assigned', `${doctorName} assigned to existing department ${existingMatch.name}`);
                void refreshData();
            } else {
                toast.error('Error', 'Failed to assign doctor to department');
            }
            return;
        }

        // 2. Create the department with this doctor as head doctor (which auto-assigns doctor in backend)
        const success = await addDepartment({
            name: suggestedDeptName,
            headDoctorId: docId,
            isActive: true,
        });

        setActionLoading(null);
        if (success) {
            toast.success(
                'Department Created & Assigned',
                `Created "${suggestedDeptName}" and assigned ${doctorName}`
            );
            void refreshData();
        } else {
            toast.error('Error', 'Failed to create department');
        }
    };

    // Batch Create & Assign for multiple unassigned doctors with same suggested department
    const handleBatchCreateAndAssign = async (targetDoctors: ClinicDoctor[], suggestedDeptName: string) => {
        if (targetDoctors.length === 0) return;
        const firstDoc = targetDoctors[0];
        const firstDocId = firstDoc.id || firstDoc.doctorId;
        setActionLoading(`batch-${suggestedDeptName}`);

        // 1. Create or find department
        const existingDept = findMatchingDepartment(suggestedDeptName, departments);
        if (!existingDept) {
            const created = await addDepartment({
                name: suggestedDeptName,
                headDoctorId: firstDocId,
                isActive: true,
            });
            if (!created) {
                setActionLoading(null);
                toast.error('Error', 'Failed to create department');
                return;
            }
        }

        // 2. Re-fetch departments to get the newly created department ID
        await fetchDepartments();
        const updatedDepartments = useClinicStore.getState().departments;
        const targetDept = findMatchingDepartment(suggestedDeptName, updatedDepartments);

        if (targetDept?.id) {
            // Assign all doctors
            for (const doc of targetDoctors) {
                const id = doc.id || doc.doctorId;
                await assignDoctorToDepartment(targetDept.id, id);
            }
            setActionLoading(null);
            toast.success(
                'Batch Assignment Complete',
                `Created "${suggestedDeptName}" and assigned ${targetDoctors.length} doctors`
            );
            void refreshData();
        } else {
            setActionLoading(null);
            toast.error('Error', 'Failed to locate department for assignment');
        }
    };

    const isLoading = loadingDepartments && departments.length === 0 && activeDoctorsList.length === 0;

    // Group unassigned doctors by suggested department for batch awareness
    const unassignedBySuggestion = useMemo(() => {
        const map = new Map<string, ClinicDoctor[]>();
        for (const doc of unassignedDoctors) {
            const suggestion = getSuggestedDepartment(doc.specialization);
            if (suggestion) {
                const list = map.get(suggestion) || [];
                list.push(doc);
                map.set(suggestion, list);
            }
        }
        return map;
    }, [unassignedDoctors]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                        Departments
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        Organize your clinic into medical departments and assign doctors for patient discovery
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => void refreshData()}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                    <Button
                        onClick={() => openAdd()}
                        leftIcon={<Plus className="h-4 w-4" />}
                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-bold"
                    >
                        Add Department
                    </Button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                    </span>
                    <button
                        onClick={() => clearError()}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-xs font-bold uppercase"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 4 Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Departments */}
                <Card padding="md" className="flex items-center justify-between bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Departments</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{totalDepartments}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40">
                        <Building2 className="h-5 w-5" />
                    </div>
                </Card>

                {/* 2. Active Doctors */}
                <Card padding="md" className="flex items-center justify-between bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Doctors</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">{activeDoctorsList.length}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                        <Users className="h-5 w-5" />
                    </div>
                </Card>

                {/* 3. Assigned Doctors */}
                <Card padding="md" className="flex items-center justify-between bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Assigned Doctors</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{assignedCount}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                        <UserCheck className="h-5 w-5" />
                    </div>
                </Card>

                {/* 4. Unassigned Doctors */}
                <Card padding="md" className="flex items-center justify-between bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Unassigned Doctors</p>
                        <p className={`text-2xl font-black mt-1 ${unassignedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {unassignedCount}
                        </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                        <UserX className="h-5 w-5" />
                    </div>
                </Card>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <SkeletonStatsGrid count={4} />
                    <SkeletonTable rows={4} />
                </div>
            ) : totalDepartments === 0 ? (
                /* ZERO DEPARTMENTS ONBOARDING STATE */
                <div className="space-y-6">
                    {/* Compact Onboarding Card */}
                    <Card padding="lg" className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 text-center py-7 px-6 rounded-3xl shadow-sm">
                        <div className="mx-auto p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 w-fit mb-3 border border-teal-100 dark:border-teal-900/40">
                            <Building2 className="h-7 w-7" />
                        </div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                            No departments yet
                        </h2>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
                            Your active doctors are ready to be organized. Create suggested departments below or add custom departments for patient discovery.
                        </p>
                        <Button
                            className="mt-4 bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-bold"
                            onClick={() => openAdd()}
                            leftIcon={<Plus className="h-4 w-4" />}
                        >
                            Add Department
                        </Button>
                    </Card>

                    {/* DOCTORS TO ORGANIZE (SMART SUGGESTIONS) */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Doctors to Organize
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                    Assign your active doctors to departments for better clinic organization and patient discovery.
                                </p>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 w-fit">
                                {unassignedDoctors.length} unassigned
                            </span>
                        </div>

                        {/* Doctors List with Smart Suggestions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {unassignedDoctors.map((doc) => {
                                const docId = doc.id || doc.doctorId;
                                const doctorName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                                const spec = doc.specialization?.trim() || 'Specialization not provided';
                                const suggestedDept = getSuggestedDepartment(doc.specialization);
                                const matchingDept = findMatchingDepartment(suggestedDept, departments);
                                const isBusy = actionLoading === docId;

                                return (
                                    <Card
                                        key={docId}
                                        padding="md"
                                        className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-teal-300 dark:hover:border-teal-700/80 transition-all flex flex-col justify-between"
                                    >
                                        <div className="space-y-3">
                                            {/* Doctor Avatar & Identity */}
                                            <div className="flex items-start gap-3.5">
                                                <DoctorAvatar
                                                    src={doc.profile_image_url}
                                                    name={doc.name}
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                                    fallbackClassName="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                            {doctorName}
                                                        </h4>
                                                        {doc.is_approved && (
                                                            <span title="Verified Doctor">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                        {spec}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Smart Suggestion Badge Box */}
                                            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                                                        Suggested Department:
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                                        {suggestedDept || 'Custom Department'}
                                                    </span>
                                                </div>
                                                {matchingDept && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 shrink-0">
                                                        Exists
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-3 flex items-center gap-2 flex-wrap">
                                            {suggestedDept ? (
                                                matchingDept ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssignToExisting(doc, matchingDept.id, matchingDept.name)}
                                                        isLoading={isBusy}
                                                        leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5"
                                                    >
                                                        Assign to {matchingDept.name}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCreateAndAssign(doc, suggestedDept)}
                                                        isLoading={isBusy}
                                                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 shadow-sm"
                                                    >
                                                        Create {suggestedDept} &amp; Assign
                                                    </Button>
                                                )
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => openAdd({ headDoctorId: docId })}
                                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5"
                                                >
                                                    Create Department
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDoctorForChooseDept({ doctor: doc, suggestedName: suggestedDept })}
                                                className="text-xs font-bold px-3 py-1.5 text-gray-700 dark:text-gray-300"
                                            >
                                                Choose Department
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* DEPARTMENTS LIST VIEW (WHEN DEPARTMENTS EXIST) */
                <div className="space-y-6">
                    {/* Search & Status Filters */}
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="w-full md:max-w-md">
                            <Input
                                placeholder="Search by name, description or head doctor..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => (
                                <Button
                                    key={filter}
                                    size="sm"
                                    variant={statusFilter === filter ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setStatusFilter(filter);
                                        setPage(1);
                                    }}
                                    className={statusFilter === filter ? 'bg-teal-600 hover:bg-teal-700 text-white font-bold' : ''}
                                >
                                    {filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Inactive'}
                                    <span className="ml-1 text-xs opacity-75">
                                        ({filter === 'all' ? totalDepartments : filter === 'active' ? activeDepartmentsCount : inactiveDepartmentsCount})
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Section: Your Departments */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                Your Departments ({filteredDepartments.length})
                            </h2>
                        </div>

                        {paginatedDepartments.length === 0 ? (
                            <Card padding="lg" className="text-center py-12 bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl">
                                <div className="mx-auto p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 w-fit mb-3 text-gray-400">
                                    <Search className="h-6 w-6" />
                                </div>
                                <p className="text-gray-900 dark:text-gray-100 font-bold">No matching departments</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Try adjusting your search query or status filter.
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {paginatedDepartments.map((dept) => {
                                    const doctorCount = dept.doctor_count || 0;
                                    return (
                                        <Card
                                            key={dept.id}
                                            padding="md"
                                            className="flex flex-col bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-teal-300 dark:hover:border-teal-700/80 shadow-sm hover:shadow-md transition-all justify-between"
                                        >
                                            <div>
                                                {/* Card Header */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`p-2.5 rounded-2xl flex-shrink-0 ${dept.is_active ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/clinic/departments/${dept.id}`}
                                                                className="font-extrabold text-base text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 truncate block transition"
                                                            >
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

                                                {/* Description */}
                                                {dept.description && (
                                                    <p className="mt-3 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                                                        {dept.description}
                                                    </p>
                                                )}

                                                {/* Head Doctor Box */}
                                                {dept.head_doctor_name ? (
                                                    <div className="mt-3 flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                                                        <DoctorAvatar
                                                            src={dept.head_doctor_profile_image_url}
                                                            name={dept.head_doctor_name}
                                                            className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                                            fallbackClassName="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                                                👑 Head Doctor
                                                            </p>
                                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                                {dept.head_doctor_name}
                                                            </p>
                                                            {dept.head_doctor_specialization && (
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                                    {dept.head_doctor_specialization}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3 text-amber-500/70" /> No Head Doctor assigned
                                                    </p>
                                                )}

                                                {/* Assigned Doctors Count & Action */}
                                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                    <span className="font-bold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                                                        <Users className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                                        {doctorCount} Assigned Doctor{doctorCount === 1 ? '' : 's'}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedDeptForAssign(dept)}
                                                        leftIcon={<UserPlus className="h-3 w-3" />}
                                                        className="text-xs px-2.5 py-1 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-bold"
                                                    >
                                                        Manage
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card Footer Action Icons */}
                                            <div className="pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 mt-3">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => openEdit(dept)}
                                                        disabled={actionLoading === dept.id}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Edit Department"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => void handleToggleStatus(dept)}
                                                        disabled={actionLoading === dept.id}
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                        title={dept.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        <Activity className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => void handleDelete(dept)}
                                                        disabled={actionLoading === dept.id}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Delete Department"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <Link
                                                    href={`/clinic/departments/${dept.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                                >
                                                    Details <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-4">
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                />
                            </div>
                        )}
                    </div>

                    {/* Section: Doctors to Organize (Shown if unassigned doctors exist) */}
                    {unassignedDoctors.length > 0 && (
                        <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        Doctors to Organize ({unassignedDoctors.length})
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                        Assign your active doctors to departments for better clinic organization and patient discovery.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unassignedDoctors.map((doc) => {
                                    const docId = doc.id || doc.doctorId;
                                    const doctorName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                                    const spec = doc.specialization?.trim() || 'Specialization not provided';
                                    const suggestedDept = getSuggestedDepartment(doc.specialization);
                                    const matchingDept = findMatchingDepartment(suggestedDept, departments);
                                    const isBusy = actionLoading === docId;

                                    return (
                                        <Card
                                            key={docId}
                                            padding="md"
                                            className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-teal-300 dark:hover:border-teal-700/80 transition-all flex flex-col justify-between"
                                        >
                                            <div className="space-y-3">
                                                {/* Doctor Avatar & Identity */}
                                                <div className="flex items-start gap-3.5">
                                                    <DoctorAvatar
                                                        src={doc.profile_image_url}
                                                        name={doc.name}
                                                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                                        fallbackClassName="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                                {doctorName}
                                                            </h4>
                                                            {doc.is_approved && (
                                                                <span title="Verified Doctor">
                                                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                            {spec}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Smart Suggestion Badge Box */}
                                                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                                                            Suggested Department:
                                                        </span>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                                            {suggestedDept || 'Custom Department'}
                                                        </span>
                                                    </div>
                                                    {matchingDept && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 shrink-0">
                                                            Exists
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-3 flex items-center gap-2 flex-wrap">
                                                {suggestedDept ? (
                                                    matchingDept ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAssignToExisting(doc, matchingDept.id, matchingDept.name)}
                                                            isLoading={isBusy}
                                                            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                                                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5"
                                                        >
                                                            Assign to {matchingDept.name}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleCreateAndAssign(doc, suggestedDept)}
                                                            isLoading={isBusy}
                                                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 shadow-sm"
                                                        >
                                                            Create {suggestedDept} &amp; Assign
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openAdd({ headDoctorId: docId })}
                                                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5"
                                                    >
                                                        Create Department
                                                    </Button>
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setDoctorForChooseDept({ doctor: doc, suggestedName: suggestedDept })}
                                                    className="text-xs font-bold px-3 py-1.5 text-gray-700 dark:text-gray-300"
                                                >
                                                    Choose Department
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section: All Active Doctors Overview */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    Active Medical Team Roster ({activeDoctorsList.length})
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                    {assignedCount} of {activeDoctorsList.length} doctors assigned across departments
                                </p>
                            </div>
                            <Link
                                href="/clinic/doctors"
                                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                            >
                                Manage Medical Team <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeDoctorsList.map((doc) => {
                                const isAssigned = (Array.isArray(doc.departments) && doc.departments.length > 0) || Boolean(doc.department);
                                const spec = doc.specialization?.trim() || 'Specialization not provided';
                                return (
                                    <Card
                                        key={doc.id}
                                        padding="md"
                                        className="flex items-start gap-3.5 bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-teal-300 dark:hover:border-teal-700/80 transition-all shadow-sm"
                                    >
                                        <DoctorAvatar
                                            src={doc.profile_image_url}
                                            name={doc.name}
                                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                            fallbackClassName="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                    {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                                </p>
                                                {doc.is_approved && (
                                                    <span title="Verified Doctor">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                {spec}
                                            </p>
                                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                {isAssigned ? (
                                                    (doc.departments || []).map((d) => (
                                                        <span
                                                            key={d.id}
                                                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                                                        >
                                                            {d.is_head ? `👑 ${d.name}` : d.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                        Not assigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Department Form Modal */}
            <DepartmentFormModal
                open={showForm}
                onClose={() => setShowForm(false)}
                editing={editingDept}
                initialValues={formInitialValues}
                onSaved={() => void refreshData()}
            />

            {/* Manage Department Doctors Modal */}
            {selectedDeptForAssign && (
                <AssignDoctorsModal
                    open={Boolean(selectedDeptForAssign)}
                    onClose={() => setSelectedDeptForAssign(null)}
                    departmentId={selectedDeptForAssign.id}
                    departmentName={selectedDeptForAssign.name}
                    onSaved={() => void refreshData()}
                />
            )}

            {/* Choose Department Modal for a specific Doctor */}
            {doctorForChooseDept && (
                <ChooseDepartmentModal
                    open={Boolean(doctorForChooseDept)}
                    onClose={() => setDoctorForChooseDept(null)}
                    doctor={doctorForChooseDept.doctor}
                    departments={departments}
                    suggestedDeptName={doctorForChooseDept.suggestedName}
                    onAssigned={() => void refreshData()}
                    onCreateNew={(prefillName) => {
                        setDoctorForChooseDept(null);
                        openAdd({
                            name: prefillName || '',
                            headDoctorId: doctorForChooseDept.doctor.id || doctorForChooseDept.doctor.doctorId,
                        });
                    }}
                />
            )}

            {/* Confirmation Dialog */}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
