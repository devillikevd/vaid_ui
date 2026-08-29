'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BedDouble,
    Clock,
    Building2,
    HeartPulse,
    Loader2,
    Stethoscope,
    X,
    Search,
    RefreshCw,
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Calendar,
    User,
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useDoctorStore } from '@/stores/doctorStore';
import type { IpdAdmission, RoundRecord } from '@/stores/doctorStore';

export default function DoctorIpdPage() {
    const toast = useToast();
    const {
        ipdAdmissions,
        hasHospitalAffiliation,
        loadingIpd,
        ipdError,
        fetchIpdAdmissions,
        addDoctorIpdRound,
        fetchDoctorIpdRounds,
    } = useDoctorStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('all');
    const [selectedAdmission, setSelectedAdmission] = useState<IpdAdmission | null>(null);

    // Ward Round Modal State
    const [showRoundModal, setShowRoundModal] = useState(false);
    const [isSubmittingRound, setIsSubmittingRound] = useState(false);
    const [roundForm, setRoundForm] = useState({
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

    // Timeline Modal State
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [roundsHistory, setRoundsHistory] = useState<RoundRecord[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

    useEffect(() => {
        fetchIpdAdmissions();
    }, [fetchIpdAdmissions]);

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
            const rounds = await fetchDoctorIpdRounds(adm.id);
            setRoundsHistory(rounds);
        } catch (e) {
            console.error('Failed to fetch rounds history', e);
        } finally {
            setIsLoadingTimeline(false);
        }
    };

    const handleSubmitRound = async () => {
        if (!selectedAdmission) return;
        if (!roundForm.clinicalNotes.trim()) {
            toast.error('Validation Error', 'Clinical notes / assessment (SOAP) is required');
            return;
        }

        setIsSubmittingRound(true);
        try {
            const res = await addDoctorIpdRound({
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
            } else {
                toast.error('Failed', res.error || 'Could not log round note');
            }
        } catch {
            toast.error('Error', 'Failed to save round note');
        } finally {
            setIsSubmittingRound(false);
        }
    };

    // Extract unique associated hospitals from admissions
    const uniqueHospitals = useMemo(() => {
        const map = new Map<string, string>();
        ipdAdmissions.forEach(a => {
            if (a.hospital_id && a.hospital?.name) {
                map.set(a.hospital_id, a.hospital.name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [ipdAdmissions]);

    // Search and hospital filter
    const filteredAdmissions = useMemo(() => {
        return ipdAdmissions.filter((adm) => {
            if (selectedHospitalFilter !== 'all' && adm.hospital_id !== selectedHospitalFilter) {
                return false;
            }
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const patientName = adm.patient?.name?.toLowerCase() || '';
            const admNumber = adm.admission_number?.toLowerCase() || '';
            const diagnosis = adm.provisional_diagnosis?.toLowerCase() || '';
            const wardName = adm.ward?.name?.toLowerCase() || '';
            const bedNum = adm.bed?.bed_number?.toLowerCase() || '';
            const hospName = adm.hospital?.name?.toLowerCase() || '';
            return patientName.includes(q) || admNumber.includes(q) || diagnosis.includes(q) || wardName.includes(q) || bedNum.includes(q) || hospName.includes(q);
        });
    }, [ipdAdmissions, selectedHospitalFilter, searchQuery]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <BedDouble className="h-7 w-7" />
                        </div>
                        In-Patients (IPD) & Ward Rounds
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">
                        Active patient admissions under your care across affiliated hospitals.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => fetchIpdAdmissions()}
                        disabled={loadingIpd}
                        className="h-11 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        title="Refresh Admissions"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingIpd ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search and Filters Toolbar */}
            {ipdAdmissions.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900/60 p-2.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by patient, ward, bed, diagnosis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-xs font-semibold"
                        />
                    </div>

                    {/* Hospital Switcher Filter Pills */}
                    {uniqueHospitals.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                            <button
                                onClick={() => setSelectedHospitalFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                                    selectedHospitalFilter === 'all'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                All Hospitals ({ipdAdmissions.length})
                            </button>
                            {uniqueHospitals.map((h) => {
                                const count = ipdAdmissions.filter(a => a.hospital_id === h.id).length;
                                return (
                                    <button
                                        key={h.id}
                                        onClick={() => setSelectedHospitalFilter(h.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
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
                </div>
            )}

            {/* Main Content Area */}
            {loadingIpd ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-500">Loading active in-patient admissions...</p>
                </div>
            ) : ipdError ? (
                /* Error State */
                <Card className="p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Unable to load In-Patients</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">{ipdError}</p>
                    <Button
                        onClick={() => fetchIpdAdmissions()}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5"
                    >
                        Try Again
                    </Button>
                </Card>
            ) : !hasHospitalAffiliation ? (
                /* No Hospital Affiliation Empty State */
                <Card className="p-12 text-center border-dashed border-2 border-gray-200 dark:border-gray-800 rounded-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm max-w-2xl mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Hospital Affiliation</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-md mx-auto">
                            Join or accept a hospital care-network invitation to access in-patients and perform clinical ward rounds.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link href="/doctor/care-networks">
                            <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 gap-2 hover:-translate-y-0.5 active:scale-95 transition-all">
                                View Invitations & Networks <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </Card>
            ) : filteredAdmissions.length === 0 ? (
                /* No Active In-Patients Empty State */
                <Card className="p-12 text-center border-dashed border-2 border-gray-200 dark:border-gray-800 rounded-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm max-w-2xl mx-auto space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                        <BedDouble className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Active In-Patients</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        {searchQuery
                            ? `No admissions match your search "${searchQuery}".`
                            : 'There are currently no active patients admitted under your care in associated hospitals.'}
                    </p>
                    {searchQuery && (
                        <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs font-bold rounded-xl"
                        >
                            Clear Search
                        </Button>
                    )}
                </Card>
            ) : (
                /* Active In-Patient Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredAdmissions.map((adm) => {
                        const daysAdmitted = Math.max(1, Math.ceil((Date.now() - new Date(adm.admitted_at).getTime()) / (1000 * 60 * 60 * 24)));
                        const admittedDateFormatted = new Date(adm.admitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <Card
                                key={adm.id}
                                className="p-5 border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 rounded-2xl bg-white dark:bg-gray-900/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-3.5">
                                    {/* Top badges */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-mono font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                                                {adm.admission_number}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                                Day {daysAdmitted}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded-full flex items-center gap-1 shrink-0">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                                            Admitted
                                        </span>
                                    </div>

                                    {/* Patient Info */}
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                                            {adm.patient?.name || 'Patient'}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                                            {adm.patient?.age ? `${adm.patient.age}y` : 'Age N/A'} • {adm.patient?.gender || 'N/A'} {adm.patient?.blood_group ? `• Blood: ${adm.patient.blood_group}` : ''}
                                        </p>
                                    </div>

                                    {/* Hospital, Ward, Bed, Diagnosis */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="font-bold text-gray-900 dark:text-white truncate">{adm.hospital?.name || 'Hospital'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BedDouble className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>
                                                Ward: <strong>{adm.ward?.name || 'General Ward'}</strong> • Bed: <strong>{adm.bed?.bed_number || 'N/A'}</strong>
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>Admitted on <strong>{admittedDateFormatted}</strong></span>
                                        </div>
                                        <div className="flex items-start gap-2 pt-0.5">
                                            <HeartPulse className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">
                                                Diagnosis: <strong className="text-gray-800 dark:text-gray-200">{adm.provisional_diagnosis || 'Under Evaluation'}</strong>
                                            </span>
                                        </div>

                                        {/* Latest Ward Round Status */}
                                        {adm.latest_round && (
                                            <div className="mt-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 text-[11px] space-y-1">
                                                <div className="flex items-center justify-between font-bold text-gray-700 dark:text-gray-300">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-emerald-500" />
                                                        Last Round
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {new Date(adm.latest_round.round_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(adm.latest_round.round_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-400 line-clamp-1 italic">
                                                    &ldquo;{adm.latest_round.clinical_notes}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800">
                                    <Button
                                        onClick={() => handleOpenTimeline(adm)}
                                        variant="outline"
                                        className="h-10 text-xs font-bold rounded-xl text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <Clock className="h-3.5 w-3.5 mr-1.5" /> Clinical History
                                    </Button>
                                    <Button
                                        onClick={() => handleOpenRound(adm)}
                                        className="h-10 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
                                    >
                                        <Stethoscope className="h-3.5 w-3.5 mr-1.5" /> Ward Round
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* LOG DAILY WARD ROUND MODAL */}
            {showRoundModal && selectedAdmission && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Log Daily Ward Round Note</h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    Patient: <strong>{selectedAdmission.patient?.name}</strong> • Bed: {selectedAdmission.bed?.bed_number} ({selectedAdmission.ward?.name})
                                </p>
                            </div>
                            <button
                                onClick={() => setShowRoundModal(false)}
                                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Vitals Snapshot */}
                        <div>
                            <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 block">Vitals Snapshot at Round</label>
                            <div className="grid grid-cols-5 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500 font-semibold">BP (mmHg)</span>
                                    <Input value={roundForm.bp} onChange={e => setRoundForm({ ...roundForm, bp: e.target.value })} placeholder="120/80" className="h-9 text-xs rounded-xl" />
                                </div>
                                <div>
                                    <span className="text-gray-500 font-semibold">Pulse (bpm)</span>
                                    <Input value={roundForm.pulse} onChange={e => setRoundForm({ ...roundForm, pulse: e.target.value })} placeholder="76" className="h-9 text-xs rounded-xl" />
                                </div>
                                <div>
                                    <span className="text-gray-500 font-semibold">SpO2 (%)</span>
                                    <Input value={roundForm.spo2} onChange={e => setRoundForm({ ...roundForm, spo2: e.target.value })} placeholder="98%" className="h-9 text-xs rounded-xl" />
                                </div>
                                <div>
                                    <span className="text-gray-500 font-semibold">Temp</span>
                                    <Input value={roundForm.temperature} onChange={e => setRoundForm({ ...roundForm, temperature: e.target.value })} placeholder="98.4°F" className="h-9 text-xs rounded-xl" />
                                </div>
                                <div>
                                    <span className="text-gray-500 font-semibold">Sugar (mg/dL)</span>
                                    <Input value={roundForm.bloodSugar} onChange={e => setRoundForm({ ...roundForm, bloodSugar: e.target.value })} placeholder="110" className="h-9 text-xs rounded-xl" />
                                </div>
                            </div>
                        </div>

                        {/* Clinical Assessment */}
                        <div>
                            <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1 block">Clinical Progress & Assessment (SOAP) *</label>
                            <textarea
                                value={roundForm.clinicalNotes}
                                onChange={e => setRoundForm({ ...roundForm, clinicalNotes: e.target.value })}
                                rows={3}
                                placeholder="Patient is comfortable, chest clear, afebrile, surgical wound dry and intact..."
                                className="w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            />
                        </div>

                        {/* Treatment & Nursing Instructions */}
                        <div>
                            <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1 block">Treatment Orders & Nursing Instructions</label>
                            <Input
                                value={roundForm.treatmentOrders}
                                onChange={e => setRoundForm({ ...roundForm, treatmentOrders: e.target.value })}
                                placeholder="e.g. Continue IV fluids @ 75ml/hr, mobilize patient with support"
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        {/* Dietary Instructions */}
                        <div>
                            <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1 block">Dietary Instructions</label>
                            <select
                                value={roundForm.dietaryInstructions}
                                onChange={e => setRoundForm({ ...roundForm, dietaryInstructions: e.target.value })}
                                className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="Regular Hospital Diet">Regular Hospital Diet</option>
                                <option value="Soft / Liquid Diet">Soft / Liquid Diet</option>
                                <option value="Diabetic Diet">Diabetic Diet (Low Sugar)</option>
                                <option value="Hypertensive (Low Salt) Diet">Hypertensive (Low Salt) Diet</option>
                                <option value="NPO (Nil by Mouth)">NPO (Nil by Mouth)</option>
                            </select>
                        </div>

                        {/* Discharge Recommendation */}
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={roundForm.dischargeRecommended}
                                    onChange={e => setRoundForm({ ...roundForm, dischargeRecommended: e.target.checked })}
                                    className="rounded text-emerald-600 h-4 w-4"
                                />
                                <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                                    Recommend Patient Discharge (Ready for Discharge Planning)
                                </span>
                            </label>
                            {roundForm.dischargeRecommended && (
                                <Input
                                    value={roundForm.dischargeNotes}
                                    onChange={e => setRoundForm({ ...roundForm, dischargeNotes: e.target.value })}
                                    placeholder="Discharge summary notes, follow-up advice & medications..."
                                    className="text-xs bg-white dark:bg-gray-900 rounded-xl mt-1.5"
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setShowRoundModal(false)} className="rounded-xl font-bold">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmitRound}
                                disabled={isSubmittingRound || !roundForm.clinicalNotes.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">Ward Round Clinical History</h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    {selectedAdmission.patient?.name} • Admission #{selectedAdmission.admission_number}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowTimelineModal(false)}
                                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {isLoadingTimeline ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                            </div>
                        ) : roundsHistory.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 text-sm font-medium">
                                No ward round notes logged for this admission yet.
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {roundsHistory.map((rnd) => (
                                    <div key={rnd.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 space-y-2 text-xs">
                                        <div className="flex items-center justify-between font-bold text-gray-700 dark:text-gray-300">
                                            <span>
                                                {new Date(rnd.round_date).toLocaleDateString()} at {new Date(rnd.round_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {rnd.discharge_recommended && (
                                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Discharge Recommended
                                                </span>
                                            )}
                                        </div>
                                        {rnd.vitals_snapshot && (
                                            <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 font-mono bg-white dark:bg-gray-900/60 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                                                {rnd.vitals_snapshot.bp && <span>BP: <strong>{rnd.vitals_snapshot.bp}</strong></span>}
                                                {rnd.vitals_snapshot.pulse && <span>Pulse: <strong>{rnd.vitals_snapshot.pulse}</strong></span>}
                                                {rnd.vitals_snapshot.spo2 && <span>SpO2: <strong>{rnd.vitals_snapshot.spo2}</strong></span>}
                                                {rnd.vitals_snapshot.temperature && <span>Temp: <strong>{rnd.vitals_snapshot.temperature}</strong></span>}
                                                {rnd.vitals_snapshot.blood_sugar && <span>Sugar: <strong>{rnd.vitals_snapshot.blood_sugar}</strong></span>}
                                            </div>
                                        )}
                                        <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                                            {rnd.clinical_notes}
                                        </p>
                                        {rnd.treatment_orders && (
                                            <p className="text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/40 p-2 rounded-xl border border-teal-100 dark:border-teal-900/30">
                                                Orders: {rnd.treatment_orders}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setShowTimelineModal(false)} className="rounded-xl font-bold">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
