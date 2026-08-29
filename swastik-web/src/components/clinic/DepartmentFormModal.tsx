'use client';

import { useEffect, useState } from 'react';
import { X, Phone, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';

interface DepartmentFormModalProps {
    open: boolean;
    onClose: () => void;
    editing?: (DepartmentFormValue & { id: string }) | null;
    initialValues?: Partial<DepartmentFormValue> | null;
    onSaved?: () => void;
}

export interface DepartmentFormValue {
    name: string;
    headDoctorId: string;
    description: string;
    contactExtension: string;
    isActive: boolean;
}

export function DepartmentFormModal({ open, onClose, editing, initialValues, onSaved }: DepartmentFormModalProps) {
    const { doctors, addDepartment, updateDepartment } = useClinicStore();
    const toast = useToast();

    const [form, setForm] = useState<DepartmentFormValue>({
        name: '',
        headDoctorId: '',
        description: '',
        contactExtension: '',
        isActive: true,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                name: editing.name || '',
                headDoctorId: editing.headDoctorId || '',
                description: editing.description || '',
                contactExtension: editing.contactExtension || '',
                isActive: editing.isActive !== false,
            });
        } else if (initialValues) {
            setForm({
                name: initialValues.name || '',
                headDoctorId: initialValues.headDoctorId || '',
                description: initialValues.description || '',
                contactExtension: initialValues.contactExtension || '',
                isActive: initialValues.isActive !== false,
            });
        } else {
            setForm({ name: '', headDoctorId: '', description: '', contactExtension: '', isActive: true });
        }
    }, [open, editing, initialValues]);

    if (!open) return null;

    const handleSubmit = async () => {
        const name = form.name.trim();
        if (!name) return;
        setSaving(true);
        const payload = {
            name,
            headDoctorId: form.headDoctorId || undefined,
            description: form.description.trim() || undefined,
            contact_extension: form.contactExtension.trim() || undefined,
            is_active: form.isActive,
        };
        const success = editing
            ? await updateDepartment(editing.id, payload)
            : await addDepartment(payload);
        setSaving(false);
        if (success) {
            toast.success(editing ? 'Department Updated' : 'Department Added',
                editing ? 'Department updated successfully' : 'New department added');
            onSaved?.();
            onClose();
        } else {
            toast.error('Error', 'Failed to save department');
        }
    };

    const set = <K extends keyof DepartmentFormValue>(key: K, value: DepartmentFormValue[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <Card padding="lg" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {editing ? 'Edit Department' : 'Add Department'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-3">
                    <Input
                        label="Department Name *"
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="e.g. Cardiology, ENT, Pediatrics"
                        maxLength={120}
                    />
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                            Head of Department
                        </label>
                        <select
                            value={form.headDoctorId}
                            onChange={(e) => set('headDoctorId', e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        >
                            <option value="">No head doctor selected</option>
                            {doctors.map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name}{doctor.specialization ? ` \u2022 ${doctor.specialization}` : ''}
                                </option>
                            ))}
                        </select>
                        {doctors.length === 0 && (
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                No active doctors yet. Add doctors first, then assign a head.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder="Overview of the department"
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>
                    <Input
                        label="Contact Extension"
                        value={form.contactExtension}
                        onChange={(e) => set('contactExtension', e.target.value)}
                        placeholder="e.g. 204"
                        leftIcon={<Phone className="h-4 w-4" />}
                    />
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                            Status
                        </label>
                        <select
                            value={form.isActive ? 'active' : 'inactive'}
                            onChange={(e) => set('isActive', e.target.value === 'active')}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={saving} disabled={!form.name.trim()}
                        leftIcon={editing ? undefined : <Stethoscope className="h-4 w-4" />}>
                        {editing ? 'Update' : 'Add'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
