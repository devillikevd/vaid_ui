'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { ClipboardList } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EncountersPage() {
    const [encounters, setEncounters] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 20 };
            if (typeFilter) params.encounterType = typeFilter;
            const res = await hospitalApi.getEncounters(params);
            if (res.success) { const d = (res.data ?? res) as any; setEncounters(d.data || []); setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 }); }
        } finally { setLoading(false); }
    }, [typeFilter]);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Encounters</h1>
                <p className="text-cyan-100 text-sm mt-1">All patient visits — OPD, IPD, Emergency</p>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'opd', 'ipd', 'emergency'].map(t => (
                    <button key={t || 'all'} onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${typeFilter === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {t ? t.toUpperCase() : 'All'}
                    </button>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Encounter #</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Doctor</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Type</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Complaint</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                    <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Amount</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {encounters.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">{loading ? 'Loading...' : 'No encounters found'}</td></tr>
                                ) : encounters.map((e: any) => (
                                    <tr key={e.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2.5 font-mono text-xs">{e.encounter_number || '—'}</td>
                                        <td className="px-4 py-2.5">{e.patient?.name || '—'}</td>
                                        <td className="px-4 py-2.5 text-gray-600">{e.doctor?.name || '—'}</td>
                                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${e.encounter_type === 'emergency' ? 'bg-red-100 text-red-700' : e.encounter_type === 'ipd' ? 'bg-violet-100 text-violet-700' : 'bg-teal-100 text-teal-700'}`}>{e.encounter_type}</span></td>
                                        <td className="px-4 py-2.5 max-w-[180px] truncate text-xs">{e.chief_complaint || '—'}</td>
                                        <td className="px-4 py-2.5"><StatusBadge status={e.status} /></td>
                                        <td className="px-4 py-2.5 text-right font-semibold">₹{parseFloat(e.net_amount || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
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
