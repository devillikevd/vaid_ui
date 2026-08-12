'use client';
import React from 'react';

import { useEffect, useState, useCallback } from 'react';
import {
    Search, Stethoscope, Building2, Building, Pill, Siren, Microscope, Dumbbell,
    Loader2, RefreshCw, Store, ShieldAlert, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminStore } from '@/stores/adminStore';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Download } from 'lucide-react';
import SuperAdminActions from '@/components/admin/SuperAdminActions';

type ProviderType = 'all' | 'doctors' | 'hospitals' | 'clinics' | 'pharmacies' | 'diagnostic_centers' | 'wellness_coaches' | 'fitness_centers' | 'ambulances';

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
    pharmacies: Pill, diagnostic_centers: Microscope, wellness_coaches: Dumbbell, fitness_centers: Store, ambulances: Siren,
};

const PROVIDER_COLORS: Record<string, string> = {
    doctors: 'bg-emerald-100 text-emerald-700', hospitals: 'bg-teal-100 text-teal-700',
    clinics: 'bg-pink-100 text-pink-700', pharmacies: 'bg-orange-100 text-orange-700',
    diagnostic_centers: 'bg-purple-100 text-purple-700', wellness_coaches: 'bg-lime-100 text-lime-700', fitness_centers: 'bg-cyan-100 text-cyan-700', ambulances: 'bg-red-100 text-red-700',
};

export default function ProvidersPage() {
    const [activeFilter, setActiveFilter] = useState<ProviderType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState('date_desc');
    const [dateRange, setDateRange] = useState('');
    const [minCompletion, setMinCompletion] = useState('');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloadingZip, setIsDownloadingZip] = useState<string | null>(null);
    const [expandedProvider, setExpandedProvider] = useState<Provider | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const toast = useToast();
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
            if (sort) filters.sort = sort;
            if (dateRange) filters.dateRange = dateRange;
            if (minCompletion) filters.minCompletion = minCompletion;

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
    useEffect(() => { setPage(1); }, [searchQuery, activeFilter, sort, dateRange, minCompletion]);

    const FILTER_TABS = [
        { id: 'all', label: 'All Providers', count: stats?.totalProviders ?? 0 },
        { id: 'doctors', label: 'Doctors', count: providerCounts?.doctors?.total ?? 0 },
        { id: 'hospitals', label: 'Hospitals', count: providerCounts?.hospitals?.total ?? 0 },
        { id: 'clinics', label: 'Clinics', count: providerCounts?.clinics?.total ?? 0 },
        { id: 'pharmacies', label: 'Pharmacies', count: providerCounts?.pharmacies?.total ?? 0 },
        { id: 'diagnostic_centers', label: 'Diagnostic Centers', count: providerCounts?.diagnosticCenters?.total ?? 0 },
        { id: 'wellness_coaches', label: 'Wellness Coaches', count: providerCounts?.wellnessCoaches?.total ?? 0 },
        { id: 'fitness_centers', label: 'Fitness Centers', count: providerCounts?.fitnessCenters?.total ?? 0 },
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
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <Input placeholder="Search providers..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select 
                            className="text-sm border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                            value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="score_desc">Highest Completion</option>
                        </select>
                        <select 
                            className="text-sm border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                            value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                            <option value="">All Time</option>
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                        </select>
                        <select 
                            className="text-sm border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                            value={minCompletion} onChange={(e) => setMinCompletion(e.target.value)}>
                            <option value="">Any Score</option>
                            <option value="50">&gt; 50%</option>
                            <option value="80">&gt; 80%</option>
                            <option value="100">100%</option>
                        </select>
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
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
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
                                            <React.Fragment key={provider.id}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={isDownloadingZip === provider.id}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setIsDownloadingZip(provider.id);
                                                                    const res = await adminApi.downloadDocumentsZip(provider.provider_type || 'doctor', provider.id);
                                                                    if (!res.success) {
                                                                        toast.error('Download Failed', res.error || 'Failed to download ZIP');
                                                                    }
                                                                    setIsDownloadingZip(null);
                                                                }}
                                                            >
                                                                {isDownloadingZip === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-gray-500" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setExpandedProvider(expandedProvider?.id === provider.id ? null : provider)}
                                                            >
                                                                <ShieldAlert className={`h-4 w-4 ${expandedProvider?.id === provider.id ? 'text-red-500' : 'text-gray-500'}`} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedProvider?.id === provider.id && (
                                                    <tr>
                                                        <td colSpan={6} className="p-0 border-b border-gray-100 dark:border-gray-800">
                                                            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30">
                                                                <div className="flex justify-between items-start">
                                                                    <SuperAdminActions 
                                                                        providerId={provider.id} 
                                                                        providerType={provider.provider_type || 'doctor'} 
                                                                        currentStatus={provider.status} 
                                                                        onStatusChange={fetchProviders} 
                                                                    />
                                                                    <Button variant="ghost" size="sm" onClick={() => setExpandedProvider(null)}>
                                                                        <X className="h-4 w-4 text-gray-500" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
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
