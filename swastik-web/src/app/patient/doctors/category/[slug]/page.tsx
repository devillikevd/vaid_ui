'use client';

import React, { use, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    Video,
    CheckCircle2,
    AlertCircle,
    Stethoscope,
    Shield,
    Sparkles,
    Activity,
    Compass,
    ArrowRight,
    Heart,
    Brain,
    Eye,
    Clock,
    FileText,
    HelpCircle,
    Search
} from 'lucide-react';
import { CANONICAL_CONSULTATION_CATEGORIES, getCategoryBySlug } from '@/lib/consultationCategoriesData';

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
}

function CategoryDetailContent({ slug }: { slug: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const modeParam = searchParams.get('mode') === 'video' ? 'video' : 'in_person';

    const [mode, setMode] = useState<'in_person' | 'video'>(modeParam);

    const category = getCategoryBySlug(slug) || {
        slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        specialization: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        shortIntro: 'Specialized medical consultation and clinical evaluation.',
        categoryGroup: 'all' as const,
        iconName: 'Stethoscope',
        accentColor: 'text-vd-forest',
        bgLight: 'bg-emerald-50/80 border-emerald-100',
        overview: 'Consult certified medical practitioners specializing in this discipline for diagnostic and clinical treatment.',
        whatItCovers: [
            'Clinical diagnosis and history evaluation',
            'Evidence-based prescription and care protocol',
            'Diagnostic test recommendations and lab review',
            'Long-term management and follow-up guidance',
        ],
        commonConcerns: [
            'Acute or chronic symptoms needing specialist evaluation',
            'Second opinions on ongoing treatment plans',
            'Preventive health evaluations and routine follow-ups',
        ],
        whenToConsult: [
            'Symptoms persisting or worsening over several days',
            'Interference with daily activities or sleep',
            'Need for specialized prescription or clinical testing',
        ],
    };

    const handleExploreDoctors = () => {
        router.push(
            `/patient/doctors?mode=${mode}&specialization=${encodeURIComponent(category.specialization)}&view=results`
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Top Navigation Back */}
            <div className="flex items-center justify-between gap-4">
                <Link
                    href={`/patient/doctors?mode=${mode}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Category Discovery</span>
                </Link>

                {/* Mode Selector Pill */}
                <div className="flex bg-stone-100 p-1 rounded-2xl shrink-0 text-xs font-semibold">
                    <button
                        onClick={() => setMode('in_person')}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                            mode === 'in_person'
                                ? 'bg-white text-vd-forest shadow-xs font-bold'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>In-Person (120 KM)</span>
                    </button>
                    <button
                        onClick={() => setMode('video')}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
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

            {/* Hero Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider border border-emerald-200/80">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Vaididea Medical Specialty</span>
                        </div>
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                            {category.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed max-w-2xl">
                            {category.shortIntro}
                        </p>
                    </div>

                    <button
                        onClick={handleExploreDoctors}
                        className={`px-6 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-center ${
                            mode === 'in_person'
                                ? 'bg-vd-forest hover:bg-vd-forest-deep shadow-emerald-900/10'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/10'
                        }`}
                    >
                        <span>Find {category.title} Doctors</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Consultation Mode Note */}
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                    mode === 'in_person'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-blue-50/60 border-blue-200 text-blue-950'
                }`}>
                    <div className="flex items-center gap-2">
                        {mode === 'in_person' ? (
                            <Building2 className="w-4 h-4 text-vd-forest shrink-0" />
                        ) : (
                            <Video className="w-4 h-4 text-blue-700 shrink-0" />
                        )}
                        <span>
                            {mode === 'in_person'
                                ? 'Consultation will search affiliated hospitals and clinics within your 120 km local radius.'
                                : 'Consultation will connect you with certified medical specialists online from home.'}
                        </span>
                    </div>
                    <span className="font-bold uppercase tracking-wider text-[10px] shrink-0">
                        {mode === 'in_person' ? '120 KM Proximity' : 'Remote Video'}
                    </span>
                </div>
            </div>

            {/* Clinical Overview */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
                    <FileText className="w-4 h-4 text-vd-forest" />
                    <h2>Clinical Overview</h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                    {category.overview}
                </p>
            </div>

            {/* Two Column Breakdown: What it Covers & Common Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. What This Specialty Covers */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-sm sm:text-base">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h3>What This Specialty Covers</h3>
                    </div>
                    <ul className="space-y-2.5">
                        {category.whatItCovers.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-vd-forest mt-1.5 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. Common Concerns Treated */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-sm sm:text-base">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        <h3>Common Concerns Treated</h3>
                    </div>
                    <ul className="space-y-2.5">
                        {category.commonConcerns.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* When to Seek Consultation (Warning Signs) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <h3>When Patients Commonly Seek Consultation</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {category.whenToConsult.map((item, idx) => (
                        <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-2.5 text-xs text-stone-700"
                        >
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Procedures / Symptoms Tags (if available) */}
            {category.proceduresOrSymptoms && category.proceduresOrSymptoms.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Diagnostic Procedures & Clinical Focus
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {category.proceduresOrSymptoms.map((proc, idx) => (
                            <span
                                key={idx}
                                className="px-3.5 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700"
                            >
                                {proc}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Clinical Tip Advisory */}
            {category.clinicalTip && (
                <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-vd-forest shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Medical Advisory Note: </span>
                        <span>{category.clinicalTip}</span>
                    </div>
                </div>
            )}

            {/* Bottom Action Card */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                    <h3 className="font-heading font-bold text-lg text-stone-900">
                        Ready to consult a {category.title}?
                    </h3>
                    <p className="text-xs text-stone-600 font-light">
                        {mode === 'in_person'
                            ? 'Discover verified doctors at partner clinics and hospitals near you.'
                            : 'Connect with verified specialists via instant video consultation.'}
                    </p>
                </div>
                <button
                    onClick={handleExploreDoctors}
                    className="px-6 py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                    <span>Explore {category.title} Doctors</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function CategoryDetailPage({ params }: CategoryPageProps) {
    const resolvedParams = use(params);
    return (
        <Suspense fallback={<div className="p-8 text-center text-stone-400">Loading category detail...</div>}>
            <CategoryDetailContent slug={resolvedParams.slug} />
        </Suspense>
    );
}
