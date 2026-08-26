'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BedDouble,
    Activity,
    Calendar,
    Clock,
    User,
    Building2,
    HeartPulse,
    FileText,
    Plus,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Loader2,
    Stethoscope,
    Pill,
    Sparkles,
    Send,
    X,
    ClipboardList,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface IpdAdmission {
    id: string;
    admission_number: string;
    hospital_id: string;
    patient_id: string;
    admitted_at: string;
    status: string;
    provisional_diagnosis?: string;
    patient?: {
        id: string;
        name: string;
        age?: number;
        gender?: string;
        phone?: string;
        blood_group?: string;
    };
    hospital?: {
        name: string;
        city?: string;
        address?: string;
    };
    ward?: {
        name: string;
        ward_type?: string;
    };
    bed?: {
        bed_number: string;
        bed_type?: string;
    };
}

interface RoundRecord {
    id: string;
    round_date: string;
    clinical_notes: string;
    treatment_orders?: string;
    dietary_instructions?: string;
    discharge_recommended?: boolean;
    discharge_notes?: string;
    vitals_snapshot?: {
        bp?: string;
        pulse?: string;
        spo2?: string;
        temperature?: string;
        blood_sugar?: string;
    };
    medication_changes?: Array<{
        medicine_name: string;
        dosage: string;
        action: string;
    }>;
}

