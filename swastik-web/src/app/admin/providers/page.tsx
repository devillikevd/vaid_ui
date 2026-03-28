'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Search, Stethoscope, Building2, Building, Pill, Siren, Microscope,
    Loader2, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminStore } from '@/stores/adminStore';
import { adminApi } from '@/lib/api';

type ProviderType = 'all' | 'doctors' | 'hospitals' | 'clinics' | 'pharmacies' | 'diagnostic_centers' | 'ambulances';

interface Provider {
    id: string;
    provider_type: string;
    name: string;
    email?: string;
    phone?: string;
    status: string;
    contact_name?: string | null;
    created_at?: string;
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
    doctors: Stethoscope, hospitals: Building2, clinics: Building,
    pharmacies: Pill, diagnostic_centers: Microscope, ambulances: Siren,
};

const PROVIDER_COLORS: Record<string, string> = {
    doctors: 'bg-emerald-100 text-emerald-700', hospitals: 'bg-teal-100 text-teal-700',
    clinics: 'bg-pink-100 text-pink-700', pharmacies: 'bg-orange-100 text-orange-700',
    diagnostic_centers: 'bg-purple-100 text-purple-700', ambulances: 'bg-red-100 text-red-700',
};

export default function ProvidersPage() {
    const [activeFilter, setActiveFilter] = useState<ProviderType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const { stats, providerCounts, fetchDashboardData } = useAdminStore();

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const fetchProviders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const filters: Record<string, unknown> = {
                type: activeFilter,
            };
            if (searchQuery.trim()) {
                filters.search = searchQuery.trim();
            }

            const result = await adminApi.getProviders(filters, page, 15);
            if (!result.success) throw new Error(result.error || 'Failed to fetch providers');
            const data = Array.isArray(result.data) ? result.data as Provider[] : [];
            setProviders(data);
            const nextPagination = (result.pagination as { page?: number; limit?: number; total?: number; totalPages?: number } | undefined) || {};
            setPagination({
                page: nextPagination.page ?? page,
                limit: nextPagination.limit ?? 15,
                total: nextPagination.total ?? data.length,
                totalPages: nextPagination.totalPages ?? 1,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load providers');
        }
        setIsLoading(false);
    }, [activeFilter, page, searchQuery]);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchQuery, activeFilter]);

    const FILTER_TABS = [
        { id: 'all', label: 'All Providers', count: stats?.totalProviders ?? 0 },
        { id: 'doctors', label: 'Doctors', count: providerCounts?.doctors?.total ?? 0 },
        { id: 'hospitals', label: 'Hospitals', count: providerCounts?.hospitals?.total ?? 0 },
        { id: 'clinics', label: 'Clinics', count: providerCounts?.clinics?.total ?? 0 },
        { id: 'pharmacies', label: 'Pharmacies', count: providerCounts?.pharmacies?.total ?? 0 },
        { id: 'diagnostic_centers', label: 'Diagnostic Centers', count: providerCounts?.diagnosticCenters?.total ?? 0 },
        { id: 'ambulances', label: 'Ambulances', count: providerCounts?.ambulances?.total ?? 0 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Providers</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all registered healthcare providers</p>
                </div>
                <Button variant="outline" onClick={fetchProviders} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTER_TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveFilter(tab.id as ProviderType)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}>
                        {tab.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeFilter === tab.id ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <Card padding="sm">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input placeholder="Search providers..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} />
                    </div>
                </div>
            </Card>

            <Card padding="none">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading providers...</span>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-600">{error}</p>
                        <Button className="mt-4" onClick={fetchProviders} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Provider</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Contact</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {providers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">No providers found</td></tr>
                                ) : (
                                    providers.map((provider) => {
                                        const providerType = provider.provider_type || 'doctors';
                                        const Icon = PROVIDER_ICONS[providerType] || Stethoscope;
                                        const colorClass = PROVIDER_COLORS[providerType] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
                                        return (
                                            <tr key={provider.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${colorClass}`}><Icon className="h-4 w-4" /></div>
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{provider.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                    {providerType.replace(/_/g, ' ')}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                    <div className="flex flex-col">
                                                        <span>{provider.email || provider.phone || '—'}</span>
                                                        {provider.contact_name && (
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">{provider.contact_name}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 hidden sm:table-cell">
                                                    <StatusBadge status={provider.status as any} size="sm" />
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                                                    {provider.created_at ? new Date(provider.created_at).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                            totalItems={pagination.total}
                            itemsPerPage={pagination.limit}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
