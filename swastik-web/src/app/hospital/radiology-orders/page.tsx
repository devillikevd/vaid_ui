'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { ScanLine, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RadiologyOrdersPage() {
    const toast = useToast();
    const [orders, setOrders] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        patientId: '',
        orderingDoctorId: '',
        modality: 'xray',
        bodyPart: '',
        clinicalIndication: '',
        priority: 'routine',
        contrastRequired: false,
    });

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await hospitalApi.getRadiologyOrders(params);
            if (res.success) {
                const d = (res.data ?? res) as any;
                setOrders(d.data || []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        const loadDoctors = async () => {
            try {
                const res = await hospitalApi.getDoctors(1, '', 100);
                if (res.success) {
                    const docList = (res.data as any)?.doctors || (res.data as any)?.data || res.data || [];
                    setDoctors(Array.isArray(docList) ? docList : []);
                }
            } catch (e) {
                console.error('Failed to load doctors', e);
            }
        };
        loadDoctors();
    }, []);

    const handleCreate = async () => {
        if (!form.patientId || !form.orderingDoctorId || !form.bodyPart) {
            toast.error('Validation Error', 'Patient ID, Ordering Doctor, and Body Part are required');
            return;
        }
        try {
            const res = await hospitalApi.createRadiologyOrder(form);
            if (res.success) {
                toast.success('Radiology Order Placed', `${form.modality.toUpperCase()} order scheduled`);
                setShowForm(false);
                setForm({
                    patientId: '',
                    orderingDoctorId: '',
                    modality: 'xray',
                    bodyPart: '',
                    clinicalIndication: '',
                    priority: 'routine',
                    contrastRequired: false,
                });
                fetch();
            } else {
                toast.error('Creation Failed', res.error || 'Could not place scan order');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const handleStatus = async (id: string, status: string) => {
        await hospitalApi.updateRadiologyOrderStatus(id, status);
        fetch();
    };

    const modalities = ['xray', 'ct', 'mri', 'ultrasound', 'mammography', 'pet_ct', 'dexa', 'fluoroscopy', 'interventional'];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="h-6 w-6" /> Radiology & Diagnostic Imaging</h1>
                    <p className="text-pink-100 text-sm mt-1">X-Ray, CT Scan, MRI, Ultrasound orders & radiological reports</p>
                </div>
                <Button className="bg-white text-pink-700 hover:bg-pink-50 font-semibold" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Imaging Order
                </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'ordered', 'scheduled', 'in_progress', 'completed', 'report_ready', 'report_approved'].map(s => (
                    <button
                        key={s || 'all'}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            statusFilter === s ? 'bg-pink-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        {s ? s.replace(/_/g, ' ') : 'All Scans'}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="border-pink-200 dark:border-pink-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">New Radiology Scan Order</CardTitle>
                        <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Patient UUID / ID *</label>
                                <input placeholder="Enter Patient ID *" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Ordering Doctor *</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.orderingDoctorId} onChange={e => setForm({ ...form, orderingDoctorId: e.target.value })}>
                                    <option value="">Select Doctor *</option>
                                    {doctors.map((d: any) => (
                                        <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
                                            {d.user?.name || d.name || 'Doctor'} {d.specialization ? `(${d.specialization})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Modality *</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })}>
                                    {modalities.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Body Part *</label>
                                <input placeholder="e.g. Chest AP / Lumbar Spine" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.bodyPart} onChange={e => setForm({ ...form, bodyPart: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Clinical Indication</label>
                                <input placeholder="e.g. Persistent dry cough, Rule out pneumonia" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.clinicalIndication} onChange={e => setForm({ ...form, clinicalIndication: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT (Emergency)</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-1">
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <input type="checkbox" className="rounded" checked={form.contrastRequired} onChange={e => setForm({ ...form, contrastRequired: e.target.checked })} />
                                IV Contrast Agent Required
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button onClick={handleCreate} className="bg-pink-600 hover:bg-pink-700 text-white font-semibold">Create Order</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Order #</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Modality</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Body Part</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && !orders.length ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading imaging orders...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No radiology orders found</td></tr>
                                ) : orders.map((o: any) => (
                                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{o.order_number || '—'}</td>
                                        <td className="px-4 py-2.5 font-semibold uppercase text-xs text-pink-700 dark:text-pink-400">{o.modality}</td>
                                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{o.body_part || '—'}</td>
                                        <td className="px-4 py-2.5">{o.patient?.name || o.patient_name || '—'}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex gap-1">
                                                {o.status === 'ordered' && <button onClick={() => handleStatus(o.id, 'scheduled')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded font-semibold">Schedule</button>}
                                                {o.status === 'scheduled' && <button onClick={() => handleStatus(o.id, 'in_progress')} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded font-semibold">Start</button>}
                                                {o.status === 'in_progress' && <button onClick={() => handleStatus(o.id, 'completed')} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded font-semibold">Complete</button>}
                                                {o.status === 'completed' && <button onClick={() => handleStatus(o.id, 'report_ready')} className="text-xs px-2 py-1 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded font-semibold">Report</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            {pagination.totalPages > 1 && <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={p => fetch(p)} />}
        </div>
    );
}
