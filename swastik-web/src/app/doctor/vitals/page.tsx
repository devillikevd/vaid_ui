'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Activity, Heart, Thermometer, Droplets, Loader2, Search,
    User, Plus, X, Wind, Scale, Droplet, Calendar, ChartArea
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
    if (!sys || !dia) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' };
    if (sys >= 140 || dia >= 90) return { label: 'High (HBP)', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50' };
    if (sys >= 130 || dia >= 80) return { label: 'Elevated', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' };
}

function getTempStatus(temp?: number) {
    if (!temp) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
    if (temp > 100.4) return { label: 'Fever', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50' };
    if (temp > 99.5) return { label: 'Elevated', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50' };
    if (temp < 95) return { label: 'Hypothermia', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' };
}

function getSpO2Status(spo2?: number) {
    if (!spo2) return { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
    if (spo2 < 90) return { label: 'Critical', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50' };
    if (spo2 < 95) return { label: 'Low', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50' };
    return { label: 'Normal', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' };
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

const VitalsSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-pulse pb-20">
        <div className="flex justify-between items-center">
            <div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg mt-2"></div>
            </div>
            <div className="h-10 w-36 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
            <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
            <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
            <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
        </div>
        <div className="h-[600px] bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
    </div>
);

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
            <div className="p-4 sm:p-6">
                <VitalsSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Patient Vitals</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-base font-medium">Monitor clinical metrics and track patient health trends</p>
                </div>
                <Button 
                    onClick={() => setShowForm(!showForm)} 
                    variant={showForm ? 'outline' : 'primary'} 
                    className={`w-full sm:w-auto shadow-sm font-bold rounded-xl transition-all ${
                        !showForm ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    }`}
                >
                    {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {showForm ? 'Cancel' : 'Record Vitals'}
                </Button>
            </div>

            {/* Real-time New Vital Alert */}
            {newVitalAlert && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-5 py-4 rounded-2xl flex items-center gap-4 animate-pulse shadow-sm">
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Activity className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-sm">New vital signs recorded by a patient!</span>
                    <button onClick={() => setNewVitalAlert(false)} className="ml-auto text-emerald-800 dark:text-emerald-300 underline font-semibold text-sm hover:text-emerald-900">Dismiss</button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex flex-col justify-center transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-rose-500 opacity-50"></div>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl w-fit mb-4 border border-red-100 dark:border-red-800/50 relative z-10 text-red-600 dark:text-red-400">
                        <Heart className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 relative z-10 tracking-tight">{vitals.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1 relative z-10">Total Records</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex flex-col justify-center transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-50"></div>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl w-fit mb-4 border border-blue-100 dark:border-blue-800/50 relative z-10 text-blue-600 dark:text-blue-400">
                        <User className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 relative z-10 tracking-tight">{uniquePatients}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1 relative z-10">Patients Tracked</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex flex-col justify-center transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-50"></div>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl w-fit mb-4 border border-emerald-100 dark:border-emerald-800/50 relative z-10 text-emerald-600 dark:text-emerald-400">
                        <Activity className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 relative z-10 tracking-tight">{todayCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1 relative z-10">Recorded Today</p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm flex flex-col justify-center transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500 opacity-50"></div>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-2xl w-fit mb-4 border border-orange-100 dark:border-orange-800/50 relative z-10 text-orange-600 dark:text-orange-400">
                        <Thermometer className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 relative z-10 tracking-tight">{patientList.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1 relative z-10">Your Patients</p>
                </div>
            </div>

            {/* Record Vitals Form Modal-style Inline */}
            {showForm && (
                <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 md:p-8 shadow-xl shadow-emerald-900/5 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Record New Vitals</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Log clinical measurements for a patient.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="w-10 h-10 p-0 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-3">
                            <Wind className="h-5 w-5 shrink-0" /> {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Patient <span className="text-red-500">*</span></label>
                            <select
                                value={form.patientId}
                                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 py-3.5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-200 transition-all outline-none"
                            >
                                <option value="">-- Choose a patient --</option>
                                {patientList.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Blood Pressure</label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        placeholder="Sys"
                                        value={form.bloodPressureSystolic}
                                        onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })}
                                        className="pr-8 rounded-2xl font-medium"
                                    />
                                </div>
                                <span className="text-gray-300 font-light text-2xl">/</span>
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        placeholder="Dia"
                                        value={form.bloodPressureDiastolic}
                                        onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })}
                                        className="rounded-2xl font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Heart Rate</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 72"
                                    value={form.heartRate}
                                    onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                                    className="pr-12 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">bpm</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Temperature</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 98.6"
                                    value={form.temperature}
                                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                                    className="pr-12 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">°F</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Oxygen (SpO2)</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 98"
                                    value={form.oxygenLevel}
                                    onChange={(e) => setForm({ ...form, oxygenLevel: e.target.value })}
                                    className="pr-10 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Respiratory Rate</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 16"
                                    value={form.respiratoryRate}
                                    onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })}
                                    className="pr-14 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">/ min</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Weight</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 70"
                                    value={form.weight}
                                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                    className="pr-12 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">kg</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Blood Sugar</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="e.g. 110"
                                    value={form.bloodSugar}
                                    onChange={(e) => setForm({ ...form, bloodSugar: e.target.value })}
                                    className="pr-16 rounded-2xl font-medium"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-wider text-gray-400 font-bold">mg/dL</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Clinical Notes</label>
                            <Input
                                placeholder="Any additional observations..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                className="rounded-2xl font-medium py-3"
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="outline" className="rounded-xl font-bold" onClick={() => setShowForm(false)}>Cancel</Button>
                        <Button className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                            {isSaving ? 'Saving...' : 'Save Vitals'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Vitals History Table */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-gray-50/30 dark:bg-gray-900/30">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Vitals History</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search patient..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="pl-11 bg-white dark:bg-gray-950 rounded-xl font-medium border-gray-200 dark:border-gray-800 focus:border-gray-300 focus:ring-0 shadow-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-widest bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 font-bold">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Patient</th>
                                <th className="px-6 py-4 whitespace-nowrap">Blood Pressure</th>
                                <th className="px-6 py-4 whitespace-nowrap">Heart Rate</th>
                                <th className="px-6 py-4 whitespace-nowrap">Temperature</th>
                                <th className="px-6 py-4 whitespace-nowrap">SpO2</th>
                                <th className="px-6 py-4 whitespace-nowrap">Recorded Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {paginatedItems.length > 0 ? (
                                paginatedItems.map((vital: any) => {
                                    const bpStatus = getBPStatus(vital.bloodPressureSystolic, vital.bloodPressureDiastolic);
                                    const tempStatus = getTempStatus(vital.temperature);
                                    const spo2Status = getSpO2Status(vital.oxygenLevel);
                                    
                                    return (
                                        <tr key={vital.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors duration-200 group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-600 dark:text-gray-400 font-bold flex items-center justify-center text-sm border border-gray-200 dark:border-gray-700 shadow-sm">
                                                        {(vital.patientName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{vital.patientName || 'Unknown Patient'}</p>
                                                        {vital.notes ? (
                                                            <p className="text-xs font-medium text-gray-500 mt-0.5 truncate max-w-[150px]">{vital.notes}</p>
                                                        ) : (
                                                            <p className="text-xs font-medium text-gray-400 mt-0.5">No notes provided</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {vital.bloodPressureSystolic && vital.bloodPressureDiastolic ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className={`px-3 py-1.5 rounded-xl border flex items-center justify-center font-bold text-sm tracking-wide ${bpStatus.bg} ${bpStatus.border} ${bpStatus.color}`}>
                                                            {vital.bloodPressureSystolic} / {vital.bloodPressureDiastolic}
                                                        </div>
                                                        {bpStatus.label !== 'Normal' && (
                                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${bpStatus.color}`}>
                                                                {bpStatus.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700 font-medium">—</span>}
                                            </td>
                                            <td className="px-6 py-5">
                                                {vital.heartRate ? (
                                                    <div className="flex items-center gap-2">
                                                        <Heart className="h-4 w-4 text-rose-500 shrink-0" fill="currentColor" fillOpacity={0.2} />
                                                        <span className="font-extrabold text-gray-900 dark:text-gray-100 text-base">{vital.heartRate} <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider ml-0.5">bpm</span></span>
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700 font-medium">—</span>}
                                            </td>
                                            <td className="px-6 py-5">
                                                {vital.temperature ? (
                                                    <div className="flex items-center gap-2">
                                                        <Thermometer className={`h-4 w-4 shrink-0 ${tempStatus.label === 'Normal' ? 'text-gray-400' : tempStatus.color}`} />
                                                        <div className="flex flex-col">
                                                            <span className="font-extrabold text-gray-900 dark:text-gray-100 text-base">
                                                                {vital.temperature}°
                                                            </span>
                                                            {tempStatus.label !== 'Normal' && (
                                                                <span className={`text-[10px] uppercase font-bold tracking-wider ${tempStatus.color}`}>
                                                                    {tempStatus.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700 font-medium">—</span>}
                                            </td>
                                            <td className="px-6 py-5">
                                                {vital.oxygenLevel ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`px-2 py-1 rounded-lg border font-bold text-sm ${spo2Status.bg} ${spo2Status.border} ${spo2Status.color}`}>
                                                            {vital.oxygenLevel}%
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-300 dark:text-gray-700 font-medium">—</span>}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {new Date(vital.recordedAt || vital.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-5 border border-gray-100 dark:border-gray-800">
                                                <ChartArea className="h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                                            </div>
                                            <p className="font-extrabold text-gray-900 dark:text-gray-100 text-xl tracking-tight mb-2">No vitals recorded yet</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Start by recording your first patient vitals to monitor their clinical metrics and track health trends over time.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}
