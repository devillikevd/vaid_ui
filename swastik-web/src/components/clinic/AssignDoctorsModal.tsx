'use client';

import { useEffect, useState } from 'react';
import { X, Search, Check, ShieldCheck, Stethoscope, Users, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';
import { DoctorAvatar } from '@/components/shared/DoctorAvatar';

interface AvailableDoctorItem {
    doctor_id: string;
    name: string;
    specialization: string;
    profile_image_url: string | null;
    is_approved: boolean;
    verification: string;
    rating: number | null;
    total_reviews: number;
    experience_years: number;
    joined_at: string | null;
    is_assigned: boolean;
    is_head: boolean;
}

interface AssignDoctorsModalProps {
    open: boolean;
    onClose: () => void;
    departmentId: string;
    departmentName: string;
    onSaved?: () => void;
}

export function AssignDoctorsModal({
    open,
    onClose,
    departmentId,
    departmentName,
    onSaved,
}: AssignDoctorsModalProps) {
    const { fetchAvailableDoctorsForDepartment, setDepartmentDoctors } = useClinicStore();
    const toast = useToast();

    const [doctors, setDoctors] = useState<AvailableDoctorItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!open || !departmentId) return;
        let isMounted = true;
        setLoading(true);
        setSearch('');

        fetchAvailableDoctorsForDepartment(departmentId)
            .then((data) => {
                if (!isMounted) return;
                setDoctors(data || []);
                const assigned = new Set<string>();
                (data || []).forEach((d) => {
                    if (d.is_assigned) assigned.add(d.doctor_id);
                });
                setSelectedIds(assigned);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [open, departmentId, fetchAvailableDoctorsForDepartment]);

    if (!open) return null;

    const filteredDoctors = doctors.filter((doc) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            doc.name.toLowerCase().includes(q) ||
            (doc.specialization || '').toLowerCase().includes(q)
        );
    });

    const toggleDoctor = (doctorId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(doctorId)) {
                next.delete(doctorId);
            } else {
                next.add(doctorId);
            }
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        const doctorIds = Array.from(selectedIds);
        const success = await setDepartmentDoctors(departmentId, doctorIds);
        setSaving(false);

        if (success) {
            toast.success(
                'Department Team Updated',
                `Assigned ${doctorIds.length} doctor${doctorIds.length === 1 ? '' : 's'} to ${departmentName}`
            );
            onSaved?.();
            onClose();
        } else {
            toast.error('Error', 'Failed to update department assignments');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <Card padding="lg" className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            Assign Doctors to {departmentName}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Select doctors from your active clinic medical roster
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search & Counter */}
                <div className="py-3 space-y-2">
                    <Input
                        placeholder="Search doctors by name or specialization..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                        <span>
                            {selectedIds.size} of {doctors.length} doctor{doctors.length === 1 ? '' : 's'} assigned
                        </span>
                        {doctors.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set(doctors.map((d) => d.doctor_id)))}
                                    className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                                >
                                    Select All
                                </button>
                                <span>•</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-gray-500 hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Doctors List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1 my-1">
                    {loading ? (
                        <div className="py-12 text-center text-gray-400 text-sm animate-pulse flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                            <span>Loading active doctors...</span>
                        </div>
                    ) : filteredDoctors.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                            {search.trim() ? (
                                <p className="text-sm">No doctors match &quot;{search}&quot;</p>
                            ) : (
                                <div className="space-y-1">
                                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                    <p className="text-sm font-medium">No active affiliated doctors found</p>
                                    <p className="text-xs text-gray-400">Invite or accept doctors into your clinic first.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredDoctors.map((doc) => {
                            const isSelected = selectedIds.has(doc.doctor_id);
                            return (
                                <div
                                    key={doc.doctor_id}
                                    onClick={() => toggleDoctor(doc.doctor_id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition select-none ${
                                        isSelected
                                            ? 'bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/60'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <DoctorAvatar
                                        src={doc.profile_image_url}
                                        name={doc.name}
                                        className="h-10 w-10 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                                        fallbackClassName="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-teal-200 dark:border-teal-800"
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                                            </span>
                                            {doc.is_head && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                                                    Head
                                                </span>
                                            )}
                                            {doc.verification === 'verified' && (
                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {doc.specialization?.trim() || 'Specialization not provided'}
                                            {doc.experience_years > 0 && ` • ${doc.experience_years} yrs exp`}
                                        </p>
                                    </div>

                                    {/* Checkbox badge */}
                                    <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition flex-shrink-0 ${
                                            isSelected
                                                ? 'bg-teal-600 text-white'
                                                : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-transparent'
                                        }`}
                                    >
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            isLoading={saving}
                            disabled={loading}
                            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                        >
                            Save Assignments
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
