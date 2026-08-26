'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { HeartPulse, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function NursingStationPage() {
    const toast = useToast();
    const [tasks, setTasks] = useState<any[]>([]);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ admissionId: '', taskType: 'vitals', taskDescription: '', scheduledAt: '', priority: 'routine' });

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await hospitalApi.getNursingTasks(params);
            if (res.success) {
                const d = (res.data ?? res) as any;
                setTasks(d.data || []);
                setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    useEffect(() => {
        const loadAdmissions = async () => {
            try {
                const res = await hospitalApi.getAdmissions({ status: 'admitted', limit: 100 });
                if (res.success) {
                    const list = (res.data as any)?.data || (res as any)?.data || [];
                    setAdmissions(Array.isArray(list) ? list : []);
                }
            } catch (e) {
                console.error('Failed to load active admissions', e);
            }
        };
        loadAdmissions();
    }, []);

    const handleCreate = async () => {
        if (!form.admissionId || !form.taskDescription) {
            toast.error('Validation Error', 'Admitted patient and task description are required');
            return;
        }
        try {
            const res = await hospitalApi.createNursingTask({
                ...form,
                scheduledAt: form.scheduledAt || new Date().toISOString(),
            });
            if (res.success) {
                toast.success('Task Created', 'Nursing task scheduled successfully');
                setShowForm(false);
                setForm({ admissionId: '', taskType: 'vitals', taskDescription: '', scheduledAt: '', priority: 'routine' });
                fetch();
            } else {
                toast.error('Failed', res.error || 'Could not create task');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const handleStatus = async (id: string, status: string) => {
        await hospitalApi.updateNursingTask(id, status);
        fetch();
    };

    const taskTypes = ['vitals', 'medication', 'iv_fluids', 'wound_care', 'catheter_care', 'nebulization', 'blood_sugar', 'intake_output', 'position_change', 'assessment', 'education', 'discharge_prep', 'other'];
    const priorityColors: Record<string, string> = { routine: 'bg-gray-100 text-gray-600', urgent: 'bg-amber-100 text-amber-700', stat: 'bg-red-100 text-red-700' };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><HeartPulse className="h-6 w-6" /> Nursing Station Desk</h1>
                    <p className="text-rose-100 text-sm mt-1">Ward task management, vitals schedule & medication administration records (MAR)</p>
                </div>
                <Button className="bg-white text-rose-700 hover:bg-rose-50 font-semibold" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Nursing Task
                </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'pending', 'in_progress', 'completed', 'overdue', 'escalated'].map(s => (
                    <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${statusFilter === s ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                        {s ? s.toUpperCase() : 'ALL TASKS'}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="border-rose-200 dark:border-rose-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">New Nursing / MAR Task</CardTitle>
                        <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-gray-400" /></button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="sm:col-span-1">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Select In-Patient *</label>
                                <select
                                    className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800"
                                    value={form.admissionId}
                                    onChange={e => setForm({ ...form, admissionId: e.target.value })}
                                >
                                    <option value="">Select Admitted Patient *</option>
                                    {admissions.map((a: any) => (
                                        <option key={a.id} value={a.id}>
                                            {a.patient?.name || 'Patient'} — {a.ward?.name || 'Ward'} (Bed {a.bed?.bed_number || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Task Category</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value })}>
                                    {taskTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
                                <select className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT (Immediate)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Task Instructions / Medication Details *</label>
                                <input placeholder="e.g. Administer Inj. Pantop 40mg IV stat, record BP & SpO2" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.taskDescription} onChange={e => setForm({ ...form, taskDescription: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Scheduled Time</label>
                                <input type="datetime-local" className="border rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button onClick={handleCreate} className="bg-rose-600 hover:bg-rose-700 text-white">Create Task</Button>
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
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Type</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Description</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Ward</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Priority</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Scheduled</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {tasks.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{loading ? 'Loading...' : 'No nursing tasks found.'}</td></tr>
                                ) : tasks.map((t: any) => (
                                    <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${t.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                                        <td className="px-4 py-2.5 capitalize text-xs font-semibold">{t.task_type?.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-2.5 max-w-[220px] truncate font-medium text-gray-900 dark:text-white">{t.task_description}</td>
                                        <td className="px-4 py-2.5 font-medium">{t.admission?.patient?.name || '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{t.ward?.name || '—'}</td>
                                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</span></td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                                        <td className="px-4 py-2.5 flex gap-1">
                                            {t.status === 'pending' && <button onClick={() => handleStatus(t.id, 'in_progress')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold rounded">Start</button>}
                                            {t.status === 'in_progress' && <button onClick={() => handleStatus(t.id, 'completed')} className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-semibold rounded">Done</button>}
                                            {['pending', 'in_progress'].includes(t.status) && <button onClick={() => handleStatus(t.id, 'escalated')} className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold rounded">Escalate</button>}
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
