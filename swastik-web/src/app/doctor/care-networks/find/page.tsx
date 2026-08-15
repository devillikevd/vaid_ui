'use client';

import React, { useState, useEffect } from 'react';
import { 
    Search, MapPin, Building2, ChevronRight, Loader2, 
    Hospital, Star, Clock, ShieldCheck, Video, Stethoscope, 
    Sparkles, ArrowLeft, Filter, Navigation, CheckCircle2 
} from 'lucide-react';
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
    const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

    // Attempt geolocation
    useEffect(() => {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => console.log('Geolocation not available/denied', err),
                { timeout: 5000 }
            );
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            const data = await doctorApi.searchOrganizations(query, type, coords.lat, coords.lng);
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

    // Initial load and reload on filter/coords change
    useEffect(() => {
        handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, coords.lat, coords.lng]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link 
                            href="/doctor/care-networks"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Care Networks
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Find Healthcare Organizations
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Discover clinics and hospitals to partner with, send join requests, and expand your clinical reach.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link 
                        href="/doctor/care-networks?tab=requests"
                        className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        My Sent Join Requests
                    </Link>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by hospital/clinic name, city, department, or specialty..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    
                    {/* Organization Type Selector */}
                    <div className="flex items-center gap-2">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="px-4 py-3 text-sm font-semibold rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Organizations</option>
                            <option value="clinic">Clinics Only</option>
                            <option value="hospital">Hospitals Only</option>
                        </select>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-brand-600/20 disabled:opacity-70 flex items-center justify-center min-w-[110px]"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </div>
                </form>

                {/* Quick filter pills */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Quick Filter:
                    </span>
                    {[
                        { label: 'All', val: 'all' },
                        { label: 'Clinics', val: 'clinic' },
                        { label: 'Hospitals', val: 'hospital' },
                    ].map(f => (
                        <button
                            key={f.val}
                            type="button"
                            onClick={() => setType(f.val)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                type === f.val
                                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    {coords.lat && (
                        <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <Navigation className="w-3 h-3" /> Near Your Location
                        </span>
                    )}
                </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Discovering verified organizations...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No organizations found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            Try adjusting your search query, checking spelling, or selecting "All Organizations".
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {results.map((org) => {
                            const isHosp = org.type === 'hospital' || org.organization_type === 'hospital';
                            const specialities = Array.isArray(org.specializations) ? org.specializations : [];
                            const departments = Array.isArray(org.departments) ? org.departments : [];
                            const tags = [...departments, ...specialities].slice(0, 3);
                            const ratingVal = typeof org.rating === 'number' ? org.rating : parseFloat(org.rating || '0');
                            const is24x7 = org.is_24_hours;

                            return (
                                <div 
                                    key={`${org.type}-${org.id}`} 
                                    className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800/80 p-5 sm:p-6 flex flex-col transition-all duration-200 hover:shadow-xl hover:border-brand-200 dark:hover:border-brand-800/60 group"
                                >
                                    {/* Card Top / Avatar + Title */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="relative shrink-0">
                                            {org.profile_image_url || org.image_url ? (
                                                <img 
                                                    src={org.profile_image_url || org.image_url} 
                                                    alt={org.name} 
                                                    className="w-14 h-14 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm" 
                                                />
                                            ) : (
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm ${
                                                    isHosp 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                }`}>
                                                    {isHosp ? <Hospital className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                    isHosp 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40' 
                                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                                                }`}>
                                                    {isHosp ? 'Hospital' : 'Clinic'}
                                                </span>
                                                {org.approval_status === 'approved' && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/40">
                                                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                                                    </span>
                                                )}
                                                {org.distance_km !== null && org.distance_km !== undefined && (
                                                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-auto">
                                                        {org.distance_km.toFixed(1)} km away
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug mt-1 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {org.name}
                                            </h3>

                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 truncate">
                                                <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                <span className="truncate">{org.city}{org.state ? `, ${org.state}` : ''} {org.address ? `• ${org.address}` : ''}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle Details / Badges */}
                                    <div className="space-y-3 mb-5 flex-1 text-xs">
                                        {/* Ratings & Operating info */}
                                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                            {ratingVal > 0 ? (
                                                <div className="flex items-center gap-1 font-bold text-gray-800 dark:text-gray-200">
                                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    <span>{ratingVal.toFixed(1)}</span>
                                                    {org.total_reviews ? (
                                                        <span className="font-normal text-gray-400">({org.total_reviews})</span>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">New on Vaididea</span>
                                            )}

                                            <span>•</span>

                                            <div className="flex items-center gap-1 text-gray-500">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{is24x7 ? 'Open 24/7' : 'Standard OPD Hours'}</span>
                                            </div>
                                        </div>

                                        {/* Specialties / Department tags */}
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((t, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {(departments.length + specialities.length) > 3 && (
                                                    <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-gray-50 dark:bg-gray-900 text-gray-400">
                                                        +{ (departments.length + specialities.length) - 3 } more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Consultation Modes Support */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Supported:</span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                                <Building2 className="w-3 h-3" /> In-Person OPD
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/30">
                                                <Video className="w-3 h-3" /> Video Consult
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions — BOTH View Details and Request to Join */}
                                    <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <Link
                                            href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            View Details
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedOrg(org)}
                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-xs transition-all shadow-sm shadow-brand-600/20"
                                        >
                                            Request to Join <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Request Modal */}
            <JoinRequestModal
                isOpen={!!selectedOrg}
                onClose={() => setSelectedOrg(null)}
                organization={selectedOrg}
                onSuccess={() => {
                    handleSearch();
                }}
            />
        </div>
    );
}

