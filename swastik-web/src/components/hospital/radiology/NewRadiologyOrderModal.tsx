'use client';

import React, { useState } from 'react';
import {
    X,
    ScanLine,
    Calendar,
    User,
    Building2,
    Stethoscope,
    AlertCircle,
    Check,
    Loader2,
    AlertTriangle,
    Clock,
    Sparkles
} from 'lucide-react';

interface NewRadiologyOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, any>) => Promise<boolean>;
    admissions: any[];
    doctors: any[];
}

export function NewRadiologyOrderModal({
    isOpen,
    onClose,
    onSubmit,
    admissions,
    doctors,
}: NewRadiologyOrderModalProps) {
    const [admissionId, setAdmissionId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [orderingDoctorId, setOrderingDoctorId] = useState('');
    const [modality, setModality] = useState('xray');
    const [bodyPart, setBodyPart] = useState('Chest');
    const [laterality, setLaterality] = useState('na');
    const [studyDescription, setStudyDescription] = useState('Chest X-Ray PA View');
    const [priority, setPriority] = useState('routine');
    const [contrastRequired, setContrastRequired] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [clinicalIndication, setClinicalIndication] = useState('');
    const [patientPreparation, setPatientPreparation] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdmissionSelect = (admId: string) => {
        setAdmissionId(admId);
        const adm = admissions.find((a) => a.id === admId);
        if (adm?.patient_id) {
            setPatientId(adm.patient_id);
        } else if (adm?.patient?.id) {
            setPatientId(adm.patient.id);
        }
        if (adm?.attending_doctor_id) {
            setOrderingDoctorId(adm.attending_doctor_id);
        } else if (adm?.attendingDoctor?.id) {
            setOrderingDoctorId(adm.attendingDoctor.id);
        }
    };

    const quickProtocols = [
        { name: 'Chest X-Ray PA View', mod: 'xray', part: 'Chest', lat: 'na' },
        { name: 'CT Brain Plain (Non-Contrast)', mod: 'ct', part: 'Brain / Head', lat: 'na' },
        { name: 'CT Abdomen & Pelvis (With Contrast)', mod: 'ct', part: 'Abdomen & Pelvis', lat: 'na', contrast: true, prep: 'NPO 4-6 hours prior. Renal profile required.' },
        { name: 'MRI Brain with Contrast', mod: 'mri', part: 'Brain', lat: 'na', contrast: true },
        { name: 'MRI Lumbo-Sacral (LS) Spine', mod: 'mri', part: 'Lumbar Spine', lat: 'na' },
        { name: 'USG Whole Abdomen & Pelvis', mod: 'ultrasound', part: 'Whole Abdomen', lat: 'na', prep: 'Full urinary bladder required.' },
        { name: 'USG KUB (Kidney, Ureter, Bladder)', mod: 'ultrasound', part: 'KUB', lat: 'na' },
        { name: 'X-Ray Knee AP & Lateral', mod: 'xray', part: 'Knee', lat: 'bilateral' },
        { name: 'Mammography Screening Bilateral', mod: 'mammography', part: 'Breast', lat: 'bilateral' },
        { name: 'CT Pulmonary Angiogram (STAT)', mod: 'ct', part: 'Chest / Pulmonary', lat: 'na', contrast: true, prio: 'stat' },
    ];

    const selectQuickProtocol = (p: typeof quickProtocols[0]) => {
        setStudyDescription(p.name);
        setModality(p.mod);
        setBodyPart(p.part);
        setLaterality(p.lat || 'na');
        if (p.contrast) setContrastRequired(true);
        else setContrastRequired(false);
        if (p.prep) setPatientPreparation(p.prep);
        if (p.prio) setPriority(p.prio);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId && !admissionId) {
            setError('Please select an inpatient');
            return;
        }
        if (!orderingDoctorId) {
            setError('Please select the ordering physician');
            return;
        }
        if (!bodyPart.trim()) {
            setError('Anatomical body part is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit({
                patientId: patientId || undefined,
                admissionId: admissionId || undefined,
                orderingDoctorId,
                modality,
                bodyPart: bodyPart.trim(),
                laterality,
                studyDescription: studyDescription.trim() || undefined,
                priority,
                contrastRequired,
                scheduledAt: scheduledAt || undefined,
                clinicalIndication: clinicalIndication.trim() || undefined,
                patientPreparation: patientPreparation.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to place radiology order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <ScanLine className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    New Radiology & Imaging Order
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Order X-Ray, CT, MRI, Ultrasound, and emergency imaging studies.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                        
                        {/* 1. Patient & Ordering Doctor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Inpatient Patient <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={admissionId}
                                    onChange={(e) => handleAdmissionSelect(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                >
                                    <option value="">Select Inpatient...</option>
                                    {admissions.map((adm) => (
                                        <option key={adm.id} value={adm.id}>
                                            {adm.patient?.name || 'Inpatient'} — Ward: {adm.ward?.name || 'General'}, Bed: {adm.bed?.bed_number || '—'} ({adm.admission_number})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Ordering Doctor <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={orderingDoctorId}
                                    onChange={(e) => setOrderingDoctorId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                >
                                    <option value="">Select Ordering Physician...</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            Dr. {d.name} ({d.specialization || 'Clinical Staff'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Quick Study Protocols */}
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">
                                Standard Imaging Protocols (Quick Select)
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                                {quickProtocols.map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => selectQuickProtocol(p)}
                                        className={`px-2 py-0.8 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                            studyDescription === p.name
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                                : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-gray-700 hover:border-teal-400'
                                        }`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Modality & Study Description */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Modality <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={modality}
                                    onChange={(e) => setModality(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="xray">X-Ray (Digital Radiography)</option>
                                    <option value="ct">CT Scan (Computed Tomography)</option>
                                    <option value="mri">MRI (Magnetic Resonance Imaging)</option>
                                    <option value="ultrasound">Ultrasound (USG / Doppler)</option>
                                    <option value="mammography">Mammography</option>
                                    <option value="pet_ct">PET-CT Scan</option>
                                    <option value="dexa">DEXA Bone Mineral Densitometry</option>
                                    <option value="fluoroscopy">Fluoroscopy / C-Arm</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Study / Procedure Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. CT Chest High Resolution (HRCT)"
                                    value={studyDescription}
                                    onChange={(e) => setStudyDescription(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* 3. Body Part, Laterality & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Body Part / Region <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chest, Brain, Knee, Abdomen"
                                    value={bodyPart}
                                    onChange={(e) => setBodyPart(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Laterality
                                </label>
                                <select
                                    value={laterality}
                                    onChange={(e) => setLaterality(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="na">N/A (Axial / Midline)</option>
                                    <option value="left">Left Side</option>
                                    <option value="right">Right Side</option>
                                    <option value="bilateral">Bilateral</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT / Emergency (Immediate Scan)</option>
                                </select>
                            </div>
                        </div>

                        {/* 4. Scheduling & Contrast */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Preferred Scan Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div className="flex items-center pt-5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={contrastRequired}
                                        onChange={(e) => setContrastRequired(e.target.checked)}
                                        className="rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        Contrast Media Required (IV / Oral)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* 5. Clinical Indication & Prep */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Clinical Reason / Indication
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Acute abdominal pain, evaluate pulmonary nodule, rule out fracture"
                                value={clinicalIndication}
                                onChange={(e) => setClinicalIndication(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Patient Preparation Notes
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. NPO 6 hours, IV Cannula 18G in situ, Check Creatinine"
                                value={patientPreparation}
                                onChange={(e) => setPatientPreparation(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Place Radiology Order</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
