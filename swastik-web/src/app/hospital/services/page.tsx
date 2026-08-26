'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import { IndianRupee, Plus, Pencil, Trash2 } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ServiceCatalogPage() {
    const [services, setServices] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [catFilter, setCatFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', category: 'consultation', rate: '', gstPercent: '0', description: '', serviceType: 'one_time' });

    const fetch = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: 30 };
            if (catFilter) params.category = catFilter;
            if (search) params.search = search;
            const [sRes, cRes] = await Promise.all([
                hospitalApi.getHospitalServices(params),
                hospitalApi.getServiceCategories(),
            ]);
            if (sRes.success) { const d = (sRes.data ?? sRes) as any; setServices(d.data || []); setPagination(d.pagination || { page: 1, totalPages: 1, total: 0 }); }
            if (cRes.success) setCategories((cRes.data as any)?.categories ?? (cRes as any)?.categories ?? []);
        } finally { setLoading(false); }
    }, [catFilter, search]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleCreate = async () => {
        if (!form.name || !form.rate) return;
        const res = await hospitalApi.createHospitalService({ ...form, rate: parseFloat(form.rate), gstPercent: parseFloat(form.gstPercent) });
        if (res.success) { setShowForm(false); fetch(); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        await hospitalApi.deleteHospitalService(id);
        fetch();
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><IndianRupee className="h-6 w-6" /> Service Catalog</h1>
                    <p className="text-green-100 text-sm mt-1">Rate card management with GST</p>
                </div>
                <Button className="bg-white text-green-700 hover:bg-green-50" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Service
                </Button>
            </div>

            <div className="flex gap-3 flex-wrap items-center">
                <input placeholder="Search services..." className="border rounded-lg px-3 py-2 text-sm w-64" value={search} onChange={e => setSearch(e.target.value)} />
                <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${!catFilter ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
                {categories.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${catFilter === c ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
                ))}
            </div>

            {showForm && (
                <Card className="border-green-200">
                    <CardHeader><CardTitle className="text-sm">New Service</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <input placeholder="Service Name *" className="border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <input placeholder="Service Code" className="border rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                            <input placeholder="Rate (₹) *" type="number" className="border rounded-lg px-3 py-2 text-sm" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
                            <input placeholder="Category" className="border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                            <input placeholder="GST %" type="number" className="border rounded-lg px-3 py-2 text-sm" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: e.target.value })} />
                            <select className="border rounded-lg px-3 py-2 text-sm" value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })}>
                                <option value="one_time">One-time</option><option value="per_day">Per Day</option><option value="per_hour">Per Hour</option><option value="package">Package</option>
                            </select>
                        </div>
                        <input placeholder="Description" className="border rounded-lg px-3 py-2 text-sm w-full" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">Create</Button>
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
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Code</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Service Name</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Category</th>
                                    <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Rate (₹)</th>
                                    <th className="text-right px-4 py-2.5 text-gray-500 font-medium">GST %</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Type</th>
                                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {services.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{loading ? 'Loading...' : 'No services'}</td></tr>
                                ) : services.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2.5 font-mono text-xs">{s.code || '—'}</td>
                                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                                        <td className="px-4 py-2.5 capitalize text-xs">{s.category}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold">₹{parseFloat(s.rate || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2.5 text-right text-xs">{s.gst_percent || 0}%</td>
                                        <td className="px-4 py-2.5 text-xs capitalize">{s.service_type?.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-2.5">
                                            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
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
