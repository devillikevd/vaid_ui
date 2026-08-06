'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dumbbell, Loader2, MapPin, RefreshCw, Search, Star, Store, Utensils } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface FitnessCenter { id: string; name: string; center_type?: string; city?: string; rating?: number; address?: string; }
interface Supplement { id: string; name: string; brand?: string; category?: string; is_verified?: boolean; }

export default function WellnessMarketplacePage() {
    const toast = useToast();
    const [centers, setCenters] = useState<FitnessCenter[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'centers' | 'supplements'>('centers');

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cRes, sRes] = await Promise.all([
                wellnessApi.getFacilities(undefined, 1, 30),
                wellnessApi.getSupplements(undefined, 1, 30),
            ]);
            setCenters(Array.isArray(cRes.data) ? cRes.data : []);
            setSupplements(Array.isArray(sRes.data) ? sRes.data : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load marketplace');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filteredCenters = centers.filter(c => !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.city || '').toLowerCase().includes(search.toLowerCase()));
    const filteredSupplements = supplements.filter(s => !search || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.brand || '').toLowerCase().includes(search.toLowerCase()));

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketplace</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Browse approved gyms, studios, and nutrition products.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gyms, studios, or supplements..."
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                </div>
                <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button onClick={() => setTab('centers')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'centers' ? 'bg-lime-600 text-white' : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-400'}`}>
                        <Store className="inline h-4 w-4 mr-1" /> Centers
                    </button>
                    <button onClick={() => setTab('supplements')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'supplements' ? 'bg-lime-600 text-white' : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-400'}`}>
                        <Utensils className="inline h-4 w-4 mr-1" /> Supplements
                    </button>
                </div>
            </div>

            {tab === 'centers' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCenters.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                            <Store className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            No fitness centers found.
                        </div>
                    ) : filteredCenters.map(c => (
                        <Card key={c.id}>
                            <CardContent>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.center_type?.replace(/_/g, ' ') || 'Fitness Center'}</p>
                                    </div>
                                    {c.rating != null && (
                                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-sm">
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /><span className="font-medium text-amber-700">{Number(c.rating).toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                {c.city && <p className="flex items-center gap-1 text-xs text-gray-400 mt-2"><MapPin className="h-3 w-3" />{c.city}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSupplements.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                            <Utensils className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            No supplements found.
                        </div>
                    ) : filteredSupplements.map(s => (
                        <Card key={s.id}>
                            <CardContent>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{[s.brand, s.category].filter(Boolean).join(' • ') || 'Supplement'}</p>
                                    </div>
                                    {s.is_verified && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Verified</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
