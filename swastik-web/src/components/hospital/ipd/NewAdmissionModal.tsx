'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    BedDouble,
    User,
    Stethoscope,
    Building2,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Calendar,
    FileText
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface NewAdmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdmissionCreated: () => void;
    doctors: { id: string; name: string; specialization?: string; departmentId?: string; departmentName?: string }[];
    departments: { id: string; name: string }[];
    wards: { id: string; name: string; ward_type?: string; total_beds?: number; occupied_beds?: number }[];
    beds: { id: string; bed_number: string; bed_type?: string; ward_id?: string; status?: string }[];
}

export function NewAdmissionModal({
    isOpen,
    onClose,
    onAdmissionCreated,
    doctors,
    departments,
    wards,
    beds,
}: NewAdmissionModalProps) {
    const [patientId, setPatientId] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedBed, setSelectedBed] = useState('');
    const [admissionType, setAdmissionType] = useState('elective');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [expectedDischargeDate, setExpectedDischargeDate] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter available beds based on selected ward
    const availableBeds = selectedWard
        ? beds.filter((b) => b.ward_id === selectedWard && b.status === 'available')
        : beds.filter((b) => b.status === 'available');

    // Filter doctors based on department
    const filteredDoctors = selectedDepartment
        ? doctors.filter(
              (d) =>
                  d.departmentId === selectedDepartment ||
                  d.departmentName?.toLowerCase() === departments.find((dp) => dp.id === selectedDepartment)?.name.toLowerCase()
          )
        : doctors;

    useEffect(() => {
        if (isOpen) {
            setPatientId('');
            setSelectedDepartment('');
            setSelectedDoctor('');
            setSelectedWard('');
            setSelectedBed('');
            setAdmissionType('elective');
            setChiefComplaint('');
            setProvisionalDiagnosis('');
            setBloodGroup('');
            setExpectedDischargeDate('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!patientId.trim()) {
            setError('Please enter a valid Patient ID or UHID.');
            return;
        }

        setLoading(true);
        try {
            const payload: Record<string, any> = {
                patientId: patientId.trim(),
                departmentId: selectedDepartment || undefined,
                admittingDoctorId: selectedDoctor || undefined,
                attendingDoctorId: selectedDoctor || undefined,
                wardId: selectedWard || undefined,
                bedId: selectedBed || undefined,
                admissionType,
                chiefComplaint: chiefComplaint.trim() || undefined,
                provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
                bloodGroup: bloodGroup || undefined,
                expectedDischargeDate: expectedDischargeDate || undefined,
            };

            const res = await hospitalApi.createAdmission(payload);
            if (res.success) {
                onAdmissionCreated();
                onClose();
            } else {
                setError(res.message || res.error || 'Failed to create admission record.');
            }
        } catch (err: any) {
            setError(err.message || 'A network error occurred while processing admission.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                            <BedDouble className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Inpatient Admission
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Register and allocate ward/bed for hospital inpatient care.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Patient & Admission Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Patient UUID or ID <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Patient ID"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Admission Type
                            </label>
                            <select
                                value={admissionType}
                                onChange={(e) => setAdmissionType(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="elective">Elective / Planned</option>
                                <option value="emergency">Emergency IPD</option>
                                <option value="transfer_in">Transfer In</option>
                                <option value="day_care">Day Care</option>
                            </select>
                        </div>
                    </div>

                    {/* Department & Attending Doctor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Department (Optional)
                            </label>
                            <select
                                value={selectedDepartment}
                                onChange={(e) => {
                                    setSelectedDepartment(e.target.value);
                                    setSelectedDoctor('');
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Attending Physician
                            </label>
                            <select
                                value={selectedDoctor}
                                onChange={(e) => setSelectedDoctor(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                            >
                                <option value="">Select Doctor</option>
                                {filteredDoctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Ward & Bed Assignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Assign Ward
                            </label>
                            <select
                                value={selectedWard}
                                onChange={(e) => {
                                    setSelectedWard(e.target.value);
                                    setSelectedBed('');
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">Select Ward</option>
                                {wards.map((w) => {
                                    const avail = Math.max(0, (w.total_beds || 0) - (w.occupied_beds || 0));
                                    return (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.ward_type || 'Ward'}) — Avail: {avail}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Assign Bed
                            </label>
                            <select
                                value={selectedBed}
                                onChange={(e) => setSelectedBed(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                            >
                                <option value="">Select Available Bed</option>
                                {availableBeds.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        Bed {b.bed_number} ({b.bed_type || 'General'})
                                    </option>
                                ))}
                            </select>
                            {selectedWard && availableBeds.length === 0 && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                    No available beds in the selected ward.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Clinical Details */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                        <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                Chief Complaint / Admission Reason
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Acute severe abdominal pain, persistent fever"
                                value={chiefComplaint}
                                onChange={(e) => setChiefComplaint(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                    Provisional Diagnosis
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acute Appendicitis"
                                    value={provisionalDiagnosis}
                                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                    Blood Group
                                </label>
                                <select
                                    value={bloodGroup}
                                    onChange={(e) => setBloodGroup(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                                >
                                    <option value="">Unknown</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-600 dark:text-slate-400 mb-1">
                                Expected Discharge Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={expectedDischargeDate}
                                onChange={(e) => setExpectedDischargeDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Create Admission</span>
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
