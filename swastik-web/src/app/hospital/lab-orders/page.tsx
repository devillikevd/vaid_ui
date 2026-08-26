'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { TestTube, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LabOrdersPage() {
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
        testName: '',
        testCategory: 'Biochemistry',
        priority: 'routine',
        clinicalNotes: '',
    });

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await hospitalApi.getLabOrders(params);
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
        if (!form.patientId || !form.orderingDoctorId || !form.testName) {
            toast.error('Validation Error', 'Patient ID, Ordering Doctor, and Test Name are required');
            return;
        }
        try {
            const res = await hospitalApi.createLabOrder(form);
            if (res.success) {
                toast.success('Lab Order Created', 'Order placed successfully');
                setShowForm(false);
                setForm({
                    patientId: '',
                    orderingDoctorId: '',
                    testName: '',
                    testCategory: 'Biochemistry',
                    priority: 'routine',
                    clinicalNotes: '',
                });
                fetch();
            } else {
                toast.error('Creation Failed', res.error || 'Could not place lab order');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const handleStatus = async (id: string, status: string) => {
        await hospitalApi.updateLabOrderStatus(id, status);
        fetch();
    };

    const statuses = ['', 'ordered', 'sample_collected', 'processing', 'completed', 'report_ready', 'report_approved'];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><TestTube className="h-6 w-6" /> Pathology & Lab Orders</h1>
                    <p className="text-orange-100 text-sm mt-1">Diagnostic sample tracking, laboratory testing & report publishing</p>
                </div>
                <Button className="bg-white text-orange-700 hover:bg-orange-50 font-semibold" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Lab Order
                </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {statuses.map(s => (
                    <button
                        key={s || 'all'}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            statusFilter === s ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        {s ? s.replace(/_/g, ' ') : 'All Tests'}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="border-orange-200 dark:border-orange-900">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">New Diagnostic Lab Order</CardTitle>
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
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Test Name *</label>
                                <input placeholder="e.g. Complete Blood Count (CBC)" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.testCategory} onChange={e => setForm({ ...form, testCategory: e.target.value })}>
                                    <option value="Biochemistry">Biochemistry</option>
                                    <option value="Hematology">Hematology</option>
                                    <option value="Microbiology">Microbiology</option>
                                    <option value="Serology">Serology</option>
                                    <option value="Histopathology">Histopathology</option>
                                    <option value="Urinalysis">Urinalysis</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT (Emergency)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Clinical Notes</label>
                                <input placeholder="Fasting required, special instructions..." className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.clinicalNotes} onChange={e => setForm({ ...form, clinicalNotes: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold">Create Order</Button>
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
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Test</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Doctor</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Priority</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && !orders.length ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading lab orders...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No lab orders found</td></tr>
                                ) : orders.map((o: any) => (
                                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{o.order_number}</td>
                                        <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">
                                            {o.test_name}
                                            {o.test_category && <span className="block text-[11px] text-gray-400 font-normal">{o.test_category}</span>}
                                        </td>
                                        <td className="px-4 py-2.5">{o.patient?.name || o.patient_name || '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">{o.doctor?.name || o.ordering_doctor?.name || '—'}</td>
                                        <td className="px-4 py-2.5 capitalize text-xs font-medium">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                o.priority === 'stat' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                                                o.priority === 'urgent' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                                {o.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex gap-1">
                                                {o.status === 'ordered' && <button onClick={() => handleStatus(o.id, 'sample_collected')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded font-semibold">Collect Sample</button>}
                                                {o.status === 'sample_collected' && <button onClick={() => handleStatus(o.id, 'processing')} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded font-semibold">Process</button>}
                                                {o.status === 'processing' && <button onClick={() => handleStatus(o.id, 'completed')} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded font-semibold">Complete</button>}
                                                {o.status === 'completed' && <button onClick={() => handleStatus(o.id, 'report_ready')} className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 rounded font-semibold">Ready</button>}
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
