'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    Building2, Users, CalendarDays, CalendarClock, CheckCircle2, XCircle,
    ArrowLeft, Edit2, Trash2, Activity, AlertCircle, RefreshCw, Stethoscope,
    ShieldCheck, MapPin, Video, Phone, Home, Clock, Star, AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonStatsGrid, SkeletonTable } from '@/components/ui/Skeleton';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { DepartmentFormModal, DepartmentFormValue } from '@/components/clinic/DepartmentFormModal';
import { useClinicStore } from '@/stores/clinicStore';
import type { DepartmentDoctorMember } from '@/stores/clinicStore';

const MODE_LABELS: Record<string, string> = {
    in_clinic: 'In-Clinic',
    video: 'Video',
    home: 'Home Visit',
    phone: 'Phone',
    audio: 'Phone',
};

const modeLabel = (mode: string) => MODE_LABELS[mode] || mode.replace(/_/g, ' ');

const practiceTypeLabel = (practiceType: string) =>
    practiceType === 'visiting' ? 'Visiting'
    : practiceType === 'part_time' ? 'Part-Time'
    : practiceType === 'contract' ? 'Contract'
    : 'Full-Time';

export default function ClinicDepartmentDetailPage() {
    const params = useParams<{ departmentId: string }>();
    const departmentId = params.departmentId;

    const {
        departmentDetail, loadingDepartmentDetail, error,
        fetchDepartmentDetail, deleteDepartment, clearError,
    } = useClinicStore();
    const toast = useToast();
    const { dialogProps, confirm } = useConfirmDialog();

    const [showForm, setShowForm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (departmentId) fetchDepartmentDetail(departmentId);
    }, [departmentId, fetchDepartmentDetail]);

    const openEdit = () => {
        setShowForm(true);
    };

    const handleToggleStatus = async () => {
        if (!departmentDetail) return;
        setActionLoading(true);
        const success = await useClinicStore.getState().updateDepartment(
            departmentDetail.id,
            { is_active: !departmentDetail.is_active },
        );
        setActionLoading(false);
        if (success) {
            toast.success(departmentDetail.is_active ? 'Department Deactivated' : 'Department Activated',
                departmentDetail.is_active ? 'This department is now inactive' : 'This department is now active');
            fetchDepartmentDetail(departmentDetail.id);
        } else {
            toast.error('Error', 'Failed to update department status');
        }
    };

    const handleDelete = async () => {
        if (!departmentDetail) return;
        const confirmed = await confirm({
            title: 'Delete Department',
            message: `Delete "${departmentDetail.name}"? This cannot be undone and will remove the department from your clinic.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(true);
        const success = await deleteDepartment(departmentDetail.id);
        setActionLoading(false);
        if (success) {
            toast.success('Department Deleted', `"${departmentDetail.name}" has been removed`);
            window.location.href = '/clinic/departments';
        } else {
            toast.error('Error', 'Failed to delete department');
        }
    };

    if (loadingDepartmentDetail && !departmentDetail) {
        return (
            <div className="space-y-6">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <SkeletonStatsGrid count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2"><SkeletonTable rows={4} /></div>
                    <SkeletonTable rows={4} />
                </div>
            </div>
        );
    }

    if (error && !departmentDetail) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium">Failed to load department</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { clearError(); if (departmentId) fetchDepartmentDetail(departmentId); }}
                        leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
                    <Link href="/clinic/departments">
                        <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to Departments</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!departmentDetail) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                    <Building2 className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-700 dark:text-gray-200 font-medium">Department not found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">It may have been removed or you don&apos;t have access.</p>
                <Link href="/clinic/departments">
                    <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to Departments</Button>
                </Link>
            </div>
        );
    }

    const dept = departmentDetail;
    const head = dept.head_doctor;

    const metrics = [
        { label: 'Doctors', value: dept.doctors.length, icon: Users, accent: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
        { label: "Today's Appointments", value: dept.appointments.today, icon: CalendarDays, accent: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' },
        { label: 'Upcoming', value: dept.appointments.upcoming, icon: CalendarClock, accent: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' },
        { label: 'Completed', value: dept.appointments.completed, icon: CheckCircle2, accent: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' },
    ];

    const DoctorRow = ({ doctor }: { doctor: DepartmentDoctorMember }) => (
        <div className="flex items-center gap-3 py-3 px-1">
            {doctor.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doctor.profile_image_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
            ) : (
                <div className="h-11 w-11 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
                    </p>
                    {doctor.is_head && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            Head
                        </span>
                    )}
                    {doctor.verification === 'verified' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {doctor.specialization}
                    {doctor.experience_years > 0 && ` \u2022 ${doctor.experience_years} yrs exp`}
                    {doctor.rating != null && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 ml-1">
                            <Star className="h-3 w-3 fill-current" /> {doctor.rating}
                        </span>
                    )}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{practiceTypeLabel(doctor.practice_type)}</span>
                    {doctor.consultation_modes.map((mode) => (
                        <span key={mode} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {modeLabel(mode)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <Link href="/clinic/departments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                <ArrowLeft className="h-4 w-4" /> Back to Departments
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${dept.is_active ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Building2 className={`h-6 w-6 ${dept.is_active ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dept.name}</h1>
                            <StatusBadge status={dept.is_active ? 'active' : 'inactive'} size="sm" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Created {new Date(dept.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={openEdit} leftIcon={<Edit2 className="h-4 w-4" />}>Edit</Button>
                    <Button
                        variant="secondary"
                        onClick={handleToggleStatus}
                        isLoading={actionLoading}
                        leftIcon={<Activity className="h-4 w-4" />}
                    >
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3">
                    <span>{error}</span>
                    <button onClick={() => clearError()} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 text-xs font-semibold uppercase">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                    <Card key={metric.label} padding="md" className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metric.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${metric.accent}`}>
                            <metric.icon className="h-5 w-5" />
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {dept.description && (
                        <Card padding="md">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">About</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{dept.description}</p>
                        </Card>
                    )}

                    <Card padding="md">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Doctors ({dept.doctors.length})</h3>
                            <Link href="/clinic/doctors" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                                Manage doctors
                            </Link>
                        </div>
                        {dept.doctors.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-10 w-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                <p className="text-gray-600 dark:text-gray-300 font-medium">No doctors assigned yet</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Assign a head doctor or link doctors to this department from the doctors page.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {dept.doctors.map((doctor) => (
                                    <DoctorRow key={doctor.doctor_id} doctor={doctor} />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Department Head</h3>
                        {head ? (
                            <div className="flex items-center gap-3">
                                {head.profile_image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={head.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                        <Stethoscope className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {head.name.startsWith('Dr.') ? head.name : `Dr. ${head.name}`}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{head.specialization}</p>
                                    {head.verification === 'verified' ? (
                                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                                            <ShieldCheck className="h-3 w-3" /> Verified
                                        </p>
                                    ) : (
                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-0.5">
                                            <AlertTriangle className="h-3 w-3" /> Pending verification
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No head doctor assigned. Edit this department to assign one.</p>
                                <Button size="sm" className="mt-3" onClick={openEdit} leftIcon={<Edit2 className="h-4 w-4" />}>Assign Head</Button>
                            </div>
                        )}
                    </Card>

                    <Card padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Appointments</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Today</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{dept.appointments.today}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Upcoming</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{dept.appointments.upcoming}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Completed</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{dept.appointments.completed}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><XCircle className="h-4 w-4" /> Cancelled</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{dept.appointments.cancelled}</span>
                            </div>
                        </div>
                    </Card>

                    <Card padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Consultation Modes</h3>
                        {(dept.consultation_modes || []).length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Modes are derived from assigned doctors.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(dept.consultation_modes || []).map((mode) => (
                                    <span key={mode} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                        {mode === 'video' ? <Video className="h-3.5 w-3.5" />
                                            : mode === 'home' ? <Home className="h-3.5 w-3.5" />
                                            : mode === 'phone' || mode === 'audio' ? <Phone className="h-3.5 w-3.5" />
                                            : <MapPin className="h-3.5 w-3.5" />}
                                        {modeLabel(mode)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Schedule</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            Department availability is based on the assigned doctors&apos; individual schedules.
                        </p>
                        <Link href="/clinic/schedule" className="inline-block mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                            View doctor schedules
                        </Link>
                    </Card>

                    {dept.contact_extension && (
                        <Card padding="md">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Contact</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" /> Extension {dept.contact_extension}
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            <DepartmentFormModal
                open={showForm}
                onClose={() => setShowForm(false)}
                editing={{
                    id: dept.id,
                    name: dept.name || '',
                    headDoctorId: dept.head_doctor_id || '',
                    description: dept.description || '',
                    contactExtension: dept.contact_extension || '',
                    isActive: dept.is_active !== false,
                }}
                onSaved={() => fetchDepartmentDetail(dept.id)}
            />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
