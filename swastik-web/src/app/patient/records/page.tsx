'use client';

import React, { useEffect, useState } from 'react';
import {
    FileText,
    Pill,
    Microscope,
    HeartPulse,
    Download,
    Share2,
    Calendar,
    AlertCircle,
    Loader2,
    Plus,
    X,
    CheckCircle2,
    Building2,
    Send
} from 'lucide-react';
import { patientApi, pharmacyApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import ProtectedPageGate from '@/components/auth/ProtectedPageGate';

export default function PatientRecordsPage() {
    const { user, isAuthenticated, _hasHydrated, isLoading: authLoading } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const [tab, setTab] = useState<'prescriptions' | 'reports' | 'vitals'>('prescriptions');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [vitals, setVitals] = useState<any[]>([]);

    // Selected Prescription Detail Modal
    const [selectedRx, setSelectedRx] = useState<any | null>(null);

    // Forward to Pharmacy Modal State
    const [forwardRx, setForwardRx] = useState<any | null>(null);
    const [pharmacies, setPharmacies] = useState<any[]>([]);
    const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [forwarding, setForwarding] = useState(false);
    const [forwardSuccess, setForwardSuccess] = useState(false);
    const [forwardError, setForwardError] = useState<string | null>(null);

    // Record Vital Modal
    const [vitalModalOpen, setVitalModalOpen] = useState(false);
    const [vitalType, setVitalType] = useState<'heart_rate' | 'blood_pressure' | 'temperature' | 'blood_sugar' | 'oxygen_saturation' | 'weight' | 'height'>('heart_rate');
    const [vitalValue, setVitalValue] = useState('');
    const [vitalDiastolic, setVitalDiastolic] = useState('');
    const [vitalNotes, setVitalNotes] = useState('');
    const [vitalSubmitting, setVitalSubmitting] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            const [rxRes, repRes, vitRes] = await Promise.allSettled([
                patientApi.getPrescriptions(),
                patientApi.getReports(),
                patientApi.getVitals({ limit: 50 }),
            ]);

            if (rxRes.status === 'fulfilled' && rxRes.value.success) {
                setPrescriptions((rxRes.value.data as any[]) || []);
            }
            if (repRes.status === 'fulfilled' && repRes.value.success) {
                setReports((repRes.value.data as any[]) || []);
            }
            if (vitRes.status === 'fulfilled' && vitRes.value.success) {
                setVitals((vitRes.value.data as any[]) || []);
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching health records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isPatient) {
            fetchRecords();
        } else {
            setLoading(false);
        }
    }, [isPatient]);


    const openForwardModal = async (rx: any) => {
        setForwardRx(rx);
        setForwardSuccess(false);
        setForwardError(null);
        try {
            const res = await patientApi.getPharmacies();
            if (res.success && Array.isArray(res.data)) {
                setPharmacies(res.data as any[]);
                if (res.data.length > 0) setSelectedPharmacyId((res.data[0] as any).id);
            }
        } catch {
            // fallback
        }
    };

    const handleForwardPrescription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forwardRx || !selectedPharmacyId) return;
        setForwarding(true);
        setForwardError(null);

        try {
            const res = await patientApi.forwardPrescriptionToPharmacy(forwardRx.id, {
                pharmacyId: selectedPharmacyId,
                deliveryAddress: deliveryAddress || undefined,
            });
            if (res.success) {
                setForwardSuccess(true);
            } else {
                setForwardError(res.message || res.error || 'Failed to forward prescription');
            }
        } catch (err: any) {
            setForwardError(err.message || 'Error forwarding prescription');
        } finally {
            setForwarding(false);
        }
    };

    const handleRecordVital = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vitalValue) return;
        setVitalSubmitting(true);
        try {
            const payload: any = {
                type: vitalType,
                value: vitalType === 'blood_pressure' && vitalDiastolic ? `${vitalValue}/${vitalDiastolic}` : vitalValue,
                notes: vitalNotes || undefined,
            };
            if (vitalType === 'blood_pressure' && vitalDiastolic) {
                payload.diastolic = vitalDiastolic;
            }
            const res = await patientApi.recordVital(payload);
            if (res.success) {
                setVitalModalOpen(false);
                setVitalValue('');
                setVitalDiastolic('');
                setVitalNotes('');
                const vitRes = await patientApi.getVitals({ limit: 50 });
                if (vitRes.success) setVitals((vitRes.data as any[]) || []);
            }
        } catch {
            // ignore
        } finally {
            setVitalSubmitting(false);
        }
    };

    if (_hasHydrated && !authLoading && !isPatient) {
        return <ProtectedPageGate pageType="records" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold mb-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Secure Clinical Repository</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                        Health Records
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                        Encrypted digital prescriptions, diagnostic lab reports, and continuous vitals logs.
                    </p>
                </div>

                {tab === 'vitals' && (
                    <button
                        onClick={() => setVitalModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Record Vital</span>
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-stone-100/80 rounded-2xl w-fit">
                <button
                    onClick={() => setTab('prescriptions')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        tab === 'prescriptions'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Prescriptions ({prescriptions.length})</span>
                </button>
                <button
                    onClick={() => setTab('reports')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        tab === 'reports'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Lab Reports ({reports.length})</span>
                </button>
                <button
                    onClick={() => setTab('vitals')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        tab === 'vitals'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Vitals History ({vitals.length})</span>
                </button>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-32"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-sm font-semibold text-stone-800">{error}</p>
                    <button
                        onClick={fetchRecords}
                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div>
                    {/* TAB: PRESCRIPTIONS */}
                    {tab === 'prescriptions' && (
                        <div>
                            {prescriptions.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                                    <Pill className="w-10 h-10 text-stone-300 mx-auto" />
                                    <h3 className="font-heading font-bold text-lg text-stone-800">
                                        No Prescriptions on File
                                    </h3>
                                    <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                                        Prescriptions generated during your doctor consultations will be automatically
                                        accessible here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {prescriptions.map((rx) => (
                                        <div
                                            key={rx.id}
                                            className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-vd-forest/30 shadow-xs transition-all flex flex-col justify-between"
                                        >
                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-stone-100 rounded-lg text-stone-800 border border-stone-200">
                                                        {rx.prescription_number || 'RX-VAIDIDEA'}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                            rx.status === 'active'
                                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                : 'bg-stone-100 text-stone-600'
                                                        }`}
                                                    >
                                                        {rx.status || 'Active'}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h3 className="font-heading font-bold text-base text-stone-900">
                                                        {rx.diagnosis || 'Clinical Prescription'}
                                                    </h3>
                                                    <p className="text-xs text-vd-forest font-medium">
                                                        Dr. {rx.doctor?.name || 'Verified Practitioner'} (
                                                        {rx.doctor?.specialization || 'Medicine'})
                                                    </p>
                                                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                                                        Issued: {new Date(rx.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                {rx.medicines && rx.medicines.length > 0 && (
                                                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1.5">
                                                        <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                                                            Prescribed Medicines ({rx.medicines.length})
                                                        </p>
                                                        <ul className="text-xs text-stone-700 space-y-1">
                                                            {rx.medicines.slice(0, 3).map((m: any, idx: number) => (
                                                                <li key={idx} className="flex justify-between items-center">
                                                                    <span className="font-medium">{m.medicine_name}</span>
                                                                    <span className="text-[11px] text-stone-500 font-mono">
                                                                        {m.dosage} • {m.frequency}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                                                <button
                                                    onClick={() => setSelectedRx(rx)}
                                                    className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                                >
                                                    View Details
                                                </button>

                                                <button
                                                    onClick={() => openForwardModal(rx)}
                                                    className="px-3.5 py-1.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Send className="w-3 h-3" />
                                                    <span>Order at Pharmacy</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: LAB REPORTS */}
                    {tab === 'reports' && (
                        <div>
                            {reports.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                                    <Microscope className="w-10 h-10 text-stone-300 mx-auto" />
                                    <h3 className="font-heading font-bold text-lg text-stone-800">
                                        No Lab Reports Available
                                    </h3>
                                    <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                                        Diagnostic lab test results and uploaded documents will appear here securely.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reports.map((rep) => (
                                        <div
                                            key={rep.id}
                                            className="bg-white rounded-3xl p-5 border border-stone-200/80 hover:border-vd-forest/30 shadow-xs flex items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-stone-900 text-sm">
                                                        {rep.title || rep.test_name || 'Medical Report'}
                                                    </h3>
                                                    <p className="text-xs text-stone-500 font-light">
                                                        {rep.center_name || 'Diagnostic Laboratory'} •{' '}
                                                        {new Date(rep.created_at || rep.test_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {rep.file_url && (
                                                <a
                                                    href={rep.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download PDF</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: VITALS HISTORY */}
                    {tab === 'vitals' && (
                        <div>
                            {vitals.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                                    <HeartPulse className="w-10 h-10 text-stone-300 mx-auto" />
                                    <h3 className="font-heading font-bold text-lg text-stone-800">
                                        No Vitals Recorded
                                    </h3>
                                    <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                                        Record blood pressure, heart rate, oxygen level, or blood sugar readings to keep
                                        your doctor updated.
                                    </p>
                                    <button
                                        onClick={() => setVitalModalOpen(true)}
                                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold"
                                    >
                                        Add First Entry
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                                                <tr>
                                                    <th className="p-4">Date & Time</th>
                                                    <th className="p-4">Heart Rate</th>
                                                    <th className="p-4">Blood Pressure</th>
                                                    <th className="p-4">Temperature</th>
                                                    <th className="p-4">SpO2</th>
                                                    <th className="p-4">Blood Sugar</th>
                                                    <th className="p-4">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100 font-mono">
                                                {vitals.map((v) => (
                                                    <tr key={v.id} className="hover:bg-stone-50/70">
                                                        <td className="p-4 text-stone-800 font-sans">
                                                            {new Date(v.recorded_at).toLocaleString([], {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                        <td className="p-4 font-bold text-stone-900">
                                                            {v.heart_rate ? `${v.heart_rate} bpm` : '—'}
                                                        </td>
                                                        <td className="p-4 font-bold text-stone-900">
                                                            {v.blood_pressure_systolic
                                                                ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic || 80}`
                                                                : '—'}
                                                        </td>
                                                        <td className="p-4 text-stone-700">
                                                            {v.temperature ? `${v.temperature}°F` : '—'}
                                                        </td>
                                                        <td className="p-4 font-bold text-emerald-700">
                                                            {v.oxygen_saturation || v.oxygen_level
                                                                ? `${v.oxygen_saturation || v.oxygen_level}%`
                                                                : '—'}
                                                        </td>
                                                        <td className="p-4 text-stone-700">
                                                            {v.blood_sugar ? `${v.blood_sugar} mg/dL` : '—'}
                                                        </td>
                                                        <td className="p-4 font-sans text-stone-500 italic">
                                                            {v.notes || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Prescription Detail Modal */}
            {selectedRx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setSelectedRx(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-stone-200 max-h-[90vh] overflow-y-auto space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                                <h3 className="font-heading font-bold text-lg text-stone-900">
                                    Prescription Details
                                </h3>
                                <p className="font-mono text-xs text-stone-500">
                                    {selectedRx.prescription_number || 'RX'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRx(null)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-stone-500 font-medium">Practitioner:</span>
                                <span className="font-semibold text-stone-900">Dr. {selectedRx.doctor?.name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-stone-500 font-medium">Diagnosis:</span>
                                <span className="font-semibold text-stone-900">{selectedRx.diagnosis}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-stone-500 font-medium">Date:</span>
                                <span className="font-mono text-stone-700">
                                    {new Date(selectedRx.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                                Prescribed Medicines
                            </h4>
                            <div className="space-y-2">
                                {(selectedRx.medicines || []).map((m: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-white border border-stone-200 rounded-xl space-y-1 text-xs"
                                    >
                                        <div className="flex justify-between font-bold text-stone-900">
                                            <span>{m.medicine_name}</span>
                                            <span className="font-mono">{m.dosage}</span>
                                        </div>
                                        <div className="flex justify-between text-stone-500 text-[11px]">
                                            <span>Frequency: {m.frequency}</span>
                                            <span>Duration: {m.duration || 'As directed'}</span>
                                        </div>
                                        {m.instructions && (
                                            <p className="text-[11px] text-vd-forest italic">
                                                Instructions: {m.instructions}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedRx.notes && (
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                                    Doctor Clinical Notes
                                </h4>
                                <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100 font-light leading-relaxed">
                                    {selectedRx.notes}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setSelectedRx(null);
                                    openForwardModal(selectedRx);
                                }}
                                className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all"
                            >
                                Order at Pharmacy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward to Pharmacy Modal */}
            {forwardRx && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setForwardRx(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                Send to Pharmacy
                            </h3>
                            <button
                                onClick={() => setForwardRx(null)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {forwardSuccess ? (
                            <div className="p-6 text-center space-y-3">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                                <h4 className="font-heading font-bold text-base text-stone-900">
                                    Prescription Sent Successfully!
                                </h4>
                                <p className="text-xs text-stone-600 font-light">
                                    The selected pharmacy will review the medicines and prepare your order. Track the
                                    order status in the Pharmacy tab.
                                </p>
                                <button
                                    onClick={() => setForwardRx(null)}
                                    className="px-5 py-2.5 bg-vd-forest text-white rounded-xl text-xs font-bold"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForwardPrescription} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                                        Select Partner Pharmacy
                                    </label>
                                    <select
                                        required
                                        value={selectedPharmacyId}
                                        onChange={(e) => setSelectedPharmacyId(e.target.value)}
                                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                    >
                                        {pharmacies.map((ph) => (
                                            <option key={ph.id} value={ph.id}>
                                                {ph.name} ({ph.address || ph.city || 'Verified'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                                        Delivery Address (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Enter delivery address for home delivery"
                                        className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                    />
                                </div>

                                {forwardError && (
                                    <p className="text-xs text-rose-600 font-medium">{forwardError}</p>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setForwardRx(null)}
                                        className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forwarding}
                                        className="px-5 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all flex items-center gap-2"
                                    >
                                        {forwarding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>Forward Prescription</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Record Vital Modal */}
            {vitalModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setVitalModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                Record Health Reading
                            </h3>
                            <button
                                onClick={() => setVitalModalOpen(false)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordVital} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Metric Type
                                </label>
                                <select
                                    value={vitalType}
                                    onChange={(e: any) => setVitalType(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                >
                                    <option value="heart_rate">Heart Rate (bpm)</option>
                                    <option value="blood_pressure">Blood Pressure (Systolic/Diastolic)</option>
                                    <option value="temperature">Temperature (°F)</option>
                                    <option value="blood_sugar">Blood Sugar (mg/dL)</option>
                                    <option value="oxygen_saturation">SpO2 Oxygen (%)</option>
                                    <option value="weight">Weight (kg)</option>
                                    <option value="height">Height (cm)</option>
                                </select>
                            </div>

                            {vitalType === 'blood_pressure' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                                            Systolic (e.g. 120)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={vitalValue}
                                            onChange={(e) => setVitalValue(e.target.value)}
                                            placeholder="120"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                                            Diastolic (e.g. 80)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={vitalDiastolic}
                                            onChange={(e) => setVitalDiastolic(e.target.value)}
                                            placeholder="80"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                                        Reading Value
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={vitalValue}
                                        onChange={(e) => setVitalValue(e.target.value)}
                                        placeholder="Enter reading"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={vitalNotes}
                                    onChange={(e) => setVitalNotes(e.target.value)}
                                    placeholder="e.g. Rested state"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setVitalModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={vitalSubmitting}
                                    className="px-5 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all flex items-center gap-2"
                                >
                                    {vitalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Save Reading</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
