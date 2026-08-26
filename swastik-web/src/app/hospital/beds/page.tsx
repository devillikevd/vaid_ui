'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalApi } from '@/lib/api';
import { Activity, Plus, BedDouble } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const BED_COLORS: Record<string, string> = {
    available: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    occupied: 'bg-red-100 border-red-300 text-red-800',
    reserved: 'bg-amber-100 border-amber-300 text-amber-800',
    maintenance: 'bg-gray-200 border-gray-400 text-gray-600',
    housekeeping: 'bg-blue-100 border-blue-300 text-blue-700',
};

export default function BedManagementPage() {
    const [wards, setWards] = useState<any[]>([]);
    const [beds, setBeds] = useState<any[]>([]);
    const [occupancy, setOccupancy] = useState<any>(null);
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showWardForm, setShowWardForm] = useState(false);
    const [wardForm, setWardForm] = useState({ name: '', ward_type: 'general', floor: '', charge_per_day: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [wRes, oRes] = await Promise.all([
                hospitalApi.getWards(),
                hospitalApi.getBedOccupancy(),
            ]);
            if (wRes.success) setWards((wRes.data as any)?.wards ?? (wRes as any)?.wards ?? []);
            if (oRes.success) setOccupancy((oRes.data ?? oRes) as any);
        } finally { setLoading(false); }
    }, []);

    const fetchBeds = useCallback(async () => {
        const params: Record<string, any> = { limit: 200 };
        if (selectedWard) params.wardId = selectedWard;
        const res = await hospitalApi.getBeds(params);
        if (res.success) {
            const d = (res.data ?? res) as any;
            setBeds(d.data || []);
        }
    }, [selectedWard]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchBeds(); }, [fetchBeds]);

    const handleAddWard = async () => {
        if (!wardForm.name) return;
        const res = await hospitalApi.createWard({
            ...wardForm,
            charge_per_day: wardForm.charge_per_day ? parseFloat(wardForm.charge_per_day) : null,
        });
        if (res.success) { setShowWardForm(false); fetchData(); setWardForm({ name: '', ward_type: 'general', floor: '', charge_per_day: '' }); }
    };

    const occ = occupancy || {};

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Bed Management</h1>
                    <p className="text-blue-200 text-sm mt-1">Visual bed map & occupancy</p>
                </div>
                <Button className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => setShowWardForm(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Ward
                </Button>
            </div>

            {/* Occupancy Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total Beds', value: occ.total || 0, color: 'text-gray-700' },
                    { label: 'Available', value: occ.available || 0, color: 'text-emerald-600' },
                    { label: 'Occupied', value: occ.occupied || 0, color: 'text-red-600' },
                    { label: 'Maintenance', value: occ.maintenance || 0, color: 'text-gray-500' },
                    { label: 'Occupancy', value: `${occ.occupancy_percent || 0}%`, color: (occ.occupancy_percent || 0) > 85 ? 'text-red-600' : 'text-green-600' },
                ].map(s => (
                    <Card key={s.label}>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Ward Form */}
            {showWardForm && (
                <Card className="border-blue-200">
                    <CardHeader><CardTitle className="text-sm">New Ward</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <input placeholder="Ward Name *" className="border rounded-lg px-3 py-2 text-sm" value={wardForm.name} onChange={e => setWardForm({ ...wardForm, name: e.target.value })} />
                            <select className="border rounded-lg px-3 py-2 text-sm" value={wardForm.ward_type} onChange={e => setWardForm({ ...wardForm, ward_type: e.target.value })}>
                                {['general', 'semi_private', 'private', 'deluxe', 'suite', 'icu', 'nicu', 'picu', 'ccu', 'micu', 'sicu', 'hdu', 'isolation', 'burns', 'pediatric', 'maternity', 'emergency'].map(t => (
                                    <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </select>
                            <input placeholder="Floor" className="border rounded-lg px-3 py-2 text-sm" value={wardForm.floor} onChange={e => setWardForm({ ...wardForm, floor: e.target.value })} />
                            <input placeholder="Charge/Day (₹)" type="number" className="border rounded-lg px-3 py-2 text-sm" value={wardForm.charge_per_day} onChange={e => setWardForm({ ...wardForm, charge_per_day: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAddWard} className="bg-blue-600 hover:bg-blue-700 text-white">Create Ward</Button>
                            <Button variant="outline" onClick={() => setShowWardForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ward Filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedWard('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${!selectedWard ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    All Wards
                </button>
                {wards.map((w: any) => (
                    <button key={w.id} onClick={() => setSelectedWard(w.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selectedWard === w.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {w.name} ({w.occupied_beds || 0}/{w.total_beds || 0})
                    </button>
                ))}
            </div>

            {/* Visual Bed Grid */}
            <Card>
                <CardHeader><CardTitle className="text-sm">Bed Map</CardTitle></CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center text-gray-400 py-8">Loading...</p>
                    ) : beds.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No beds found. Add beds via ward setup.</p>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                            {beds.map((b: any) => (
                                <div key={b.id} className={`border-2 rounded-lg p-2 text-center cursor-pointer transition hover:shadow-md ${BED_COLORS[b.status] || BED_COLORS.available}`}
                                    title={`${b.bed_number} — ${b.status}${b.patient?.name ? ` (${b.patient.name})` : ''}`}>
                                    <BedDouble className="h-4 w-4 mx-auto mb-1" />
                                    <p className="text-xs font-semibold">{b.bed_number}</p>
                                    <p className="text-[10px] capitalize">{b.status}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-4 mt-4 pt-3 border-t text-xs text-gray-500 flex-wrap">
                        {Object.entries(BED_COLORS).map(([status, cls]) => (
                            <span key={status} className="flex items-center gap-1">
                                <span className={`w-3 h-3 rounded border ${cls}`} /> {status}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