export default function DoctorIpdPage() {
    const toast = useToast();
    const [admissions, setAdmissions] = useState<IpdAdmission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState<IpdAdmission | null>(null);

    // Ward Round Modal State
    const [showRoundModal, setShowRoundModal] = useState(false);
    const [isSubmittingRound, setIsSubmittingRound] = useState(false);
    const [roundForm, setRoundForm] = useState({
        bp: '',
        pulse: '',
        spo2: '',
        temperature: '',
        bloodSugar: '',
        clinicalNotes: '',
        treatmentOrders: '',
        dietaryInstructions: 'Regular Hospital Diet',
        dischargeRecommended: false,
        dischargeNotes: '',
    });

    // Timeline Modal State
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [roundsHistory, setRoundsHistory] = useState<RoundRecord[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    const fetchAdmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await doctorApi.getDoctorIpdAdmissions();
            if (res.success && res.admissions) {
                setAdmissions(res.admissions as IpdAdmission[]);
            }
        } catch (e) {
            console.error('Failed to fetch IPD admissions', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmissions();
    }, [fetchAdmissions]);

    const handleOpenRound = (adm: IpdAdmission) => {
        setSelectedAdmission(adm);
        setRoundForm({
            bp: '120/80',
            pulse: '76',
            spo2: '98%',
            temperature: '98.4°F',
            bloodSugar: '',
            clinicalNotes: '',
            treatmentOrders: '',
            dietaryInstructions: 'Regular Hospital Diet',
            dischargeRecommended: false,
            dischargeNotes: '',
        });
        setShowRoundModal(true);
    };

    const handleOpenTimeline = async (adm: IpdAdmission) => {
        setSelectedAdmission(adm);
        setShowTimelineModal(true);
        setIsLoadingTimeline(true);
        try {
            const res = await doctorApi.getDoctorIpdRounds(adm.id);
            if (res.success && res.rounds) {
                setRoundsHistory(res.rounds as RoundRecord[]);
            }
        } catch (e) {
            console.error('Failed to fetch rounds history', e);
        } finally {
            setIsLoadingTimeline(false);
        }
    };

    const handleSubmitRound = async () => {
        if (!selectedAdmission) return;
        if (!roundForm.clinicalNotes.trim()) {
            toast.error('Validation Error', 'Clinical notes/assessment is required');
            return;
        }

        setIsSubmittingRound(true);
        try {
            const res = await doctorApi.addDoctorIpdRound({
                admissionId: selectedAdmission.id,
                vitalsSnapshot: {
                    bp: roundForm.bp,
                    pulse: roundForm.pulse,
                    spo2: roundForm.spo2,
                    temperature: roundForm.temperature,
                    blood_sugar: roundForm.bloodSugar,
                },
                clinicalNotes: roundForm.clinicalNotes,
                treatmentOrders: roundForm.treatmentOrders,
                dietaryInstructions: roundForm.dietaryInstructions,
                dischargeRecommended: roundForm.dischargeRecommended,
                dischargeNotes: roundForm.dischargeNotes,
            });

            if (res.success) {
                toast.success('Round Logged', 'Daily clinical ward round note saved successfully');
                setShowRoundModal(false);
                fetchAdmissions();
            } else {
                toast.error('Failed', res.error || 'Could not log round');
            }
        } catch (e) {
            toast.error('Error', 'Failed to save round note');
        } finally {
            setIsSubmittingRound(false);
        }
    };

    const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('all');

    // Extract unique associated hospitals from admissions
    const uniqueHospitals = useMemo(() => {
        const map = new Map<string, string>();
        admissions.forEach(a => {
            if (a.hospital_id && a.hospital?.name) {
                map.set(a.hospital_id, a.hospital.name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [admissions]);

    const filteredAdmissions = useMemo(() => {
        if (selectedHospitalFilter === 'all') return admissions;
        return admissions.filter(a => a.hospital_id === selectedHospitalFilter);
    }, [admissions, selectedHospitalFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BedDouble className="h-7 w-7 text-emerald-600" />
                    My In-Patients (IPD) & Clinical Ward Rounds
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage admitted patients, record daily ward round progress notes, update treatment orders & recommend discharge
                </p>
            </div>

            {/* Hospital Switcher Filter Pills */}
            {uniqueHospitals.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setSelectedHospitalFilter('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                            selectedHospitalFilter === 'all'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        All Hospitals ({admissions.length})
                    </button>
                    {uniqueHospitals.map((h: { id: string; name: string }) => {
                        const count = admissions.filter(a => a.hospital_id === h.id).length;
                        return (
                            <button
                                key={h.id}
                                onClick={() => setSelectedHospitalFilter(h.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                    selectedHospitalFilter === h.id
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                <Building2 className="h-3.5 w-3.5" />
                                {h.name} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* In-Patients Grid */}
            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
            ) : filteredAdmissions.length === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <BedDouble className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Active In-Patients</h3>
                    <p className="text-xs text-gray-400 mt-1">Patients admitted under you in associated hospitals will appear here for ward rounds.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredAdmissions.map((adm: IpdAdmission) => {
                        const daysAdmitted = Math.max(1, Math.ceil((Date.now() - new Date(adm.admitted_at).getTime()) / (1000 * 60 * 60 * 24)));
                        return (
                            <Card key={adm.id} className="p-5 border border-emerald-100 dark:border-emerald-950 hover:shadow-md transition">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                                {adm.admission_number}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">Day {daysAdmitted}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                                            {adm.patient?.name || 'Patient'}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {adm.patient?.age}y / {adm.patient?.gender || 'M'} • Blood: {adm.patient?.blood_group || 'N/A'}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded-full">
                                        Admitted
                                    </span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="font-semibold">{adm.hospital?.name || 'Hospital'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <BedDouble className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Ward: <strong>{adm.ward?.name || 'General'}</strong> • Bed: <strong>{adm.bed?.bed_number || 'N/A'}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Diagnosis: <strong className="text-gray-800 dark:text-gray-200">{adm.provisional_diagnosis || 'Under Evaluation'}</strong></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t">
                                    <Button
                                        onClick={() => handleOpenTimeline(adm)}
                                        variant="outline"
                                        className="text-xs py-2 text-gray-700 dark:text-gray-200"
                                    >
                                        <Clock className="h-3.5 w-3.5 mr-1" /> History
                                    </Button>
                                    <Button
                                        onClick={() => handleOpenRound(adm)}
                                        className="text-xs py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    >
                                        <Stethoscope className="h-3.5 w-3.5 mr-1" /> Ward Round
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* LOG DAILY WARD ROUND MODAL */}
            {showRoundModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl border max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Log Daily Ward Round Note</h3>
                                <p className="text-xs text-gray-500">Patient: {selectedAdmission.patient?.name} • Bed: {selectedAdmission.bed?.bed_number} ({selectedAdmission.ward?.name})</p>
                            </div>
                            <button onClick={() => setShowRoundModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>

                        {/* Vitals Snapshot */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Vitals Snapshot at Round</label>
                            <div className="grid grid-cols-5 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">BP (mmHg)</span>
                                    <Input value={roundForm.bp} onChange={e => setRoundForm({ ...roundForm, bp: e.target.value })} placeholder="120/80" />
                                </div>
                                <div>
                                    <span className="text-gray-500">Pulse (bpm)</span>
                                    <Input value={roundForm.pulse} onChange={e => setRoundForm({ ...roundForm, pulse: e.target.value })} placeholder="76" />
                                </div>
                                <div>
                                    <span className="text-gray-500">SpO2 (%)</span>
                                    <Input value={roundForm.spo2} onChange={e => setRoundForm({ ...roundForm, spo2: e.target.value })} placeholder="98%" />
                                </div>
                                <div>
                                    <span className="text-gray-500">Temp</span>
                                    <Input value={roundForm.temperature} onChange={e => setRoundForm({ ...roundForm, temperature: e.target.value })} placeholder="98.4°F" />
                                </div>
                                <div>
                                    <span className="text-gray-500">Sugar (mg/dL)</span>
                                    <Input value={roundForm.bloodSugar} onChange={e => setRoundForm({ ...roundForm, bloodSugar: e.target.value })} placeholder="110" />
                                </div>
                            </div>
                        </div>

                        {/* Clinical Assessment */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Clinical Progress & Assessment (SOAP) *</label>
                            <textarea
                                value={roundForm.clinicalNotes}
                                onChange={e => setRoundForm({ ...roundForm, clinicalNotes: e.target.value })}
                                rows={3}
                                placeholder="Patient is comfortable, chest clear, afebrile, surgical wound dry and intact..."
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                            />
                        </div>

                        {/* Treatment & Nursing Instructions */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Treatment Orders & Nursing Instructions</label>
                            <Input
                                value={roundForm.treatmentOrders}
                                onChange={e => setRoundForm({ ...roundForm, treatmentOrders: e.target.value })}
                                placeholder="e.g. Continue IV fluids @ 75ml/hr, mobilize patient with support"
                            />
                        </div>

                        {/* Dietary Instructions */}
                        <div>
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Dietary Instructions</label>
                            <select
                                value={roundForm.dietaryInstructions}
                                onChange={e => setRoundForm({ ...roundForm, dietaryInstructions: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                            >
                                <option value="Regular Hospital Diet">Regular Hospital Diet</option>
                                <option value="Soft / Liquid Diet">Soft / Liquid Diet</option>
                                <option value="Diabetic Diet">Diabetic Diet (Low Sugar)</option>
                                <option value="Hypertensive (Low Salt) Diet">Hypertensive (Low Salt) Diet</option>
                                <option value="NPO (Nil by Mouth)">NPO (Nil by Mouth)</option>
                            </select>
                        </div>

                        {/* Discharge Recommendation */}
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={roundForm.dischargeRecommended}
                                    onChange={e => setRoundForm({ ...roundForm, dischargeRecommended: e.target.checked })}
                                    className="rounded text-emerald-600"
                                />
                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                    Recommend Patient Discharge (Ready for Discharge Planning)
                                </span>
                            </label>
                            {roundForm.dischargeRecommended && (
                                <Input
                                    value={roundForm.dischargeNotes}
                                    onChange={e => setRoundForm({ ...roundForm, dischargeNotes: e.target.value })}
                                    placeholder="Discharge summary notes, follow-up advice & medications..."
                                    className="text-xs bg-white dark:bg-gray-900"
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <Button variant="outline" onClick={() => setShowRoundModal(false)}>Cancel</Button>
                            <Button
                                onClick={handleSubmitRound}
                                disabled={isSubmittingRound || !roundForm.clinicalNotes.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                                {isSubmittingRound && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                                Save Ward Round Note
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* TIMELINE MODAL */}
            {showTimelineModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ward Round Clinical History</h3>
                                <p className="text-xs text-gray-500">{selectedAdmission.patient?.name} • {selectedAdmission.admission_number}</p>
                            </div>
                            <button onClick={() => setShowTimelineModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>

                        {isLoadingTimeline ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                        ) : roundsHistory.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No ward round notes logged for this admission yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {roundsHistory.map((rnd) => (
                                    <div key={rnd.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border space-y-2 text-xs">
                                        <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-300">
                                            <span>{new Date(rnd.round_date).toLocaleDateString()} at {new Date(rnd.round_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {rnd.discharge_recommended && (
                                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    Discharge Recommended
                                                </span>
                                            )}
                                        </div>
                                        {rnd.vitals_snapshot && (
                                            <div className="flex gap-3 text-[11px] text-gray-500 font-mono">
                                                {rnd.vitals_snapshot.bp && <span>BP: {rnd.vitals_snapshot.bp}</span>}
                                                {rnd.vitals_snapshot.pulse && <span>Pulse: {rnd.vitals_snapshot.pulse}</span>}
                                                {rnd.vitals_snapshot.spo2 && <span>SpO2: {rnd.vitals_snapshot.spo2}</span>}
                                                {rnd.vitals_snapshot.temperature && <span>Temp: {rnd.vitals_snapshot.temperature}</span>}
                                            </div>
                                        )}
                                        <p className="text-gray-800 dark:text-gray-200">{rnd.clinical_notes}</p>
                                        {rnd.treatment_orders && (
                                            <p className="text-teal-700 dark:text-teal-400 font-medium">Orders: {rnd.treatment_orders}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t">
                            <Button variant="outline" onClick={() => setShowTimelineModal(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
