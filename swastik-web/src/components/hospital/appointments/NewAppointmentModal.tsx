'use client';

import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, User, Phone, Stethoscope, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { hospitalApi } from '@/lib/api';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doctors: any[];
    departments: any[];
}

const COMMON_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

export function NewAppointmentModal({
    isOpen,
    onClose,
    onSuccess,
    doctors,
    departments,
}: NewAppointmentModalProps) {
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientGender, setPatientGender] = useState('male');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState('10:00');
    const [type, setType] = useState('hospital');
    const [reason, setReason] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter doctors by selected department if department is selected
    const filteredDoctors = useMemo(() => {
        if (!selectedDepartment) return doctors;
        return doctors.filter(doc => (doc.department || doc.specialization || '').toLowerCase() === selectedDepartment.toLowerCase());
    }, [doctors, selectedDepartment]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName.trim() || !patientPhone.trim() || !selectedDoctorId || !date || !timeSlot) {
            setError('Please complete all required fields (Patient Name, Phone, Doctor, Date, Time Slot).');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await hospitalApi.createAppointment({
                patientName: patientName.trim(),
                patientPhone: patientPhone.trim(),
                gender: patientGender,
                doctorId: selectedDoctorId,
                date,
                timeSlot,
                type,
                reason: reason.trim() || 'Walk-in Consultation',
            });

            if (res.success) {
                onSuccess();
                onClose();
            } else {
                setError(res.error || 'Failed to create appointment. Please check slot availability.');
            }
        } catch (err: any) {
            setError(err?.message || 'A network error occurred while booking.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left shadow-2xl transition-all w-full max-w-lg border border-slate-200 dark:border-gray-800">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                New OPD Appointment / Walk-In
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Register a new patient booking at the hospital reception
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
                        {error && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Patient Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Patient Name *
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        placeholder="Full name"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Patient Phone *
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        placeholder="10-digit mobile"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gender & Modality */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Gender
                                </label>
                                <select
                                    value={patientGender}
                                    onChange={(e) => setPatientGender(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Consultation Mode
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="hospital">In-Person (OPD Desk)</option>
                                    <option value="video">Teleconsultation (Video)</option>
                                </select>
                            </div>
                        </div>

                        {/* Department & Doctor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Department
                                </label>
                                <div className="relative">
                                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => {
                                            setSelectedDepartment(e.target.value);
                                            setSelectedDoctorId('');
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((d: any) => (
                                            <option key={d.id || d.name} value={d.name}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Attending Doctor *
                                </label>
                                <div className="relative">
                                    <Stethoscope className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <select
                                        value={selectedDoctorId}
                                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                        required
                                    >
                                        <option value="">Select Doctor</option>
                                        {filteredDoctors.map((doc: any) => (
                                            <option key={doc.id} value={doc.id}>
                                                Dr. {doc.name} ({doc.specialization || 'General'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Date & Time Slot */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Date *
                                </label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="date"
                                        value={date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Time Slot *
                                </label>
                                <div className="relative">
                                    <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <select
                                        value={timeSlot}
                                        onChange={(e) => setTimeSlot(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                                        required
                                    >
                                        {COMMON_TIME_SLOTS.map((slot) => {
                                            const hour = parseInt(slot.split(':')[0], 10);
                                            const minute = slot.split(':')[1];
                                            const ampm = hour >= 12 ? 'PM' : 'AM';
                                            const displayHour = hour % 12 || 12;
                                            return (
                                                <option key={slot} value={slot}>
                                                    {displayHour}:{minute} {ampm}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Reason / Notes */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Reason for Visit (Optional)
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g. Fever, Follow-up, Routine checkup..."
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading ? 'Booking...' : 'Create Appointment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
