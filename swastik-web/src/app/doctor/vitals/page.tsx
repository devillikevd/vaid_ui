'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Activity, Heart, Thermometer, Droplets, Loader2, Search,
    User, Plus, X, Wind, Scale, Droplet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDoctorStore } from '@/stores/doctorStore';
import { doctorApi } from '@/lib/api';
import { useVitalsUpdates } from '@/hooks/useSocket';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';

interface VitalRecord {
    id: string;
    patientId: string;
    patientName: string;
    patientGender?: string;
    heartRate?: number;
    bloodPressure?: string;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    oxygenLevel?: number;
    respiratoryRate?: number;
    weight?: number;
    bloodSugar?: number;
    notes?: string;
    recordedAt: string;
}

interface VitalForm {
    patientId: string;
    heartRate: string;
    bloodPressureSystolic: string;
    bloodPressureDiastolic: string;
    temperature: string;
    oxygenLevel: string;
    respiratoryRate: string;
    weight: string;
    bloodSugar: string;
    notes: string;
}


function getBPStatus(sys?: number, dia?: number) {
    if (!sys || !dia) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (sys >= 140 || dia >= 90) return { label: 'High (HBP)', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (sys >= 130 || dia >= 80) return { label: 'Elevated', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
}

function getTempStatus(temp?: number) {
    if (!temp) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    if (temp > 100.4) return { label: 'Fever', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (temp > 99.5) return { label: 'Elevated', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    if (temp < 95) return { label: 'Hypothermia', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
}

function getSpO2Status(spo2?: number) {
    if (!spo2) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
    if (spo2 < 90) return { label: 'Critical', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
    if (spo2 < 95) return { label: 'Low', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
}

const emptyForm: VitalForm = {
    patientId: '',
    heartRate: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    oxygenLevel: '',
    respiratoryRate: '',
    weight: '',
    bloodSugar: '',
    notes: '',
};

function VitalBadge({ icon: Icon, label, value, unit, color, bg }: {
    icon: React.ElementType; label: string; value?: number | string | null;
    unit: string; color: string; bg: string;
}) {
    if (value == null) return null;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color} shrink-0`} />
            <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{value} {unit}</p>
            </div>
        </div>
    );
}

export default function DoctorVitalsPage() {
    const { vitals, loadingVitals, fetchVitals, recordVitals } = useDoctorStore();
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<VitalForm>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [patientList, setPatientList] = useState<{ id: string; name: string }[]>([]);
    const [newVitalAlert, setNewVitalAlert] = useState(false);

    // Real-time Socket.IO — auto-refresh when patient records a vital from Android
    useVitalsUpdates(
        useCallback(() => {
            setNewVitalAlert(true);
            fetchVitals();
            setTimeout(() => setNewVitalAlert(false), 5000);
         
        }, [fetchVitals])
    );

    const loadPatientList = useCallback(async () => {
        try {
            const result = await doctorApi.getPatients(1, '', 200);
            if (result.success) {
                const list = Array.isArray(result.data) ? result.data : [];
                setPatientList(list.map((p: any) => ({ id: p.id, name: p.name || p.patientName })));
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchVitals();
        loadPatientList();
    }, [fetchVitals, loadPatientList]);

    const handleSave = async () => {
        if (!form.patientId) {
            setError('Please select a patient');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const payload: Record<string, unknown> = {};
            if (form.heartRate) payload.heartRate = parseInt(form.heartRate);
            if (form.bloodPressureSystolic) payload.bloodPressureSystolic = parseInt(form.bloodPressureSystolic);
            if (form.bloodPressureDiastolic) payload.bloodPressureDiastolic = parseInt(form.bloodPressureDiastolic);
            if (form.temperature) payload.temperature = parseFloat(form.temperature);
            if (form.oxygenLevel) payload.oxygenLevel = parseFloat(form.oxygenLevel);
            if (form.respiratoryRate) payload.respiratoryRate = parseInt(form.respiratoryRate);
            if (form.weight) payload.weight = parseFloat(form.weight);
            if (form.bloodSugar) payload.bloodSugar = parseFloat(form.bloodSugar);
            if (form.notes) payload.notes = form.notes;

            if (Object.keys(payload).length === 0) {
                setError('Please enter at least one vital sign');
                setIsSaving(false);
                return;
            }

            const result = await recordVitals(form.patientId, payload);
            if (result) {
                toast.success('Vitals recorded', 'The patient vitals were saved successfully.');
                setForm(emptyForm);
                setShowForm(false);
            } else {
                setError('Failed to save vitals');
                toast.error('Unable to save vitals', 'Please review the form and try again.');
            }
        } catch {
            setError('Failed to save vitals');
            toast.error('Unable to save vitals', 'Please try again in a moment.');
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = vitals.filter((v: any) =>
        (v.patientName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 10);
    const paginatedItems = paginate(page);

    // Summary stats
    const uniquePatients = new Set(vitals.map((v: any) => v.patientId)).size;
    const todayCount = vitals.filter((v: any) => {
        const d = new Date(v.recordedAt || v.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;

    if (loadingVitals) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading vitals...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Patient Vitals</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Monitor clinical metrics and track patient health trends</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'primary'} className="w-full sm:w-auto shadow-sm">
                    {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {showForm ? 'Cancel' : 'Record Vitals'}
                </Button>
            </div>

            {/* Real-time New Vital Alert */}
            {newVitalAlert && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse shadow-sm">
                    <Activity className="h-5 w-5" />
                    <span className="font-medium text-sm">New vital signs recorded by a patient!</span>
                    <button onClick={() => setNewVitalAlert(false)} className="ml-auto text-emerald-800 dark:text-emerald-300 underline text-sm hover:text-emerald-900">Dismiss</button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md" className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-950 border-red-100 dark:border-red-900/30">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl w-fit mb-3">
                        <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{vitals.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Records</p>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-950 border-blue-100 dark:border-blue-900/30">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl w-fit mb-3">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uniquePatients}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Patients Tracked</p>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-950 border-emerald-100 dark:border-emerald-900/30">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl w-fit mb-3">
                        <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{todayCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recorded Today</p>
                </Card>
                <Card padding="md" className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-gray-950 border-orange-100 dark:border-orange-900/30">
                    <div className="p-2.5 bg-orange-100 dark:bg-orange-900/40 rounded-xl w-fit mb-3">
                        <Thermometer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patientList.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Your Patients</p>
                </Card>
            </div>

            {/* Record Vitals Form Modal-style Inline */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 shadow-lg shadow-emerald-900/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Record New Vitals</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Log clinical measurements for a patient.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="w-8 h-8 p-0 text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                            <Wind className="h-4 w-4" /> {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select Patient <span className="text-red-500">*</span></label>
                            <select
                                value={form.patientId}
                                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:text-gray-200"
                            >
                                <option value="">-- Choose a patient --</option>
                                {patientList.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Blood Pressure</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        placeholder="Sys"
                                        value={form.bloodPressureSystolic}
                                        onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })}
                                        className="pr-8"
                                    />
                                </div>
                                <span className="text-gray-400 font-light text-xl">/</span>
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        placeholder="Dia"
                                        value={form.bloodPressureDiastolic}
                                        onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Heart Rate</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 72"
                                    value={form.heartRate}
                                    onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                                    className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">bpm</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Temperature</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 98.6"
                                    value={form.temperature}
                                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                                    className="pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">°F</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Oxygen (SpO2)</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 98"
                                    value={form.oxygenLevel}
                                    onChange={(e) => setForm({ ...form, oxygenLevel: e.target.value })}
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Respiratory Rate</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 16"
                                    value={form.respiratoryRate}
                                    onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })}
                                    className="pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">/ min</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Weight</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 70"
                                    value={form.weight}
                                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                    className="pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">kg</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Blood Sugar</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 110"
                                    value={form.bloodSugar}
                                    onChange={(e) => setForm({ ...form, bloodSugar: e.target.value })}
                                    className="pr-14"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">mg/dL</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clinical Notes</label>
                            <Input
                                placeholder="Any additional observations..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                            {isSaving ? 'Saving...' : 'Save Vitals'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Vitals History Table */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/50">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vitals History</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="pl-9 bg-white dark:bg-gray-950"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Patient</th>
                                <th className="px-6 py-4 font-semibold">BP (mmHg)</th>
                                <th className="px-6 py-4 font-semibold">Heart Rate</th>
                                <th className="px-6 py-4 font-semibold">Temp (°F)</th>
                                <th className="px-6 py-4 font-semibold">SpO2</th>
                                <th className="px-6 py-4 font-semibold">Recorded At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {paginatedItems.length > 0 ? (
                                paginatedItems.map((vital: any) => {
                                    const bpStatus = getBPStatus(vital.bloodPressureSystolic, vital.bloodPressureDiastolic);
                                    const tempStatus = getTempStatus(vital.temperature);
                                    const spo2Status = getSpO2Status(vital.oxygenLevel);
                                    
                                    return (
                                        <tr key={vital.id} className="bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{vital.patientName || 'Unknown Patient'}</p>
                                                {vital.notes && <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{vital.notes}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vital.bloodPressureSystolic && vital.bloodPressureDiastolic ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-medium text-gray-900 dark:text-gray-200">
                                                            {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                                                        </span>
                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${bpStatus.bg} ${bpStatus.color}`}>
                                                            {bpStatus.label}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vital.heartRate ? (
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{vital.heartRate} <span className="text-xs text-gray-500 font-normal">bpm</span></span>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vital.temperature ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-medium text-gray-900 dark:text-gray-200">
                                                            {vital.temperature}°
                                                        </span>
                                                        {vital.temperature > 99.5 && (
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${tempStatus.bg} ${tempStatus.color}`}>
                                                                {tempStatus.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vital.oxygenLevel ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-medium text-gray-900 dark:text-gray-200">
                                                            {vital.oxygenLevel}%
                                                        </span>
                                                        {vital.oxygenLevel < 95 && (
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${spo2Status.bg} ${spo2Status.color}`}>
                                                                {spo2Status.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                                                {new Date(vital.recordedAt || vital.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                            <Activity className="h-10 w-10 mb-3 text-gray-300 dark:text-gray-600" />
                                            <p className="font-medium">No Vitals Recorded</p>
                                            <p className="text-sm mt-1">Start by recording vitals for your patients.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </Card>
        </div>
    );
}
