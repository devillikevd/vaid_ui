'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { ShieldCheck, Plus, AlertTriangle } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function QualityPage() {
    const [tab, setTab] = useState<'incidents' | 'indicators'>('incidents');
    const [incidents, setIncidents] = useState<any[]>([]);
    const [indicators, setIndicators] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ incidentType: 'clinical', severity: 'low', description: '', immediateAction: '' });

    const fetchIncidents = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await hospitalApi.getIncidents({ page, limit: 20 });
            if (res.success) { const d = (res.data ?? res) as any; setIncidents(d.data || []); setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 }); }
        } finally { setLoading(false); }
    }, []);

    const fetchIndicators = useCallback(async () => {
        setLoading(true);
        try {
            const res = await hospitalApi.getQualityIndicators();
            if (res.success) setIndicators((res.data as any)?.indicators ?? (res as any)?.indicators ?? []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (tab === 'incidents') fetchIncidents(); else fetchIndicators(); }, [tab, fetchIncidents, fetchIndicators]);

    const handleReport = async () => {
        if (!form.description) return;
        const res = await hospitalApi.createIncident(form);
        if (res.success) { setShowForm(false); fetchIncidents(); }
    };

    const handleUpdate = async (id: string, status: string) => {
        await hospitalApi.updateIncident(id, { status });
        fetchIncidents();
    };

    const severityColors: Record<string, string> = {
        low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700',
        high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
        sentinel: 'bg-red-200 text-red-900 font-bold',
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Quality & Compliance</h1>
                <p className="text-amber-100 text-sm mt-1">Incident reporting, NABH indicators, safety monitoring</p>
            </div>

            <div className="flex gap-2 border-b">
                {[{ key: 'incidents', label: 'Incidents' }, { key: 'indicators', label: 'Quality Indicators' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'incidents' && (
                <>
                    <div className="flex justify-end">
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowForm(true)}>
                            <AlertTriangle className="h-4 w-4 mr-2" /> Report Incident
                        </Button>
                    </div>

                    {showForm && (
                        <Card className="border-red-200">
                            <CardHeader><CardTitle className="text-sm">Report Incident</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <select className="border rounded-lg px-3 py-2 text-sm" value={form.incidentType} onChange={e => setForm({ ...form, incidentType: e.target.value })}>
                                        {['clinical', 'medication_error', 'fall', 'infection', 'surgical', 'blood_transfusion', 'equipment', 'safety', 'complaint', 'other'].map(t => (
                                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                    <select className="border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                                        {['low', 'medium', 'high', 'critical', 'sentinel'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <textarea placeholder="Description *" rows={3} className="border rounded-lg px-3 py-2 text-sm w-full" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                <input placeholder="Immediate Action Taken" className="border rounded-lg px-3 py-2 text-sm w-full" value={form.immediateAction} onChange={e => setForm({ ...form, immediateAction: e.target.value })} />
                                <div className="flex gap-2">
                                    <Button onClick={handleReport} className="bg-red-600 hover:bg-red-700 text-white">Report</Button>
                                    <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Incident #</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Type</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Severity</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Description</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Date</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {incidents.length === 0 ? (
                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{loading ? 'Loading...' : 'No incidents reported'}</td></tr>
                                        ) : incidents.map((i: any) => (
                                            <tr key={i.id} className={`hover:bg-gray-50 ${i.severity === 'sentinel' ? 'bg-red-50' : ''}`}>
                                                <td className="px-4 py-2.5 font-mono text-xs">{i.incident_number || '—'}</td>
                                                <td className="px-4 py-2.5 capitalize text-xs">{i.incident_type?.replace(/_/g, ' ')}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityColors[i.severity] || ''}`}>{i.severity}</span>
                                                </td>
                                                <td className="px-4 py-2.5 max-w-[200px] truncate">{i.description}</td>
                                                <td className="px-4 py-2.5"><StatusBadge status={i.status} /></td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-2.5 flex gap-1">
                                                    {i.status === 'reported' && <button onClick={() => handleUpdate(i.id, 'investigating')} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Investigate</button>}
                                                    {i.status === 'investigating' && <button onClick={() => handleUpdate(i.id, 'action_taken')} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">Action</button>}
                                                    {i.status === 'action_taken' && <button onClick={() => handleUpdate(i.id, 'closed')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Close</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                    {pagination.totalPages > 1 && <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={p => fetchIncidents(p)} />}
                </>
            )}

            {tab === 'indicators' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {indicators.length === 0 ? (
                        <Card className="col-span-full"><CardContent className="p-8 text-center text-gray-400">{loading ? 'Loading...' : 'No quality indicators configured'}</CardContent></Card>
                    ) : indicators.map((ind: any) => {
                        const pct = ind.target_value > 0 ? Math.round((ind.actual_value / ind.target_value) * 100) : 0;
                        const isGood = ind.direction === 'lower' ? ind.actual_value <= ind.target_value : ind.actual_value >= ind.target_value;
                        return (
                            <Card key={ind.id}>
                                <CardContent className="p-4">
                                    <p className="text-sm font-medium">{ind.indicator_name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{ind.category}</p>
                                    <div className="flex items-end gap-2 mt-2">
                                        <span className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>{ind.actual_value ?? '—'}</span>
                                        <span className="text-xs text-gray-400 mb-1">/ {ind.target_value} ({ind.unit || '%'})</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                                        <div className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
