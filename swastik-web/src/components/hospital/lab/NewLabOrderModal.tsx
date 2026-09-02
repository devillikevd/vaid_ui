'use client';

import React, { useState } from 'react';
import {
    X,
    TestTube,
    Calendar,
    User,
    Building2,
    Stethoscope,
    AlertCircle,
    Check,
    Loader2,
    AlertTriangle,
    Clock
} from 'lucide-react';

interface NewLabOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, any>) => Promise<boolean>;
    admissions: any[];
    doctors: any[];
}

export function NewLabOrderModal({
    isOpen,
    onClose,
    onSubmit,
    admissions,
    doctors,
}: NewLabOrderModalProps) {
    const [admissionId, setAdmissionId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [orderingDoctorId, setOrderingDoctorId] = useState('');
    const [testName, setTestName] = useState('');
    const [testCategory, setTestCategory] = useState('Biochemistry');
    const [specimenType, setSpecimenType] = useState('Serum (SST)');
    const [priority, setPriority] = useState('routine');
    const [fastingRequired, setFastingRequired] = useState(false);
    const [clinicalNotes, setClinicalNotes] = useState('');

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

    const quickTests = [
        { name: 'Complete Blood Count (CBC)', cat: 'Hematology', spec: 'Whole Blood (EDTA)' },
        { name: 'Liver Function Test (LFT)', cat: 'Biochemistry', spec: 'Serum (SST)' },
        { name: 'Kidney Function Test (KFT)', cat: 'Biochemistry', spec: 'Serum (SST)' },
        { name: 'Lipid Profile', cat: 'Biochemistry', spec: 'Serum (SST)', fasting: true },
        { name: 'Fasting Blood Glucose', cat: 'Biochemistry', spec: 'Plasma (Fluoride)', fasting: true },
        { name: 'HbA1c Glycated Hemoglobin', cat: 'Biochemistry', spec: 'Whole Blood (EDTA)' },
        { name: 'Thyroid Profile (T3/T4/TSH)', cat: 'Immunology', spec: 'Serum (SST)' },
        { name: 'Urine Routine & Micro (R/M)', cat: 'Clinical Pathology', spec: 'Urine (Clean Catch)' },
        { name: 'C-Reactive Protein (CRP)', cat: 'Immunology', spec: 'Serum (SST)' },
        { name: 'Serum Electrolytes (Na/K/Cl)', cat: 'Biochemistry', spec: 'Serum (SST)' },
        { name: 'Troponin-I (Cardiac STAT)', cat: 'Biochemistry', spec: 'Serum (SST)', prio: 'stat' },
        { name: 'D-Dimer (Quantitative)', cat: 'Hematology', spec: 'Plasma (Citrate)' },
    ];

    const selectQuickTest = (t: typeof quickTests[0]) => {
        setTestName(t.name);
        setTestCategory(t.cat);
        setSpecimenType(t.spec);
        if (t.fasting) setFastingRequired(true);
        if (t.prio) setPriority(t.prio);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId && !admissionId) {
            setError('Please select an admitted patient');
            return;
        }
        if (!orderingDoctorId) {
            setError('Please select the ordering physician');
            return;
        }
        if (!testName.trim()) {
            setError('Test / Diagnostic Name is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onSubmit({
                patientId: patientId || undefined,
                admissionId: admissionId || undefined,
                orderingDoctorId,
                testName: testName.trim(),
                testCategory,
                specimenType,
                priority,
                fastingRequired,
                clinicalNotes: clinicalNotes.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to place lab order');
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
                                <TestTube className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    New Laboratory / Pathology Order
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Order diagnostic panels, specimen collection, and urgent STAT tests.
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

                        {/* Quick Diagnostic Catalog Chips */}
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">
                                Standard Diagnostic Tests (Quick Select)
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                                {quickTests.map((t, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => selectQuickTest(t)}
                                        className={`px-2 py-0.8 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                            testName === t.name
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                                : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-gray-700 hover:border-teal-400'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Test Name & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Test / Panel Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Complete Blood Count, Serum Ferritin"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Laboratory Section / Category
                                </label>
                                <select
                                    value={testCategory}
                                    onChange={(e) => setTestCategory(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="Biochemistry">Biochemistry</option>
                                    <option value="Hematology">Hematology</option>
                                    <option value="Microbiology">Microbiology & Serology</option>
                                    <option value="Clinical Pathology">Clinical Pathology</option>
                                    <option value="Histopathology">Histopathology & Cytology</option>
                                    <option value="Immunology">Immunology & Hormones</option>
                                    <option value="Molecular Diagnostics">Molecular Diagnostics</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. Specimen Type & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Specimen / Sample Type
                                </label>
                                <select
                                    value={specimenType}
                                    onChange={(e) => setSpecimenType(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="Serum (SST)">Serum (SST / Plain Tube)</option>
                                    <option value="Whole Blood (EDTA)">Whole Blood (EDTA Purple)</option>
                                    <option value="Plasma (Fluoride)">Plasma (Fluoride Grey / Sugar)</option>
                                    <option value="Plasma (Citrate)">Plasma (Sodium Citrate Blue)</option>
                                    <option value="Urine (Clean Catch)">Urine (Clean Catch / Midstream)</option>
                                    <option value="Urine (24 Hour)">Urine (24 Hour Collection)</option>
                                    <option value="Swab (Throat/Nasal)">Swab (Throat / Nasopharyngeal)</option>
                                    <option value="Sputum">Sputum</option>
                                    <option value="Stool">Stool Sample</option>
                                    <option value="CSF">Cerebrospinal Fluid (CSF)</option>
                                    <option value="Tissue / Biopsy">Tissue / Formalin Biopsy</option>
                                    <option value="Other Fluid">Other Body Fluid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Order Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT / Emergency (Immediate Processing)</option>
                                </select>
                            </div>
                        </div>

                        {/* 4. Fasting & Clinical Indication */}
                        <div>
                            <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fastingRequired}
                                    onChange={(e) => setFastingRequired(e.target.checked)}
                                    className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    Fasting Required before sample collection
                                </span>
                            </label>

                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Clinical Reason / Suspected Diagnosis
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Rule out sepsis, pre-op clearance, monitor electrolyte imbalance"
                                value={clinicalNotes}
                                onChange={(e) => setClinicalNotes(e.target.value)}
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
                                <span>Place Lab Order</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
