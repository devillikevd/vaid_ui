'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { Scissors, Plus, Calendar, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OTSchedulingPage() {
    const toast = useToast();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        otRoomId: '',
        patientId: '',
        primarySurgeonId: '',
        surgeryName: '',
        scheduledStart: '',
        estimatedDuration: '60',
        priority: 'elective',
        anesthesiaType: 'general',
    });
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const [sRes, rRes] = await Promise.all([
                hospitalApi.getOtSchedules({ page, limit: 15, date: dateFilter }),
                hospitalApi.getOtRooms(),
            ]);
            if (sRes.success) {
                const d = (sRes.data ?? sRes) as any;
                setSchedules(d.data || []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
            if (rRes.success) setRooms((rRes.data as any)?.rooms ?? (rRes as any)?.rooms ?? []);
        } finally { setLoading(false); }
    }, [dateFilter]);

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

    const handleSchedule = async () => {
        if (!form.otRoomId || !form.patientId || !form.primarySurgeonId || !form.surgeryName || !form.scheduledStart) {
            toast.error('Validation Error', 'OT Room, Patient ID, Surgeon, Surgery Name & Date are required');
            return;
        }
        try {
            const res = await hospitalApi.scheduleOt({ ...form, estimatedDuration: parseInt(form.estimatedDuration) });
            if (res.success) {
                toast.success('Surgery Scheduled', 'OT booking created successfully');
                setShowForm(false);
                setForm({
                    otRoomId: '',
                    patientId: '',
                    primarySurgeonId: '',
                    surgeryName: '',
                    scheduledStart: '',
                    estimatedDuration: '60',
                    priority: 'elective',
                    anesthesiaType: 'general',
                });
                fetch();
            } else {
                toast.error('Scheduling Failed', res.error || 'Could not schedule OT');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const handleStatus = async (id: string, status: string) => {
        await hospitalApi.updateOtStatus(id, status);
        fetch();
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Scissors className="h-6 w-6" /> Operation Theatre (OT) Scheduling</h1>
                    <p className="text-red-100 text-sm mt-1">Surgery rosters, OT room management & surgical records</p>
                </div>
                <Button className="bg-white text-red-700 hover:bg-red-50 font-semibold" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Schedule Surgery
                </Button>
            </div>

            {/* Date picker & room count */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <input type="date" className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                </div>
                <div className="text-sm text-gray-500">{rooms.length} OT Rooms configured</div>
            </div>

            {/* OT Room status cards */}
            {rooms.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {rooms.map((r: any) => (
                        <Card key={r.id} className={`${r.is_active ? 'border-green-200 dark:border-green-900' : 'border-gray-300 opacity-60'}`}>
                            <CardContent className="p-3 text-center">
                                <p className="font-semibold text-sm">{r.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{r.room_type}</p>
                                <p className={`text-xs mt-1 font-bold ${r.is_active ? 'text-green-600' : 'text-gray-400'}`}>{r.is_active ? 'Active Room' : 'Inactive'}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showForm && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">Schedule Surgical Procedure</CardTitle>
                        <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">OT Room *</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.otRoomId} onChange={e => setForm({ ...form, otRoomId: e.target.value })}>
                                    <option value="">Select OT Room *</option>
                                    {rooms.filter((r: any) => r.is_active).map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.room_type})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Primary Surgeon *</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.primarySurgeonId} onChange={e => setForm({ ...form, primarySurgeonId: e.target.value })}>
                                    <option value="">Select Surgeon *</option>
                                    {doctors.map((d: any) => (
                                        <option key={d.id || d.doctor_id} value={d.id || d.doctor_id}>
                                            {d.user?.name || d.name || 'Surgeon'} {d.specialization ? `(${d.specialization})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Patient UUID / ID *</label>
                                <input placeholder="Enter Patient ID *" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Surgery Procedure Name *</label>
                                <input placeholder="e.g. Laparoscopic Cholecystectomy / ACL Reconstruction" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.surgeryName} onChange={e => setForm({ ...form, surgeryName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Scheduled Start Time *</label>
                                <input type="datetime-local" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.scheduledStart} onChange={e => setForm({ ...form, scheduledStart: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Est. Duration (Minutes)</label>
                                <input placeholder="Duration (min)" type="number" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.estimatedDuration} onChange={e => setForm({ ...form, estimatedDuration: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="elective">Elective</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Anesthesia Type</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.anesthesiaType} onChange={e => setForm({ ...form, anesthesiaType: e.target.value })}>
                                    <option value="general">General Anesthesia</option><option value="spinal">Spinal Anesthesia</option><option value="epidural">Epidural</option><option value="local">Local Anesthesia</option><option value="regional">Regional Block</option><option value="sedation">IV Sedation</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button onClick={handleSchedule} className="bg-red-600 hover:bg-red-700 text-white">Schedule OT</Button>
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
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Time</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Surgery</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Room</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Surgeon</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Priority</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {schedules.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{loading ? 'Loading...' : 'No surgeries scheduled for this date'}</td></tr>
                                ) : schedules.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-2.5 text-xs font-mono">{s.scheduled_start ? new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                        <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">{s.surgery_name}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">{s.room?.name || '—'}</td>
                                        <td className="px-4 py-2.5">{s.patient?.name || '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">{s.primarySurgeon?.name || s.primary_surgeon?.name || '—'}</td>
                                        <td className="px-4 py-2.5 capitalize text-xs font-medium">{s.priority}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                                        <td className="px-4 py-2.5 flex gap-1">
                                            {s.status === 'scheduled' && <button onClick={() => handleStatus(s.id, 'in_progress')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded font-semibold">Start</button>}
                                            {s.status === 'in_progress' && <button onClick={() => handleStatus(s.id, 'recovery')} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded font-semibold">Recovery</button>}
                                            {s.status === 'recovery' && <button onClick={() => handleStatus(s.id, 'completed')} className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 rounded font-semibold">Done</button>}
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
