'use client';

import { useState } from 'react';
import { X, Building2, Plus, Check, ShieldCheck, Users, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';
import type { Department, ClinicDoctor } from '@/stores/clinicStore';

interface ChooseDepartmentModalProps {
    open: boolean;
    onClose: () => void;
    doctor: ClinicDoctor | null;
    departments: Department[];
    suggestedDeptName?: string | null;
    onAssigned?: () => void;
    onCreateNew?: (prefillName?: string) => void;
}

export function ChooseDepartmentModal({
    open,
    onClose,
    doctor,
    departments,
    suggestedDeptName,
    onAssigned,
    onCreateNew,
}: ChooseDepartmentModalProps) {
    const { assignDoctorToDepartment } = useClinicStore();
    const toast = useToast();

    const [selectedDeptId, setSelectedDeptId] = useState<string>('');
    const [saving, setSaving] = useState(false);

    if (!open || !doctor) return null;

    const activeDepartments = (departments || []).filter((d) => d.is_active !== false);
    const doctorId = doctor.id || doctor.doctorId;
    const doctorName = doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;
    const specialization = doctor.specialization?.trim() || 'Specialization not provided';

    const handleAssign = async () => {
        if (!selectedDeptId || !doctorId) return;
        setSaving(true);
        const success = await assignDoctorToDepartment(selectedDeptId, doctorId);
        setSaving(false);

        if (success) {
            const targetDept = activeDepartments.find((d) => d.id === selectedDeptId);
            toast.success(
                'Doctor Assigned',
                `${doctorName} has been assigned to ${targetDept?.name || 'the department'}`
            );
            onAssigned?.();
            onClose();
        } else {
            toast.error('Error', 'Failed to assign doctor to department');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <Card
                padding="lg"
                className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            Assign Doctor to Department
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                            Select an active clinic department for this doctor
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Doctor Info Card */}
                <div className="p-3.5 my-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex items-center gap-3">
                    <DoctorAvatar
                        src={doctor.profile_image_url}
                        name={doctor.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                        fallbackClassName="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold text-sm flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                {doctorName}
                            </h3>
                            {doctor.is_approved && (
                                <span title="Verified Doctor">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-medium text-teal-700 dark:text-teal-400 truncate">
                            {specialization}
                        </p>
                    </div>
                </div>

                {/* Departments Radio List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">
                        Available Active Departments ({activeDepartments.length})
                    </p>

                    {activeDepartments.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 space-y-2">
                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                No active departments found
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                Create a department to organize this doctor.
                            </p>
                        </div>
                    ) : (
                        activeDepartments.map((dept) => {
                            const isSelected = selectedDeptId === dept.id;
                            const isAlreadyAssigned = (doctor.departments || []).some((d) => d.id === dept.id);
                            const isHead = dept.head_doctor_id === doctorId;

                            return (
                                <div
                                    key={dept.id}
                                    onClick={() => {
                                        if (!isAlreadyAssigned) setSelectedDeptId(dept.id);
                                    }}
                                    className={`flex items-center justify-between p-3.5 rounded-2xl transition select-none ${
                                        isAlreadyAssigned
                                            ? 'bg-gray-50 dark:bg-gray-800/30 opacity-60 cursor-not-allowed border border-transparent'
                                            : isSelected
                                            ? 'bg-teal-50/80 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 cursor-pointer shadow-sm'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200/70 dark:border-gray-800 cursor-pointer'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition shrink-0 ${
                                                isSelected
                                                    ? 'bg-teal-600 text-white'
                                                    : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                            }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                    {dept.name}
                                                </span>
                                                {isHead && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                                                        Head
                                                    </span>
                                                )}
                                                {isAlreadyAssigned && (
                                                    <span className="text-[10px] font-semibold text-gray-500">
                                                        (Already Member)
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-2 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> {dept.doctor_count || 0} doctors
                                                </span>
                                                {dept.head_doctor_name && (
                                                    <span>• Head: {dept.head_doctor_name}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Action to create new department */}
                <div className="pt-3">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onCreateNew?.(suggestedDeptName || undefined);
                        }}
                        className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-teal-300 dark:border-teal-800 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-teal-700 dark:text-teal-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Department {suggestedDeptName ? `("${suggestedDeptName}")` : ''}</span>
                    </button>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 mt-3">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssign}
                        isLoading={saving}
                        disabled={!selectedDeptId}
                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-bold"
                    >
                        Assign Doctor
                    </Button>
                </div>
            </Card>
        </div>
    );
}
