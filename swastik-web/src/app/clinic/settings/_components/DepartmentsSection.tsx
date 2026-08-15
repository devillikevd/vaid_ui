'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Building2, Loader2, Pencil, Plus, RefreshCw, Save, Stethoscope, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { clinicApi } from '@/lib/api';
import { SettingsSection, SectionLoader, StatusMessage, type SectionStatus } from './SettingsSection';

interface Department {
    id: string;
    name: string;
    description: string | null;
    head_doctor_id: string | null;
    head_doctor_name: string | null;
    head_doctor_specialization: string | null;
    is_active: boolean;
    created_at: string | null;
}

interface DoctorOption {
    id: string;
    name: string;
    specialization: string;
}

const EMPTY_FORM = { name: '', description: '', head_doctor_id: '' };

export function DepartmentsSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setStatus(null);
        try {
            const [deptRes, doctorRes] = await Promise.all([
                clinicApi.getDepartments(),
                clinicApi.getDoctors({ page: 1, limit: 100 }),
            ]);
            if (deptRes.success) {
                setDepartments((deptRes.data as Department[]) || []);
            } else {
                setLoadError(deptRes.error || 'Failed to load departments');
            }
            if (doctorRes.success) {
                const items = (doctorRes as any).data as DoctorOption[] | undefined;
                setDoctors(
                    (items || [])
                        .filter((d) => d.id)
                        .map((d) => ({ id: d.id, name: d.name, specialization: d.specialization }))
                );
            }
        } catch {
            setLoadError('Failed to connect to server.');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        onDirtyChange(formOpen);
    }, [formOpen, onDirtyChange]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setFormOpen(false);
        setStatus(null);
    };

    const nameExists = (name: string, excludeId?: string) =>
        departments.some(
            (dept) =>
                dept.name.trim().toLowerCase() === name.trim().toLowerCase() &&
                dept.id !== excludeId
        );

    const handleSave = async () => {
        const name = form.name.trim();
        if (!name) {
            setStatus({ type: 'error', message: 'Department name is required.' });
            return;
        }
        if (nameExists(name, editingId || undefined)) {
            setStatus({ type: 'error', message: 'A department with this name already exists.' });
            return;
        }
        setIsSaving(true);
        setStatus(null);
        try {
            const payload = {
                name,
                description: form.description.trim() || undefined,
                head_doctor_id: form.head_doctor_id || null,
            };
            const res = editingId
                ? await clinicApi.updateDepartment(editingId, payload)
                : await clinicApi.addDepartment(payload);
            if (res.success) {
                setStatus({ type: 'success', message: editingId ? 'Department updated.' : 'Department added.' });
                resetForm();
                void fetchAll();
            } else {
                setStatus({ type: 'error', message: res.error || 'Failed to save department.' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsSaving(false);
    };

    const handleDelete = async (dept: Department) => {
        const ok = await confirm({
            title: `Delete "${dept.name}"?`,
            message: 'Doctors assigned to this department will remain in your clinic roster. This action cannot be undone.',
            confirmLabel: 'Delete Department',
            variant: 'danger',
        });
        if (!ok) return;
        setDeletingId(dept.id);
        setStatus(null);
        try {
            const res = await clinicApi.deleteDepartment(dept.id);
            setStatus({
                type: res.success ? 'success' : 'error',
                message: res.success ? 'Department deleted.' : res.error || 'Failed to delete department.',
            });
            if (res.success) void fetchAll();
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setDeletingId(null);
    };

    const startEdit = (dept: Department) => {
        setEditingId(dept.id);
        setForm({
            name: dept.name,
            description: dept.description || '',
            head_doctor_id: dept.head_doctor_id || '',
        });
        setFormOpen(true);
        setStatus(null);
    };

    return (
        <SettingsSection
            id="departments"
            title="Departments"
            description="Specialities offered at your clinic. Doctors can be assigned as department heads."
            icon={<Building2 className="h-5 w-5" />}
            actions={
                <Button
                    size="sm"
                    variant={formOpen ? 'outline' : 'primary'}
                    onClick={() => {
                        if (formOpen) {
                            resetForm();
                        } else {
                            setFormOpen(true);
                        }
                    }}
                    leftIcon={formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                >
                    {formOpen ? 'Close Form' : 'Add Department'}
                </Button>
            }
        >
            {isLoading ? (
                <SectionLoader />
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-10">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchAll()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <StatusMessage status={status} />

                    {formOpen && (
                        <div className="space-y-4 rounded-xl border border-primary-200 dark:border-primary-700/50 bg-primary-50/50 dark:bg-primary-900/10 p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {editingId ? 'Edit Department' : 'Add Department'}
                            </h4>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Input
                                    label="Name *"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. General Medicine"
                                />
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                                        Head Doctor
                                    </label>
                                    <select
                                        value={form.head_doctor_id}
                                        onChange={(e) => setForm((prev) => ({ ...prev, head_doctor_id: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    >
                                        <option value="">No head doctor assigned</option>
                                        {doctors.map((doctor) => (
                                            <option key={doctor.id} value={doctor.id}>
                                                {doctor.name}
                                                {doctor.specialization ? ` — ${doctor.specialization}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {doctors.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-400">No doctors in your roster yet.</p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <Input
                                        label="Description"
                                        value={form.description}
                                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="What does this department do?"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => void handleSave()} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                                    {editingId ? 'Save Changes' : 'Add Department'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {departments.length === 0 && !formOpen ? (
                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                            <Stethoscope className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                No departments yet. Add your first department to structure your clinic.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700">
                            {departments.map((dept) => (
                                <li key={dept.id} className="flex items-start justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{dept.name}</h4>
                                        </div>
                                        {dept.description && (
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dept.description}</p>
                                        )}
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <Stethoscope className="h-3.5 w-3.5 text-primary-600" />
                                            {dept.head_doctor_name
                                                ? `Head: ${dept.head_doctor_name}${dept.head_doctor_specialization ? ` (${dept.head_doctor_specialization})` : ''}`
                                                : 'No head doctor assigned'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            aria-label={`Edit ${dept.name}`}
                                            onClick={() => startEdit(dept)}
                                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Delete ${dept.name}`}
                                            onClick={() => void handleDelete(dept)}
                                            disabled={deletingId === dept.id}
                                            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                        >
                                            {deletingId === dept.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <ConfirmDialog {...dialogProps} />
                </div>
            )}
        </SettingsSection>
    );
}
