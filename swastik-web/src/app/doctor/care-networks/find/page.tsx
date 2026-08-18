/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Search, MapPin, Building2, Hospital, Filter, ChevronRight, 
    Star, Clock, ShieldCheck, Video, ArrowLeft, Loader2, Navigation,
    CheckCircle2, Mail, FileText, X, AlertCircle, Sparkles, Compass
} from 'lucide-react';
import Link from 'next/link';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import JoinRequestModal from '@/components/doctor/JoinRequestModal';

interface OrgResult {
    id: string;
    name: string;
    type: 'clinic' | 'hospital';
    organization_type?: string;
    city?: string;
    state?: string;
    address?: string;
    rating?: number | string;
    total_reviews?: number;
    image_url?: string;
    profile_image_url?: string;
    specializations?: string[];
    departments?: string[];
    facilities?: string[];
    is_24_hours?: boolean;
    opening_hours?: Record<string, any>;
    approval_status?: string;
    distance_km?: number | null;
    relationship?: 'ACTIVE' | 'REQUEST_PENDING' | 'INVITATION_PENDING' | 'CHANGES_REQUESTED' | 'REJECTED' | 'NOT_CONNECTED';
    invite_id?: string | null;
    join_request_id?: string | null;
}

export default function FindOrganizationsPage() {
    const toast = useToast();
    const toastRef = useRef(toast);
    toastRef.current = toast;

    const [query, setQuery] = useState('');
    const [type, setType] = useState<'all' | 'clinic' | 'hospital'>('all');
    const [isNearbyActive, setIsNearbyActive] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
    
    const [results, setResults] = useState<OrgResult[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<OrgResult | null>(null);

    // Stale-request prevention ref
    const requestCounterRef = useRef(0);

    const fetchOrgs = useCallback(async (
        searchQuery: string, 
        searchType: string, 
        lat?: number, 
        lng?: number
    ) => {
        const requestId = ++requestCounterRef.current;
        setIsSearching(true);

        try {
            const res = await doctorApi.searchOrganizations(searchQuery, searchType, lat, lng);
            // Protect against out-of-order stale responses
            if (requestId !== requestCounterRef.current) return;

            if (res.success) {
                let list: OrgResult[] = [];
                if (Array.isArray(res.data)) {
                    list = res.data;
                } else if (res.data && typeof res.data === 'object') {
                    const d = res.data as any;
                    list = [...(d.clinics || []), ...(d.hospitals || [])];
                }
                if (list.length === 0 && ((res as any).clinics || (res as any).hospitals)) {
                    list = [...((res as any).clinics || []), ...((res as any).hospitals || [])];
                }
                setResults(list);
            }
        } catch (err: any) {
            console.error('Failed to fetch organizations:', err);
            if (requestId === requestCounterRef.current) {
                toastRef.current.error('Unable to fetch organizations. Please try again.');
            }
        } finally {
            if (requestId === requestCounterRef.current) {
                setIsSearching(false);
                setIsInitialLoading(false);
            }
        }
    }, []);

    // Single consolidated debounced effect for all search & filter changes
    useEffect(() => {
        const lat = isNearbyActive ? coords.lat : undefined;
        const lng = isNearbyActive ? coords.lng : undefined;

        const delay = query.trim() ? 350 : 0;
        const handler = setTimeout(() => {
            void fetchOrgs(query, type, lat, lng);
        }, delay);

        return () => clearTimeout(handler);
    }, [query, type, isNearbyActive, coords.lat, coords.lng, fetchOrgs]);

    // Toggle "Near Your Location"
    const handleToggleNearby = () => {
        setLocationError(null);

        if (isNearbyActive) {
            // Turn OFF nearby
            setIsNearbyActive(false);
            return;
        }

        // Turn ON nearby: check if we already have coordinates
        if (coords.lat && coords.lng) {
            setIsNearbyActive(true);
            return;
        }

        // Request browser geolocation
        if (!('geolocation' in navigator)) {
            setLocationError('Geolocation is not supported by your browser.');
            toastRef.current.error('Location service unavailable on this device.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setIsLocating(false);
                setCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setIsNearbyActive(true);
                toastRef.current.success('Showing organizations near your current location.');
            },
            (err) => {
                setIsLocating(false);
                let msg = 'Unable to access your location.';
                if (err.code === 1) {
                    msg = 'Location permission was denied. Standard organization search will be used.';
                } else if (err.code === 2) {
                    msg = 'Location information is currently unavailable.';
                } else if (err.code === 3) {
                    msg = 'Location request timed out. Please try again.';
                }
                setLocationError(msg);
                toastRef.current.error(msg);
            },
            { timeout: 8000, maximumAge: 120000, enableHighAccuracy: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lat = isNearbyActive ? coords.lat : undefined;
        const lng = isNearbyActive ? coords.lng : undefined;
        void fetchOrgs(query, type, lat, lng);
    };

    const clearSearch = () => {
        setQuery('');
        const lat = isNearbyActive ? coords.lat : undefined;
        const lng = isNearbyActive ? coords.lng : undefined;
        void fetchOrgs('', type, lat, lng);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Top Navigation & Breadcrumb */}
            <div className="pt-2">
                <Link 
                    href="/doctor/care-networks" 
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline mb-2"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Care Networks
                </Link>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Find Healthcare Organizations
                        </h1>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                            Discover clinics and hospitals, view practice opportunities, and expand your clinical reach.
                        </p>
                    </div>

                    <Link 
                        href="/doctor/care-networks?tab=requests"
                        className="px-4 py-2.5 text-xs font-extrabold rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm self-start sm:self-auto flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>My Sent Join Requests</span>
                    </Link>
                </div>
            </div>

            {/* Clean Single Filter & Search Container */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 space-y-4">
                
                {/* 1. Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by hospital/clinic name, city, department, or specialty..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 text-sm font-medium rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSearching}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-emerald-600/25 disabled:opacity-85 flex items-center justify-center min-w-[100px] shrink-0"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Search'}
                    </button>
                </form>

                {/* 2. Unified Quick Filter & Location Controls Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    
                    {/* Organization Type Filters (Single Source of Truth) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Filter:
                        </span>
                        
                        {(['all', 'clinic', 'hospital'] as const).map((t) => {
                            const isSelected = type === t;
                            const label = t === 'all' ? 'All' : t === 'clinic' ? 'Clinics' : 'Hospitals';
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Near Your Location Interactive Control */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={handleToggleNearby}
                            disabled={isLocating}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                                isNearbyActive
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            {isLocating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                                <Navigation className={`w-3.5 h-3.5 ${isNearbyActive ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-600/20' : 'text-gray-500'}`} />
                            )}
                            <span>Near Your Location</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                                isNearbyActive 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}>
                                {isNearbyActive ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Location Status / Notice Banner */}
                {locationError && (
                    <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>{locationError}</span>
                    </div>
                )}
            </div>

            {/* Results Count & Active Sort Summary */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 px-1">
                <div className="flex items-center gap-2">
                    <span>
                        {isInitialLoading ? 'Loading directory...' : `Showing ${results.length} organization${results.length === 1 ? '' : 's'}`}
                    </span>
                    {isSearching && !isInitialLoading && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                        </span>
                    )}
                </div>
                {isNearbyActive && (
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5" /> Sorted by distance (nearest first)
                    </span>
                )}
            </div>

            {/* Results Grid */}
            <div className="space-y-4">
                {isInitialLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Discovering verified organizations...</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-500 dark:text-gray-400">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">
                            {isNearbyActive ? 'No nearby organizations found' : 'No organizations found'}
                        </h3>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            {query 
                                ? `No results matched "${query}". Try another clinic/hospital name, city, department, or specialty.`
                                : isNearbyActive
                                ? 'No organizations registered within your immediate area. Try searching by city name or turning off Nearby filter.'
                                : 'Try adjusting your search query, checking spelling, or selecting "All".'}
                        </p>
                        {(query || isNearbyActive || type !== 'all') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setType('all');
                                    setIsNearbyActive(false);
                                }}
                                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-extrabold transition-colors"
                            >
                                Reset All Filters
                            </button>
                        )}
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
                            const rel = org.relationship || 'NOT_CONNECTED';

                            return (
                                <div 
                                    key={`${org.type}-${org.id}`} 
                                    className={`bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border p-5 sm:p-6 flex flex-col transition-all duration-200 hover:shadow-xl group ${
                                        rel === 'ACTIVE'
                                            ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/10'
                                            : rel === 'REQUEST_PENDING'
                                            ? 'border-purple-300 dark:border-purple-800/80 ring-1 ring-purple-500/10'
                                            : rel === 'INVITATION_PENDING'
                                            ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-500/10'
                                            : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                                    }`}
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
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                }`}>
                                                    {isHosp ? <Hospital className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                                    isHosp 
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800' 
                                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                }`}>
                                                    {isHosp ? 'Hospital' : 'Clinic'}
                                                </span>

                                                {/* Relationship Status Badges */}
                                                {rel === 'ACTIVE' && (
                                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Active Affiliation
                                                    </span>
                                                )}

                                                {rel === 'REQUEST_PENDING' && (
                                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 flex items-center gap-1 border border-purple-300 dark:border-purple-800 shadow-sm">
                                                        <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Request Pending
                                                    </span>
                                                )}

                                                {rel === 'INVITATION_PENDING' && (
                                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 flex items-center gap-1 border border-amber-300 dark:border-amber-800 shadow-sm">
                                                        <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Invitation Received
                                                    </span>
                                                )}

                                                {rel === 'CHANGES_REQUESTED' && (
                                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 flex items-center gap-1 border border-blue-300 dark:border-blue-800 shadow-sm">
                                                        ⇄ Counter-Proposal
                                                    </span>
                                                )}

                                                {org.approval_status === 'approved' && rel === 'NOT_CONNECTED' && (
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified
                                                    </span>
                                                )}

                                                {/* Real Distance Badge */}
                                                {org.distance_km !== null && org.distance_km !== undefined ? (
                                                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 ml-auto bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                                                        <Navigation className="w-3 h-3 text-emerald-600" />
                                                        {org.distance_km} km away
                                                    </span>
                                                ) : isNearbyActive ? (
                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-auto">
                                                        Distance unavailable
                                                    </span>
                                                ) : null}
                                            </div>

                                            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg leading-snug mt-1.5 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {org.name}
                                            </h3>

                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mt-1 truncate">
                                                <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                                                <span className="truncate">{org.city}{org.state ? `, ${org.state}` : ''} {org.address ? `• ${org.address}` : ''}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle Details / Badges */}
                                    <div className="space-y-3 mb-5 flex-1 text-xs">
                                        {/* Ratings & Operating info */}
                                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium">
                                            {ratingVal > 0 ? (
                                                <div className="flex items-center gap-1 font-extrabold text-gray-900 dark:text-gray-100">
                                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    <span>{ratingVal.toFixed(1)}</span>
                                                    {org.total_reviews ? (
                                                        <span className="font-semibold text-gray-500 dark:text-gray-400">({org.total_reviews})</span>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400 font-medium">New on Vaididea</span>
                                            )}

                                            <span className="text-gray-400">•</span>

                                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                <span>{is24x7 ? 'Open 24/7' : 'Standard OPD Hours'}</span>
                                            </div>
                                        </div>

                                        {/* Specialties / Department tags */}
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((t, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {(departments.length + specialities.length) > 3 && (
                                                    <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                        +{ (departments.length + specialities.length) - 3 } more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Consultation Modes Support */}
                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400">Modes:</span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                                                <Building2 className="w-3 h-3" /> In-Person OPD
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-300 dark:border-blue-800">
                                                <Video className="w-3 h-3" /> Video Consult
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions based on Relationship Status */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
                                        {rel === 'ACTIVE' ? (
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shadow-sm bg-emerald-50/60 dark:bg-emerald-950/20"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                    <span>Already Joined • View Details</span>
                                                </Link>
                                            </div>
                                        ) : rel === 'REQUEST_PENDING' ? (
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Link
                                                    href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm bg-white dark:bg-gray-800"
                                                >
                                                    View Details
                                                </Link>
                                                <Link
                                                    href="/doctor/care-networks?tab=requests"
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-extrabold text-xs border border-purple-300 dark:border-purple-800 transition-colors shadow-sm"
                                                >
                                                    <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                    <span>View Request</span>
                                                </Link>
                                            </div>
                                        ) : rel === 'INVITATION_PENDING' ? (
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Link
                                                    href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm bg-white dark:bg-gray-800"
                                                >
                                                    View Details
                                                </Link>
                                                <Link
                                                    href="/doctor/care-networks?tab=invitations"
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-500/20"
                                                >
                                                    <Mail className="w-3.5 h-3.5 text-white" />
                                                    <span>Review Invite</span>
                                                </Link>
                                            </div>
                                        ) : rel === 'CHANGES_REQUESTED' ? (
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Link
                                                    href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm bg-white dark:bg-gray-800"
                                                >
                                                    View Details
                                                </Link>
                                                <Link
                                                    href="/doctor/care-networks?tab=invitations"
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 text-blue-900 dark:text-blue-200 font-extrabold text-xs border border-blue-300 dark:border-blue-800 transition-colors shadow-sm"
                                                >
                                                    View Proposal
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <Link
                                                    href={`/doctor/care-networks/find/${org.id}?type=${isHosp ? 'hospital' : 'clinic'}`}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-extrabold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm bg-white dark:bg-gray-800"
                                                >
                                                    View Details
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedOrg(org)}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20"
                                                >
                                                    Request to Join <ChevronRight className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </div>
                                        )}
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
                    const lat = isNearbyActive ? coords.lat : undefined;
                    const lng = isNearbyActive ? coords.lng : undefined;
                    void fetchOrgs(query, type, lat, lng);
                }}
            />
        </div>
    );
}
