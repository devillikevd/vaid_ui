'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Building2, ChevronRight, Loader2, Hospital } from 'lucide-react';
import { doctorApi } from '@/lib/api';
import JoinRequestModal from '@/components/doctor/JoinRequestModal';
import Link from 'next/link';

export default function FindOrganizationsPage() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('all');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<any>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            const data = await doctorApi.searchOrganizations(query, type);
            if (data.success) {
                setResults((data.data as any) || []);
                setHasSearched(true);
            }
        } catch (error) {
            console.error('Failed to search organizations', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Find Organizations</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Search for clinics and hospitals to join</p>
                </div>
                <Link 
                    href="/doctor/care-networks"
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                >
                    &larr; Back to Care Networks
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, city, or specialty..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 min-w-[150px]"
                    >
                        <option value="all">All Types</option>
                        <option value="clinic">Clinics</option>
                        <option value="hospital">Hospitals</option>
                    </select>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center min-w-[120px]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No organizations found</h3>
                        <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms or filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {results.map((org) => (
                            <div key={org.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col transition-all hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            org.type === 'hospital' 
                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        }`}>
                                            {org.type === 'hospital' ? <Hospital className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{org.name}</h3>
                                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                {org.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-6 flex-1 text-sm">
                                    {org.city && (
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <MapPin className="w-4 h-4" /> {org.city}{org.state ? `, ${org.state}` : ''}
                                        </div>
                                    )}
                                    {org.address && (
                                        <p className="text-gray-500 dark:text-gray-400 pl-6 line-clamp-2">{org.address}</p>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedOrg(org)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-brand-100 dark:border-brand-900/30 text-brand-700 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                                >
                                    Request to Join <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <JoinRequestModal
                isOpen={!!selectedOrg}
                onClose={() => setSelectedOrg(null)}
                organization={selectedOrg}
                onSuccess={() => {
                    // Optional: Update UI to show 'Requested' state
                }}
            />
        </div>
    );
}
