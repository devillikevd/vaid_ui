'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalApi } from '@/lib/api';
import { ListOrdered, Plus, ArrowRight, Clock, Users, CheckCircle } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OPDQueuePage() {
    const [queueData, setQueueData] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [form, setForm] = useState({ doctorId: '', patientName: '', patientPhone: '', reason: '', priority: '0', source: 'walk_in' });
    const [doctorFilter, setDoctorFilter] = useState('');

    useEffect(() => {
        const fetchDoctors = async () => {
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
        fetchDoctors();
    }, []);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (doctorFilter) params.doctorId = doctorFilter;
            const [qRes, sRes] = await Promise.all([
                hospitalApi.getQueue(params),
                hospitalApi.getQueueStats(),
            ]);
            if (qRes.success) setQueueData((qRes.data ?? qRes) as any);
            if (sRes.success) setStats((sRes.data ?? sRes) as any);
        } finally { setLoading(false); }
    }, [doctorFilter]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);
    // Auto-refresh every 15s
    useEffect(() => { const iv = setInterval(fetchQueue, 15_000); return () => clearInterval(iv); }, [fetchQueue]);

    const handleGenerate = async () => {
        if (!form.doctorId) return;
        const res = await hospitalApi.generateQueueToken({
            doctorId: form.doctorId,
            patientName: form.patientName,
            patientPhone: form.patientPhone,
            reason: form.reason,
            priority: parseInt(form.priority),
            source: form.source,
        });
        if (res.success) { setShowForm(false); fetchQueue(); }
    };

    const handleCallNext = async (doctorId: string) => {
        await hospitalApi.callNextPatient(doctorId);
        fetchQueue();
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        await hospitalApi.updateQueueStatus(id, status);
        fetchQueue();
    };

    const q = queueData || {};
    const queue = q.queue || [];
    const qStats = q.stats || {};

    const statusColors: Record<string, string> = {
        waiting: 'bg-amber-100 text-amber-800',
        in_consultation: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        skipped: 'bg-gray-100 text-gray-600',
        no_show: 'bg-red-100 text-red-600',
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ListOrdered className="h-6 w-6" /> OPD Queue</h1>
                    <p className="text-amber-100 text-sm mt-1">Digital token management • Auto-refreshes every 15s</p>
                </div>
                <Button className="bg-white text-amber-700 hover:bg-amber-50" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Generate Token
                </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card><CardContent className="p-4 text-center">
                    <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-2xl font-bold text-amber-600">{qStats.waiting || 0}</p>
                    <p className="text-xs text-gray-500">Waiting</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{qStats.in_consultation || 0}</p>
                    <p className="text-xs text-gray-500">In Consultation</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <p className="text-2xl font-bold text-green-600">{qStats.completed || 0}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                    <ListOrdered className="h-5 w-5 mx-auto text-gray-500 mb-1" />
                    <p className="text-2xl font-bold">{qStats.total || 0}</p>
                    <p className="text-xs text-gray-500">Total Tokens</p>
                </CardContent></Card>
            </div>

            {/* Current / Next Display */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-blue-500 font-medium">NOW SERVING</p>
                        <p className="text-4xl font-bold text-blue-700 mt-1">{q.current_token || '—'}</p>
                    </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4 text-center">
                        <p className="text-xs text-amber-500 font-medium">NEXT</p>
                        <p className="text-4xl font-bold text-amber-700 mt-1">{q.next_token || '—'}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Token Form */}
            {showForm && (
                <Card className="border-amber-200">
                    <CardHeader><CardTitle className="text-sm">Generate Token</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <select
                                className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800"
                                value={form.doctorId}
                                onChange={e => setForm({ ...form, doctorId: e.target.value })}
                            >
                                <option value="">Select Attending Doctor *</option>
                                {doctors.map((d: any) => (
                                    <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
                                        {d.user?.name || d.name || 'Doctor'} {d.specialization ? `(${d.specialization})` : ''}
                                    </option>
                                ))}
                            </select>
                            <input placeholder="Patient Name *" className="border rounded-lg px-3 py-2 text-sm" value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} />
                            <input placeholder="Patient Phone" className="border rounded-lg px-3 py-2 text-sm" value={form.patientPhone} onChange={e => setForm({ ...form, patientPhone: e.target.value })} />
                            <input placeholder="Reason / Chief Complaint" className="border rounded-lg px-3 py-2 text-sm" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                            <select className="border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                <option value="0">Normal</option>
                                <option value="1">Priority</option>
                                <option value="2">VIP</option>
                                <option value="3">Emergency</option>
                            </select>
                            <select className="border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                <option value="walk_in">Walk-in</option>
                                <option value="appointment">Appointment</option>
                                <option value="referral">Referral</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleGenerate} className="bg-amber-600 hover:bg-amber-700 text-white">Generate</Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Queue List */}
            <Card>
                <CardHeader><CardTitle className="text-sm">Queue ({queue.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Token</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Doctor</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Wait</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {queue.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Queue is empty</td></tr>
                                ) : queue.map((entry: any) => (
                                    <tr key={entry.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2.5 font-bold text-lg">{entry.display_token}</td>
                                        <td className="px-4 py-2.5">{entry.patient?.name || entry.patient_name || '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-600">{entry.doctor?.name || '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.status] || 'bg-gray-100'}`}>
                                                {entry.status?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{entry.estimated_wait_minutes || 0}m</td>
                                        <td className="px-4 py-2.5 flex gap-1">
                                            {entry.status === 'waiting' && (
                                                <>
                                                    <button onClick={() => handleStatusUpdate(entry.id, 'in_consultation')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Call</button>
                                                    <button onClick={() => handleStatusUpdate(entry.id, 'skipped')} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Skip</button>
                                                </>
                                            )}
                                            {entry.status === 'in_consultation' && (
                                                <button onClick={() => handleStatusUpdate(entry.id, 'completed')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Complete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
