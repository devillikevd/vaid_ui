'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { BedDouble, Plus, UserPlus, ArrowLeftRight, LogOut, FileText, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function IPDManagementPage() {
    const toast = useToast();
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [form, setForm] = useState({
        patientId: '',
        wardId: '',
        bedId: '',
        attendingDoctorId: '',
        chiefComplaint: '',
        provisionalDiagnosis: '',
        admissionType: 'regular',
    });
    const [census, setCensus] = useState<any>(null);

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            const res = await hospitalApi.getAdmissions(params);
            if (res.success) {
                const d = (res.data ?? res) as any;
                setAdmissions(d.data || []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
            const cRes = await hospitalApi.getIPDCensus();
            if (cRes.success) setCensus((cRes.data ?? cRes) as any);
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        const loadAuxData = async () => {
            try {
                const [docRes, wardRes, bedRes] = await Promise.all([
                    hospitalApi.getDoctors(1, '', 100),
                    hospitalApi.getWards(),
                    hospitalApi.getBeds({ limit: 300 }),
                ]);
                if (docRes.success) {
                    const docList = (docRes.data as any)?.doctors || (docRes.data as any)?.data || docRes.data || [];
                    setDoctors(Array.isArray(docList) ? docList : []);
                }
                if (wardRes.success) {
                    const wList = (wardRes.data as any)?.wards || (wardRes as any)?.wards || [];
                    setWards(Array.isArray(wList) ? wList : []);
                }
                if (bedRes.success) {
                    const bList = (bedRes.data as any)?.data || (bedRes as any)?.data || [];
                    setBeds(Array.isArray(bList) ? bList : []);
                }
            } catch (e) {
                console.error('Failed to load auxiliary admission data', e);
            }
        };
        loadAuxData();
    }, []);

    const handleAdmit = async () => {
        if (!form.patientId) {
            toast.error('Validation Error', 'Patient ID is required');
            return;
        }
        try {
            const res = await hospitalApi.createAdmission({
                patientId: form.patientId,
                attendingDoctorId: form.attendingDoctorId || undefined,
                wardId: form.wardId || undefined,
                bedId: form.bedId || undefined,
                chiefComplaint: form.chiefComplaint || undefined,
                provisionalDiagnosis: form.provisionalDiagnosis || undefined,
                admissionType: form.admissionType,
            });
            if (res.success) {
                toast.success('Patient Admitted', 'In-patient admission created successfully');
                setShowForm(false);
                setForm({
                    patientId: '',
                    wardId: '',
                    bedId: '',
                    attendingDoctorId: '',
                    chiefComplaint: '',
                    provisionalDiagnosis: '',
                    admissionType: 'regular',
                });
                fetch();
            } else {
                toast.error('Admission Failed', res.error || 'Could not create admission');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const availableBeds = form.wardId
        ? beds.filter(b => b.ward_id === form.wardId && b.status === 'available')
        : beds.filter(b => b.status === 'available');

    const statuses = ['', 'pending', 'admitted', 'discharged', 'transferred'];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><BedDouble className="h-6 w-6" /> IPD Management</h1>
                    <p className="text-violet-200 text-sm mt-1">Admissions, bed assignments, and discharge operations</p>
                </div>
                <Button className="bg-white text-violet-700 hover:bg-violet-50 font-semibold" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Patient Admission
                </Button>
            </div>

            {/* Census Cards */}
            {census && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Current Census', value: census.total_admitted || 0, color: 'text-violet-600' },
                        { label: 'Admissions Today', value: census.admissions_today || 0, color: 'text-green-600' },
                        { label: 'Discharges Today', value: census.discharges_today || 0, color: 'text-blue-600' },
                        { label: 'Pending Discharge', value: census.pending_discharge || 0, color: 'text-amber-600' },
                    ].map(s => (
                        <Card key={s.label}>
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-gray-500">{s.label}</p>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {statuses.map(s => (
                    <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                        {s ? s.toUpperCase() : 'ALL ADMISSIONS'}
                    </button>
                ))}
            </div>

            {/* Admission Form Modal */}
            {showForm && (
                <Card className="border-violet-200 dark:border-violet-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">New In-Patient Admission</CardTitle>
                        <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Patient UUID or Medical Record ID *</label>
                                <input
                                    placeholder="Enter Patient ID *"
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.patientId}
                                    onChange={e => setForm({ ...form, patientId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Attending Doctor</label>
                                <select
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.attendingDoctorId}
                                    onChange={e => setForm({ ...form, attendingDoctorId: e.target.value })}
                                >
                                    <option value="">Select Attending Doctor</option>
                                    {doctors.map((d: any) => (
                                        <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
                                            {d.user?.name || d.name || 'Doctor'} {d.specialization ? `(${d.specialization})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Assign Ward</label>
                                <select
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.wardId}
                                    onChange={e => setForm({ ...form, wardId: e.target.value, bedId: '' })}
                                >
                                    <option value="">Select Ward</option>
                                    {wards.map((w: any) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.ward_type}) — Available: {Math.max(0, (w.total_beds || 0) - (w.occupied_beds || 0))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Assign Bed</label>
                                <select
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.bedId}
                                    onChange={e => setForm({ ...form, bedId: e.target.value })}
                                >
                                    <option value="">Select Available Bed</option>
                                    {availableBeds.map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                            Bed {b.bed_number} ({b.bed_type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Chief Complaint</label>
                                <input
                                    placeholder="e.g. Acute severe abdominal pain, persistent fever"
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.chiefComplaint}
                                    onChange={e => setForm({ ...form, chiefComplaint: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Provisional Diagnosis</label>
                                <input
                                    placeholder="e.g. Acute Appendicitis"
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.provisionalDiagnosis}
                                    onChange={e => setForm({ ...form, provisionalDiagnosis: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Admission Type</label>
                                <select
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.admissionType}
                                    onChange={e => setForm({ ...form, admissionType: e.target.value })}
                                >
                                    <option value="regular">Regular / Elective</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="transfer_in">Transfer In</option>
                                    <option value="day_care">Day Care</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button onClick={handleAdmit} className="bg-violet-600 hover:bg-violet-700 text-white">Create Admission</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Admission #</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Patient</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Doctor</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Ward / Bed</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-500">Admitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && !admissions.length ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                                ) : admissions.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No admissions found</td></tr>
                                ) : admissions.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 font-bold">{a.admission_number || '—'}</td>
                                        <td className="px-4 py-3 font-semibold">{a.patient?.name || 'Patient'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.attendingDoctor?.name || a.attending_doctor?.name || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.ward?.name || '—'} / {a.bed?.bed_number ? `Bed ${a.bed.bed_number}` : '—'}</td>
                                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{a.admitted_at ? new Date(a.admitted_at).toLocaleDateString() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {pagination.totalPages > 1 && (
                <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => fetch(p)} />
            )}
        </div>
    );
}
