'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Stethoscope,
    Sparkles,
    Heart,
    Activity,
    Brain,
    Eye,
    Building2,
    Video,
    Search,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Shield,
    ArrowRight,
    Smile,
    Baby,
    Ear,
    Thermometer,
    Grid
} from 'lucide-react';
import {
    MOST_SEARCHED_SPECIALISTS,
    SURGERY_CONDITIONS,
    COMMON_SYMPTOMS,
    ALL_CANONICAL_CATEGORIES,
    CategoryDetailData
} from '@/lib/consultationCategoriesData';

interface DoctorCategoriesDiscoveryProps {
    mode: 'in_person' | 'video';
    onSelectMode: (mode: 'in_person' | 'video') => void;
}

export function DoctorCategoriesDiscovery({
    mode,
    onSelectMode,
}: DoctorCategoriesDiscoveryProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSpecialistsExpanded, setIsSpecialistsExpanded] = useState(false);

    // Initial 6 vs all 18 specialists
    const displayedSpecialists = isSpecialistsExpanded
        ? MOST_SEARCHED_SPECIALISTS
        : MOST_SEARCHED_SPECIALISTS.slice(0, 6);

    // Search across all canonical categories
    const allCategoriesFiltered = ALL_CANONICAL_CATEGORIES.filter(c =>
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.shortIntro.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCardClick = (slug: string) => {
        router.push(`/patient/doctors/category/${slug}?mode=${mode}`);
    };

    return (
        <div className="space-y-8">
            {/* Consultation Mode Banner Matching Android Experience */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            mode === 'in_person'
                                ? 'bg-emerald-50 text-vd-forest border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                            {mode === 'in_person' ? (
                                <Building2 className="w-6 h-6" />
                            ) : (
                                <Video className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-heading text-lg sm:text-xl font-bold text-stone-900">
                                    {mode === 'in_person' ? 'In-Person Consultation' : 'Instant Video Consultation'}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    mode === 'in_person'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                    {mode === 'in_person' ? '120 KM Local Radius' : 'Anywhere in India'}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                                {mode === 'in_person'
                                    ? 'Select a medical category to view details and discover doctors at verified clinics & hospitals within 120 km.'
                                    : 'Select a medical category to view details and connect with certified specialists online via HD video.'}
                            </p>
                        </div>
                    </div>

                    {/* Mode Toggle Switch */}
                    <div className="flex bg-stone-100 p-1 rounded-2xl shrink-0 text-xs font-semibold self-start sm:self-auto">
                        <button
                            onClick={() => onSelectMode('in_person')}
                            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                mode === 'in_person'
                                    ? 'bg-white text-vd-forest shadow-xs font-bold'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>In-Person (120 KM)</span>
                        </button>
                        <button
                            onClick={() => onSelectMode('video')}
                            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                mode === 'video'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            <Video className="w-3.5 h-3.5" />
                            <span>Video Consultation</span>
                        </button>
                    </div>
                </div>

                {/* Quick Search */}
                <div className="relative pt-2">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 mt-1" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search across all 39 medical specialties, symptoms & surgical procedures..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-vd-forest/20 focus:border-vd-forest transition-all"
                    />
                </div>
            </div>

            {/* SECTION 1 — MOST SEARCHED SPECIALISTS (18 TOTAL, INITIAL 6, EXPANDABLE) */}
            <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-heading text-base font-bold text-stone-900">
                            1. Most Searched Specialists
                        </h3>
                        <p className="text-xs text-stone-500 font-light">
                            Top medical disciplines consulted by patients ({displayedSpecialists.length} of {MOST_SEARCHED_SPECIALISTS.length})
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 transition-all">
                    {displayedSpecialists.map((item) => (
                        <div
                            key={item.slug}
                            onClick={() => handleCardClick(item.slug)}
                            className={`p-4 rounded-3xl border ${item.bgLight} transition-all duration-200 text-left flex items-start justify-between gap-3 group cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01]`}
                        >
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl bg-white border border-stone-200/80 flex items-center justify-center ${item.accentColor} shrink-0 group-hover:scale-105 transition-transform`}>
                                        <Stethoscope className="w-4 h-4" />
                                    </div>
                                    <h4 className="font-heading font-bold text-stone-900 text-sm group-hover:text-vd-forest transition-colors truncate">
                                        {item.title}
                                    </h4>
                                </div>
                                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                    {item.shortIntro}
                                </p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white/80 border border-stone-200 flex items-center justify-center text-stone-400 group-hover:text-vd-forest group-hover:border-vd-forest shrink-0 mt-1 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Intentional View More / View Less Section Control */}
                <div className="pt-2 flex justify-center">
                    <button
                        onClick={() => setIsSpecialistsExpanded(!isSpecialistsExpanded)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-stone-200 hover:border-vd-forest/50 text-stone-700 hover:text-vd-forest text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                    >
                        <span>
                            {isSpecialistsExpanded
                                ? 'View Less ↑'
                                : `View More Specialists (${MOST_SEARCHED_SPECIALISTS.length - 6} more) →`}
                        </span>
                        {isSpecialistsExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        )}
                    </button>
                </div>
            </section>

            {/* SECTION 2 — SURGERY & CONDITIONS (EXACT 8 CANONICAL ITEMS) */}
            <section className="space-y-3.5">
                <div>
                    <h3 className="font-heading text-base font-bold text-stone-900">
                        2. Surgery & Conditions
                    </h3>
                    <p className="text-xs text-stone-500 font-light">
                        All 8 canonical surgical procedures & conditions
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {SURGERY_CONDITIONS.map((item) => (
                        <div
                            key={item.slug}
                            onClick={() => handleCardClick(item.slug)}
                            className="p-4 rounded-3xl border bg-amber-50/70 border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
                        >
                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <h4 className="font-heading font-bold text-stone-900 text-sm group-hover:text-amber-800 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                                    {item.shortIntro}
                                </p>
                            </div>
                            <div className="pt-3 mt-2 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold text-amber-800">
                                <span>View Procedure Detail</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 3 — COMMON SYMPTOMS (EXACT 8 CANONICAL ITEMS) */}
            <section className="space-y-3.5">
                <div>
                    <h3 className="font-heading text-base font-bold text-stone-900">
                        3. Common Symptoms
                    </h3>
                    <p className="text-xs text-stone-500 font-light">
                        All 8 canonical symptoms with diagnostic doctor mapping
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {COMMON_SYMPTOMS.map((item) => (
                        <div
                            key={item.slug}
                            onClick={() => handleCardClick(item.slug)}
                            className="p-4 rounded-3xl border bg-rose-50/70 border-rose-200/80 hover:border-rose-400 hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
                        >
                            <div className="space-y-2">
                                <div className="w-8 h-8 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
                                    <Thermometer className="w-4 h-4" />
                                </div>
                                <h4 className="font-heading font-bold text-stone-900 text-sm group-hover:text-rose-800 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                                    {item.shortIntro}
                                </p>
                            </div>
                            <div className="pt-3 mt-2 border-t border-rose-200/60 flex items-center justify-between text-xs font-semibold text-rose-800">
                                <span>Symptom Detail</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 4 — ALL CATEGORIES (COMPLETE CANONICAL 39 SET) */}
            <section className="space-y-3.5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-heading text-base font-bold text-stone-900 flex items-center gap-2">
                            <Grid className="w-4 h-4 text-vd-forest" />
                            <span>4. All Categories ({allCategoriesFiltered.length})</span>
                        </h3>
                        <p className="text-xs text-stone-500 font-light">
                            Complete canonical healthcare disciplines & specialties
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allCategoriesFiltered.map((item) => (
                        <div
                            key={item.slug}
                            onClick={() => handleCardClick(item.slug)}
                            className="p-3.5 rounded-2xl bg-white border border-stone-200/80 hover:border-vd-forest/50 hover:shadow-xs transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                            <div className="min-w-0 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-600 group-hover:text-vd-forest group-hover:bg-emerald-50 shrink-0 transition-colors">
                                    <Stethoscope className="w-3.5 h-3.5" />
                                </div>
                                <div className="truncate">
                                    <h4 className="font-heading font-bold text-xs text-stone-900 group-hover:text-vd-forest transition-colors truncate">
                                        {item.title}
                                    </h4>
                                    <p className="text-[10px] text-stone-400 truncate">
                                        {item.specialization}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest shrink-0 transition-colors" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
