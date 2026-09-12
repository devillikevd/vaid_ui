'use client';

import React, { useState } from 'react';
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

export default function CategoryDetailContent({ slug }: { slug: string }) {
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
        <div className="space-y-6 sm:space-y-8 font-sans">
            {/* Top Navigation Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                    <Link href="/" className="hover:text-vd-forest transition-colors">
                        Home
                    </Link>
                    <span>/</span>
                    <Link href="/patient/doctors" className="hover:text-vd-forest transition-colors">
                        Find Doctors
                    </Link>
                    <span>/</span>
                    <span className="text-stone-900 font-bold">{category.title}</span>
                </div>

                <Link
                    href={`/patient/doctors?mode=${mode}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-vd-forest hover:text-vd-forest-deep transition-colors bg-white px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Directory</span>
                </Link>
            </div>

            {/* Category Hero Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-50/80 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />

                <div className="relative z-1 space-y-4 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 text-xs font-bold">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Clinical Specialty Guide</span>
                    </div>

                    <h1 className="font-heading font-bold text-2xl sm:text-4xl text-stone-900 leading-tight">
                        {category.title}
                    </h1>

                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-light">
                        {category.shortIntro}
                    </p>

                    {/* Mode Toggle Controls */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                        <div className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200/80">
                            <button
                                onClick={() => setMode('in_person')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    mode === 'in_person'
                                        ? 'bg-white text-stone-900 shadow-2xs'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>In-Clinic Visit</span>
                            </button>

                            <button
                                onClick={() => setMode('video')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    mode === 'video'
                                        ? 'bg-white text-stone-900 shadow-2xs'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Video className="w-3.5 h-3.5 text-blue-600" />
                                <span>Video Consultation</span>
                            </button>
                        </div>

                        <button
                            onClick={handleExploreDoctors}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <span>Browse Available Doctors</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview & Clinical Scope */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* What This Specialty Covers */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
                        <Shield className="w-4 h-4 text-vd-forest" />
                        <h2>Scope of Care & Treatments</h2>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                        {category.overview}
                    </p>

                    <ul className="space-y-2.5 pt-2 border-t border-stone-100">
                        {category.whatItCovers.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Common Symptoms & Primary Concerns */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base">
                        <Activity className="w-4 h-4 text-vd-forest" />
                        <h2>Common Conditions Evaluated</h2>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                        Patients consult {category.title.toLowerCase()} specialists for both acute episodic presentations and recurring chronic conditions.
                    </p>

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
