'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ChevronRight,
    X,
    Loader2,
    ArrowLeft,
    AlertCircle,
    BookOpen,
    Activity,
    HelpCircle,
    AlertTriangle,
    Stethoscope,
    Bookmark,
    Share2,
    Check,
    Sparkles,
    Shield,
    Building2,
    Video,
    ArrowRight,
    ExternalLink,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

export interface Disease {
    id: number;
    code: string;
    name: string;
    first_letter: string;
    chapter: string;
    body_system: string;
    severity: string;
    keywords: string;
    source: string;
    variant_count: number;
    summary?: string;
    overview?: string;
    types?: string;
    symptoms?: string;
    causes?: string;
    risk_factors?: string;
    diagnosis?: string;
    medicines?: string;
    home_remedies?: string;
    complications?: string;
    prevention?: string;
    when_to_see_doctor?: string;
    faqs?: string;
}

export interface Category {
    id: number;
    chapter: string;
    body_system: string;
    disease_count: number;
    icon: string;
}

export interface Stats {
    total_diseases: number;
    total_categories: number;
    severity: { severity: string; cnt: number }[];
    by_letter: { first_letter: string; cnt: number }[];
}

const CATEGORY_EMOJIS: Record<string, string> = {
    virus: '🦠',
    cancer: '🎗️',
    blood: '🩸',
    metabolism: '⚖️',
    brain: '🧠',
    neurology: '⚡',
    eye: '👁️',
    ear: '👂',
    heart: '🫀',
    lungs: '🫁',
    stomach: '🥞',
    skin: '🩹',
    bone: '🦴',
    kidney: '🧼',
    pregnancy: '🤰',
    baby: '👶',
    dna: '🧬',
    stethoscope: '🩺',
    injury: '🩹',
    emergency: '🚨',
    checkup: '✅',
    medical: '🏥',
    code: '💾',
};

// Map disease chapter, body system, or name to specialist category slug
export function getRelatedSpecialty(disease: Disease): {
    title: string;
    specialization: string;
    slug: string;
    iconName: string;
} {
    const chapter = (disease.chapter || '').toLowerCase();
    const system = (disease.body_system || '').toLowerCase();
    const name = (disease.name || '').toLowerCase();
    const keywords = (disease.keywords || '').toLowerCase();

    if (
        chapter.includes('skin') ||
        system.includes('integumentary') ||
        system.includes('skin') ||
        name.includes('dermat') ||
        name.includes('acne') ||
        name.includes('eczema') ||
        name.includes('psoriasis')
    ) {
        return {
            title: 'Dermatologist (Skin & Hair)',
            specialization: 'Dermatology',
            slug: 'dermatologist',
            iconName: 'Sparkles',
        };
    }

    if (
        chapter.includes('circulatory') ||
        system.includes('cardio') ||
        name.includes('heart') ||
        name.includes('hypertension') ||
        name.includes('cardiac') ||
        name.includes('coronary')
    ) {
        return {
            title: 'Cardiologist (Heart Specialist)',
            specialization: 'Cardiology',
            slug: 'cardiologist',
            iconName: 'Heart',
        };
    }

    if (
        chapter.includes('respiratory') ||
        system.includes('respiratory') ||
        name.includes('asthma') ||
        name.includes('bronch') ||
        name.includes('lung') ||
        name.includes('copd')
    ) {
        return {
            title: 'Pulmonologist (Chest & Lungs)',
            specialization: 'Pulmonology',
            slug: 'pulmonologist',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('nervous') ||
        system.includes('nervous') ||
        name.includes('migraine') ||
        name.includes('epilepsy') ||
        name.includes('neuropathy') ||
        name.includes('brain')
    ) {
        return {
            title: 'Neurologist (Brain & Nerves)',
            specialization: 'Neurology',
            slug: 'neurologist',
            iconName: 'Brain',
        };
    }

    if (
        chapter.includes('digestive') ||
        system.includes('digestive') ||
        system.includes('gastro') ||
        name.includes('gastric') ||
        name.includes('liver') ||
        name.includes('ulcer') ||
        name.includes('gerd')
    ) {
        return {
            title: 'Gastroenterologist (Stomach & Digestion)',
            specialization: 'Gastroenterology',
            slug: 'gastroenterologist',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('eye') ||
        system.includes('visual') ||
        system.includes('eye') ||
        name.includes('cataract') ||
        name.includes('glaucoma') ||
        name.includes('conjunctiv')
    ) {
        return {
            title: 'Ophthalmologist (Eye Care)',
            specialization: 'Ophthalmology',
            slug: 'ophthalmologist',
            iconName: 'Eye',
        };
    }

    if (
        chapter.includes('ear') ||
        chapter.includes('mastoid') ||
        name.includes('sinus') ||
        name.includes('tonsil') ||
        name.includes('ear') ||
        name.includes('tinnitus')
    ) {
        return {
            title: 'ENT Specialist (Ear, Nose & Throat)',
            specialization: 'ENT',
            slug: 'ent-specialist',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('musculoskeletal') ||
        system.includes('musculo') ||
        system.includes('skeletal') ||
        name.includes('arthritis') ||
        name.includes('fracture') ||
        name.includes('joint') ||
        name.includes('bone')
    ) {
        return {
            title: 'Orthopedic Surgeon (Bones & Joints)',
            specialization: 'Orthopedics',
            slug: 'orthopedic-surgeon',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('pregnancy') ||
        chapter.includes('puerperium') ||
        name.includes('pregnan') ||
        name.includes('pcos') ||
        name.includes('pcod') ||
        name.includes('uter') ||
        name.includes('ovari')
    ) {
        return {
            title: 'Gynecologist & Obstetrician (Women’s Health)',
            specialization: 'Gynecology',
            slug: 'gynecologist',
            iconName: 'Heart',
        };
    }

    if (
        chapter.includes('perinatal') ||
        chapter.includes('child') ||
        name.includes('pediatric') ||
        name.includes('infant')
    ) {
        return {
            title: 'Pediatrician (Child Specialist)',
            specialization: 'Pediatrics',
            slug: 'pediatrician',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('endocrine') ||
        chapter.includes('metabolic') ||
        name.includes('diabetes') ||
        name.includes('thyroid') ||
        keywords.includes('insulin')
    ) {
        return {
            title: 'Endocrinologist (Diabetes & Hormones)',
            specialization: 'Endocrinology',
            slug: 'endocrinologist',
            iconName: 'Activity',
        };
    }

    if (
        chapter.includes('mental') ||
        chapter.includes('behavioural') ||
        name.includes('anxiety') ||
        name.includes('depression') ||
        name.includes('bipolar')
    ) {
        return {
            title: 'Psychiatrist (Mental Health)',
            specialization: 'Psychiatry',
            slug: 'psychiatrist',
            iconName: 'Brain',
        };
    }

    if (
        chapter.includes('genitourinary') ||
        system.includes('urinary') ||
        name.includes('kidney') ||
        name.includes('prostate') ||
        name.includes('urinary')
    ) {
        return {
            title: 'Urologist & Nephrologist',
            specialization: 'Urology',
            slug: 'urologist',
            iconName: 'Activity',
        };
    }

    if (chapter.includes('neoplasm') || name.includes('carcinoma') || name.includes('tumor')) {
        return {
            title: 'Oncologist (Cancer Specialist)',
            specialization: 'Oncology',
            slug: 'oncologist',
            iconName: 'Activity',
        };
    }

    // Default general primary care
    return {
        title: 'General Physician',
        specialization: 'General Physician',
        slug: 'general-physician',
        iconName: 'Stethoscope',
    };
}

interface HealthLibraryExplorerProps {
    portalMode?: boolean;
    initialQuery?: string;
}

export default function HealthLibraryExplorer({
    portalMode = false,
    initialQuery = '',
}: HealthLibraryExplorerProps) {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const { requireAuth } = useAuthGate();

    // Stats & categories
    const [stats, setStats] = useState<Stats | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);

    // Search state
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [selectedSeverity, setSelectedSeverity] = useState('');
    const [activeLetter, setActiveLetter] = useState('');
    const [activeCategory, setActiveCategory] = useState('');

    // Results state
    const [results, setResults] = useState<Disease[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentMode, setCurrentMode] = useState<'search' | 'alphabet' | 'category' | null>(
        initialQuery ? 'search' : null
    );
    const [searchTriggeredQuery, setSearchTriggeredQuery] = useState(initialQuery);

    // Detail modal state
    const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
    const [diseaseDetails, setDiseaseDetails] = useState<Disease | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('overview');
    const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});
    const [savedNotice, setSavedNotice] = useState(false);

    const LIMIT = 24;
    const resultsSectionRef = useRef<HTMLDivElement>(null);

    const suggestions = ['Diabetes', 'Hypertension', 'Malaria', 'Asthma', 'Dermatitis', 'Migraine', 'Thyroid'];

    // Load initial stats & categories
    useEffect(() => {
        let isMounted = true;
        async function loadInitialData() {
            try {
                const [statsRes, catsRes] = await Promise.allSettled([
                    fetch(`${API_BASE_URL}/diseases/stats`),
                    fetch(`${API_BASE_URL}/diseases/categories`),
                ]);

                if (statsRes.status === 'fulfilled' && statsRes.value.ok && isMounted) {
                    const statsData = await statsRes.value.json();
                    setStats(statsData);
                }

                if (catsRes.status === 'fulfilled' && catsRes.value.ok && isMounted) {
                    const catsData = await catsRes.value.json();
                    setCategories(Array.isArray(catsData) ? catsData : []);
                }
            } catch (e) {
                console.error('Failed to load health library stats or categories', e);
            }
        }
        loadInitialData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch results based on active filters
    const fetchResults = async (page = 1) => {
        if (!currentMode) return;
        setIsSearching(true);
        setError(null);

        let url = '';
        const sevParam = selectedSeverity ? `&severity=${encodeURIComponent(selectedSeverity)}` : '';

        if (currentMode === 'search') {
            url = `${API_BASE_URL}/diseases/search?q=${encodeURIComponent(searchTriggeredQuery)}&page=${page}&limit=${LIMIT}${sevParam}`;
        } else if (currentMode === 'alphabet') {
            url = `${API_BASE_URL}/diseases/alphabet/${encodeURIComponent(activeLetter)}?page=${page}&limit=${LIMIT}${sevParam}`;
        } else if (currentMode === 'category') {
            url = `${API_BASE_URL}/diseases/category/${encodeURIComponent(activeCategory)}?page=${page}&limit=${LIMIT}${sevParam}`;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Health Library API request failed with status: ${res.status}`);
            }
            const data = await res.json();
            setResults(Array.isArray(data?.results) ? data.results : []);
            setTotalResults(Number(data?.total) || (Array.isArray(data?.results) ? data.results.length : 0));
            setCurrentPage(Number(data?.page) || page);
        } catch (err) {
            console.error('Health Library fetch failed:', {
                url,
                error: err,
            });
            setResults([]);
            setTotalResults(0);
            setError('Unable to load health information right now. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (currentMode) {
            fetchResults(currentPage);
        }
    }, [selectedSeverity, currentPage, currentMode, activeLetter, activeCategory, searchTriggeredQuery]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const query = searchQuery.trim();
        if (query.length < 2) return;

        setActiveLetter('');
        setActiveCategory('');
        setCurrentMode('search');
        setSearchTriggeredQuery(query);
        setCurrentPage(1);

        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleLetterClick = (letter: string) => {
        setSearchQuery('');
        setActiveCategory('');
        setActiveLetter(letter);
        setCurrentMode('alphabet');
        setCurrentPage(1);

        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleCategoryClick = (chapterName: string) => {
        setSearchQuery('');
        setActiveLetter('');
        setActiveCategory(chapterName);
        setCurrentMode('category');
        setCurrentPage(1);

        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Details Modal handler
    const handleOpenDetails = async (disease: Disease) => {
        setSelectedDisease(disease);
        setDiseaseDetails(null);
        setIsLoadingDetails(true);
        setActiveDetailTab('overview');
        setOpenFaqs({});
        setSavedNotice(false);
        document.body.style.overflow = 'hidden';

        try {
            const res = await fetch(`${API_BASE_URL}/diseases/disease/${encodeURIComponent(disease.code)}/details`);
            if (!res.ok) {
                throw new Error(`Disease details request failed: ${res.status}`);
            }
            const details = await res.json();
            setDiseaseDetails(details);
        } catch (e) {
            console.error('Error loading disease details', e);
            setDiseaseDetails(disease);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseDetails = () => {
        setSelectedDisease(null);
        setDiseaseDetails(null);
        setSavedNotice(false);
        document.body.style.overflow = 'unset';
    };

    const handleSaveToProfile = (diseaseName: string) => {
        requireAuth({
            actionType: 'health_record',
            title: 'Save to My Health Profile',
            description: `Sign in to bookmark "${diseaseName}" and attach it to your personal medical condition summary.`,
            returnUrl: portalMode ? '/patient/health-library' : '/health-library',
            onAuthenticated: () => {
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 3500);
            },
        });
    };

    const getSeverityStyle = (severity: string) => {
        switch (severity) {
            case 'Critical':
                return {
                    border: 'border-red-500/25 bg-red-50/50 hover:border-red-500',
                    pill: 'bg-red-100 text-red-800 border-red-200',
                    accent: 'text-red-600',
                };
            case 'Severe':
                return {
                    border: 'border-amber-500/25 bg-amber-50/50 hover:border-amber-500',
                    pill: 'bg-amber-100 text-amber-800 border-amber-200',
                    accent: 'text-amber-600',
                };
            case 'Moderate':
                return {
                    border: 'border-yellow-500/25 bg-yellow-50/40 hover:border-yellow-500',
                    pill: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    accent: 'text-yellow-600',
                };
            default:
                return {
                    border: 'border-stone-200 bg-white hover:border-emerald-600/40',
                    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    accent: 'text-vd-forest',
                };
        }
    };

    const parseHtmlList = (htmlStr?: string): string[] => {
        if (!htmlStr) return [];
        return htmlStr
            .replace(/<\/?(ul|ol)>/g, '')
            .split(/<\/li>|<li>/)
            .map((item) => item.replace(/<[^>]*>?/gm, '').trim())
            .filter((item) => item.length > 0);
    };

    const parseFaqs = (faqsStr?: string): { id: number; question: string; answer: string }[] => {
        if (!faqsStr) return [];
        try {
            const parsed = JSON.parse(faqsStr);
            if (Array.isArray(parsed)) {
                return parsed.map((f, i) => ({ id: i, question: f.q || f.question, answer: f.a || f.answer }));
            }
        } catch {
            const parts = faqsStr.split(/Q:|\?/).filter(Boolean);
            if (parts.length >= 2) {
                return [{ id: 0, question: parts[0]?.trim() + '?', answer: parts[1]?.trim() }];
            }
        }
        return [];
    };

    const letterCounts = (stats?.by_letter || []).reduce<Record<string, number>>((acc, curr) => {
        acc[curr.first_letter.toUpperCase()] = curr.cnt;
        return acc;
    }, {});

    const totalPages = Math.ceil(totalResults / LIMIT);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const relatedSpecialty = selectedDisease ? getRelatedSpecialty(selectedDisease) : null;

    return (
        <div className="space-y-6">
            {/* Header Hero */}
            <div className={`rounded-3xl border ${portalMode ? 'p-5 sm:p-6 bg-white border-stone-200/80' : 'p-6 sm:p-8 bg-white border-stone-200/80 shadow-xs'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-vd-forest text-xs font-bold uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Vaididea Clinical Health Library</span>
                        </div>
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
                            Explore Evidence-Based Medical Knowledge
                        </h1>
                        <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                            Search thousands of verified medical conditions, clinical symptoms, and doctor-approved
                            guidance indexed directly by standard ICD-10 chapters.
                        </p>
                    </div>

                    {/* Stats Highlights */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-center min-w-[110px]">
                            <div className="font-heading text-lg sm:text-xl font-bold text-vd-forest">
                                {stats?.total_diseases ? stats.total_diseases.toLocaleString() : '8,400+'}
                            </div>
                            <div className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                                Conditions
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-center min-w-[110px]">
                            <div className="font-heading text-lg sm:text-xl font-bold text-vd-forest">
                                {categories.length > 0 ? categories.length : '22'}
                            </div>
                            <div className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">
                                Body Systems
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="mt-6">
                    <div className="relative flex items-center">
                        <Search className="w-5 h-5 text-stone-400 absolute left-4 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search symptoms, condition names, or ICD-10 codes (e.g. Hypertension, Migraine, E11)..."
                            className="w-full pl-12 pr-28 py-3.5 sm:py-4 bg-stone-50/80 border border-stone-300 hover:border-vd-forest/50 focus:border-vd-forest focus:bg-white rounded-2xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none transition-all"
                        />
                        <div className="absolute right-2 flex items-center gap-1.5">
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentMode(null);
                                    }}
                                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-4 py-2 sm:py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Quick Suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className="text-[11px] text-stone-400 font-medium mr-1">Popular:</span>
                        {suggestions.map((sug) => (
                            <button
                                key={sug}
                                type="button"
                                onClick={() => {
                                    setSearchQuery(sug);
                                    setActiveLetter('');
                                    setActiveCategory('');
                                    setCurrentMode('search');
                                    setSearchTriggeredQuery(sug);
                                    setCurrentPage(1);
                                    resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-vd-forest text-stone-600 font-medium transition-colors cursor-pointer border border-stone-200/60"
                            >
                                {sug}
                            </button>
                        ))}
                    </div>
                </form>
            </div>

            {/* Main Exploration Grid: Sidebar (A-Z & Severities) + Results */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Controls & Filters */}
                <aside className="lg:col-span-1 space-y-4">
                    {/* Severity Filters */}
                    <div className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-2xs">
                        <h2 className="font-heading text-xs font-bold text-vd-forest uppercase tracking-wider mb-3 pb-1.5 border-b border-stone-100">
                            Clinical Severity
                        </h2>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: '', label: 'All Levels', emoji: '🩺', color: 'text-stone-700' },
                                { id: 'Critical', label: 'Critical', emoji: '🚨', color: 'text-rose-700' },
                                { id: 'Severe', label: 'Severe', emoji: '⚠️', color: 'text-amber-700' },
                                { id: 'Moderate', label: 'Moderate', emoji: '🟡', color: 'text-yellow-700' },
                                { id: 'General', label: 'General', emoji: '🟢', color: 'text-emerald-700' },
                            ].map((sev) => {
                                const isSelected = selectedSeverity === sev.id;
                                return (
                                    <button
                                        key={sev.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSeverity(sev.id);
                                            setCurrentPage(1);
                                        }}
                                        className={`p-2 rounded-xl text-left border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSelected
                                                ? 'bg-vd-forest text-white border-vd-forest shadow-xs'
                                                : 'bg-stone-50/60 text-stone-700 border-stone-200/80 hover:bg-white'
                                        }`}
                                    >
                                        <span>{sev.emoji}</span>
                                        <span className="truncate">{sev.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* A–Z Alphabet Index */}
                    <div className="bg-white rounded-3xl border border-stone-200/80 p-4 shadow-2xs">
                        <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-stone-100">
                            <h2 className="font-heading text-xs font-bold text-vd-forest uppercase tracking-wider">
                                A–Z Alphabet Index
                            </h2>
                            {activeLetter && (
                                <button
                                    onClick={() => {
                                        setActiveLetter('');
                                        setCurrentMode(null);
                                    }}
                                    className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => {
                                const count = letterCounts[letter] || 0;
                                const isActive = activeLetter === letter;
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => handleLetterClick(letter)}
                                        className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center border font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-vd-forest text-white border-vd-forest shadow-xs'
                                                : count > 0
                                                ? 'bg-stone-50/60 text-stone-700 border-stone-200/70 hover:border-vd-forest/40 hover:bg-white'
                                                : 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed pointer-events-none'
                                        }`}
                                    >
                                        <span className="text-xs leading-none font-bold">{letter}</span>
                                        {count > 0 && (
                                            <span
                                                className={`text-[8.5px] font-medium mt-0.5 px-1 rounded ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-500'
                                                }`}
                                            >
                                                {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Right Side: Chapters Grid OR Search/Alphabet/Category Results */}
                <section ref={resultsSectionRef} className="lg:col-span-3 flex flex-col gap-6">
                    {/* Active Mode Banner */}
                    {currentMode && (
                        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <h3 className="font-heading text-base sm:text-lg font-bold text-vd-forest leading-tight">
                                    {currentMode === 'search' && `Search results for "${searchTriggeredQuery}"`}
                                    {currentMode === 'alphabet' && `Conditions starting with "${activeLetter}"`}
                                    {currentMode === 'category' && `Chapter: ${activeCategory}`}
                                </h3>
                                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                                    {totalResults.toLocaleString()} medical conditions cataloged
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setCurrentMode(null);
                                    setSearchQuery('');
                                    setActiveLetter('');
                                    setActiveCategory('');
                                }}
                                className="text-xs text-stone-600 hover:text-vd-forest px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors whitespace-nowrap font-semibold cursor-pointer"
                            >
                                ← View All Chapters
                            </button>
                        </div>
                    )}

                    {/* Results Content */}
                    <AnimatePresence mode="wait">
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-stone-200/80">
                                <Loader2 className="w-8 h-8 text-vd-forest animate-spin" />
                                <p className="text-stone-500 font-medium text-xs">
                                    Querying canonical clinical database...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-3xl border border-rose-200/80 p-8 text-center shadow-2xs">
                                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                                <h4 className="font-heading text-base font-bold text-stone-800">
                                    Unable to load Health Library data
                                </h4>
                                <p className="text-stone-500 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                                    {error}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fetchResults(currentPage)}
                                    className="mt-4 px-4 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    Retry Search
                                </button>
                            </div>
                        ) : currentMode && results.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {results.map((disease) => {
                                        const style = getSeverityStyle(disease.severity);
                                        const keywords = disease.keywords
                                            ? disease.keywords.split(',').filter(Boolean).slice(0, 3)
                                            : [];
                                        return (
                                            <div
                                                key={disease.id}
                                                onClick={() => handleOpenDetails(disease)}
                                                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between bg-white ${style.border}`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md">
                                                                {disease.code}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-stone-400 uppercase truncate max-w-32">
                                                                {disease.body_system}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.pill}`}
                                                        >
                                                            {disease.severity}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-heading font-bold text-stone-900 text-sm sm:text-base mb-1 leading-snug hover:text-vd-forest">
                                                        {disease.name}
                                                    </h4>
                                                    <p className="text-xs text-stone-500 font-light line-clamp-1 mb-3">
                                                        {disease.chapter}
                                                    </p>
                                                </div>
                                                <div>
                                                    {keywords.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2.5">
                                                            {keywords.map((k) => (
                                                                <span
                                                                    key={k}
                                                                    className="text-[9px] font-medium px-2 py-0.5 bg-stone-50 border border-stone-100 rounded-md text-stone-500"
                                                                >
                                                                    {k.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                                                        <span className="text-[11px] font-medium text-stone-400">
                                                            ICD-10 Indexed
                                                        </span>
                                                        <Link
                                                            href={`/disease/${encodeURIComponent(disease.code)}`}
                                                            onClick={(e) => {
                                                                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                                                                    e.stopPropagation();
                                                                }
                                                            }}
                                                            className="text-xs font-semibold text-vd-forest hover:text-vd-forest-deep flex items-center gap-1 hover:underline cursor-pointer"
                                                        >
                                                            <span>Read Medical Guide</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200/80 rounded-2xl p-3.5 shadow-2xs">
                                        <div className="text-xs font-medium text-stone-500">
                                            Page <span className="font-semibold text-stone-800">{currentPage}</span> of{' '}
                                            <span className="font-semibold text-stone-800">{totalPages}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 font-medium"
                                            >
                                                Prev
                                            </button>
                                            {getPageNumbers().map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`w-7 h-7 text-xs rounded-lg border font-semibold transition-all ${
                                                        currentPage === p
                                                            ? 'bg-vd-forest border-vd-forest text-white'
                                                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 font-medium"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : currentMode && results.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-stone-200/80 p-10 text-center shadow-2xs">
                                <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                                <h4 className="font-heading text-base font-bold text-stone-800">
                                    No medical conditions found
                                </h4>
                                <p className="text-stone-500 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                                    Try adjusting your search keywords, clearing severity filters, or choosing a chapter
                                    below.
                                </p>
                            </div>
                        ) : (
                            /* Default View: Chapters & Body Systems */
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-baseline">
                                    <div>
                                        <h2 className="font-heading text-lg sm:text-xl font-bold text-vd-forest">
                                            ICD-10 Chapters & Body Systems
                                        </h2>
                                        <p className="text-stone-500 text-xs font-light mt-0.5">
                                            Select a category to browse conditions, symptoms, and clinical guidelines.
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-stone-400">
                                        {categories.length} Chapters
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {categories.map((cat) => {
                                        const iconKey = cat.icon || 'medical';
                                        const emoji = CATEGORY_EMOJIS[iconKey] || CATEGORY_EMOJIS.medical;

                                        return (
                                            <div
                                                key={cat.id}
                                                onClick={() => handleCategoryClick(cat.chapter)}
                                                className="bg-white p-4 rounded-2xl border border-stone-200/80 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[115px] cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform select-none">
                                                        {emoji}
                                                    </div>
                                                    <span className="text-[11px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full border border-stone-200/60 whitespace-nowrap">
                                                        {cat.disease_count.toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="mt-2.5">
                                                    <h3 className="font-heading font-bold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-vd-forest transition-colors">
                                                        {cat.chapter}
                                                    </h3>
                                                    <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide block mt-1 truncate">
                                                        {cat.body_system}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </section>
            </div>

            {/* Disease Detail Modal */}
            <AnimatePresence>
                {selectedDisease && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseDetails}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[88vh] relative z-10 flex flex-col border border-stone-200"
                        >
                            <div className="overflow-y-auto w-full h-full flex flex-col">
                                {/* Header Hero */}
                                <div
                                    className={`shrink-0 p-6 md:p-8 bg-gradient-to-r text-white flex justify-between items-start relative border-b border-white/10 ${
                                        selectedDisease.severity === 'Critical'
                                            ? 'from-red-700 to-rose-950'
                                            : selectedDisease.severity === 'Severe'
                                            ? 'from-amber-700 to-orange-950'
                                            : selectedDisease.severity === 'Moderate'
                                            ? 'from-yellow-700 to-amber-950'
                                            : 'from-emerald-800 to-vd-forest'
                                    }`}
                                >
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                                            <span className="text-xs uppercase tracking-wider font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full">
                                                ICD-10: {selectedDisease.code}
                                            </span>
                                            <span className="text-xs uppercase tracking-wider font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full">
                                                {selectedDisease.severity} Severity
                                            </span>
                                        </div>
                                        <h2 className="font-heading text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                                            {selectedDisease.name}
                                        </h2>
                                        <p className="text-xs text-emerald-100/90 font-light mt-1 max-w-2xl leading-relaxed">
                                            {selectedDisease.chapter} • Body System: {selectedDisease.body_system}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/disease/${encodeURIComponent(selectedDisease.code)}`}
                                            className="shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/15 text-white active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold px-3 cursor-pointer"
                                            title="Open full dedicated page"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="hidden sm:inline">Open Page</span>
                                        </Link>
                                        <button
                                            onClick={() => handleSaveToProfile(selectedDisease.name)}
                                            className="shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/15 text-white active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold px-3 cursor-pointer"
                                            title="Bookmark article to health profile"
                                        >
                                            <Bookmark className="w-4 h-4" />
                                            <span className="hidden sm:inline">Save</span>
                                        </button>
                                        <button
                                            onClick={handleCloseDetails}
                                            className="shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/15 text-white active:scale-95 shadow-md cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {savedNotice && (
                                    <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4" />
                                            <span>Saved to your personal health library bookmarks!</span>
                                        </div>
                                        <button
                                            onClick={() => setSavedNotice(false)}
                                            className="text-white/80 hover:text-white cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                {/* Related Doctor Discovery Banner */}
                                {relatedSpecialty && (
                                    <div className="bg-emerald-50/90 border-b border-emerald-100 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-vd-forest text-white flex items-center justify-center shrink-0">
                                                <Stethoscope className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-900 leading-tight">
                                                    Need clinical care for this condition?
                                                </p>
                                                <p className="text-[11px] text-stone-600">
                                                    Consult certified {relatedSpecialty.specialization} doctors near you or online.
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/patient/doctors/category/${relatedSpecialty.slug}?mode=in_person`}
                                            onClick={handleCloseDetails}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                                        >
                                            <span>Find {relatedSpecialty.specialization} Doctors</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                )}

                                {/* Tab Navigation */}
                                <div className="shrink-0 flex flex-wrap border-b border-stone-200 px-6 bg-stone-50/80">
                                    {[
                                        { id: 'overview', label: 'Overview' },
                                        { id: 'symptoms', label: 'Symptoms' },
                                        { id: 'causes', label: 'Causes & Risks' },
                                        { id: 'treatment', label: 'Treatment' },
                                        { id: 'prevention', label: 'Prevention' },
                                        { id: 'faqs', label: 'FAQs' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveDetailTab(tab.id)}
                                            className={`py-3.5 px-4 font-semibold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                                activeDetailTab === tab.id
                                                    ? 'border-vd-forest text-vd-forest font-bold'
                                                    : 'border-transparent text-stone-500 hover:text-stone-800'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Content Body */}
                                <div className="p-6 md:p-8 flex-1 bg-stone-50/30">
                                    <AnimatePresence mode="wait">
                                        {isLoadingDetails ? (
                                            <div className="flex flex-col gap-4 py-8">
                                                <div className="h-5 w-44 bg-stone-200 rounded-lg animate-pulse mb-2" />
                                                <div className="h-4 w-full bg-stone-200 rounded animate-pulse" />
                                                <div className="h-4 w-[95%] bg-stone-200 rounded animate-pulse" />
                                                <div className="h-4 w-[90%] bg-stone-200 rounded animate-pulse" />
                                                <div className="h-4 w-[75%] bg-stone-200 rounded animate-pulse mt-2" />
                                            </div>
                                        ) : diseaseDetails ? (
                                            <motion.div
                                                key={activeDetailTab}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="text-stone-700 text-xs sm:text-sm leading-relaxed"
                                            >
                                                {/* OVERVIEW TAB */}
                                                {activeDetailTab === 'overview' && (
                                                    <div className="flex flex-col gap-5">
                                                        {diseaseDetails.summary && (
                                                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex gap-3.5">
                                                                <div className="text-2xl select-none">💡</div>
                                                                <div>
                                                                    <span className="font-bold text-vd-forest text-xs uppercase tracking-wider block mb-1">
                                                                        Quick Summary
                                                                    </span>
                                                                    <p className="text-emerald-950 font-medium text-xs sm:text-sm leading-relaxed">
                                                                        {diseaseDetails.summary}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="font-heading text-base font-bold text-vd-forest mb-2">
                                                                About this Condition
                                                            </h3>
                                                            <div
                                                                className="text-stone-600 font-light flex flex-col gap-2.5"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: sanitizeHtml(
                                                                        diseaseDetails.overview ||
                                                                        'Detailed clinical overview is being compiled for this condition.',
                                                                    ),
                                                                }}
                                                            />
                                                        </div>

                                                        {diseaseDetails.types && (
                                                            <div className="mt-2">
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-2.5">
                                                                    Classification & Subtypes
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                                                    {parseHtmlList(diseaseDetails.types).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: sanitizeHtml(item),
                                                                                }}
                                                                            />
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* SYMPTOMS TAB */}
                                                {activeDetailTab === 'symptoms' && (
                                                    <div className="flex flex-col gap-5">
                                                        <div>
                                                            <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                Common Clinical Symptoms
                                                            </h3>
                                                            <p className="text-stone-500 text-xs font-light mb-3">
                                                                Signs and physiological changes associated with this diagnosis.
                                                            </p>
                                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                {parseHtmlList(diseaseDetails.symptoms).map(
                                                                    (item, idx) => (
                                                                        <li
                                                                            key={idx}
                                                                            className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5 items-start"
                                                                        >
                                                                            <span className="text-stone-400 select-none">
                                                                                🩺
                                                                            </span>
                                                                            <div
                                                                                className="text-stone-700"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: sanitizeHtml(item),
                                                                                }}
                                                                            />
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        </div>

                                                        {diseaseDetails.when_to_see_doctor && (
                                                            <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 sm:p-5 flex gap-3">
                                                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <span className="font-bold text-rose-800 text-xs uppercase tracking-wider block mb-1">
                                                                        When to Seek Immediate Medical Care
                                                                    </span>
                                                                    <p className="text-rose-950 font-medium text-xs sm:text-sm leading-relaxed">
                                                                        {diseaseDetails.when_to_see_doctor}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* CAUSES TAB */}
                                                {activeDetailTab === 'causes' && (
                                                    <div className="flex flex-col gap-5">
                                                        <div>
                                                            <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                Root Causes & Etiology
                                                            </h3>
                                                            <p className="text-stone-500 text-xs font-light mb-3">
                                                                Biological, genetic, and environmental factors contributing to onset.
                                                            </p>
                                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                {parseHtmlList(diseaseDetails.causes).map(
                                                                    (item, idx) => (
                                                                        <li
                                                                            key={idx}
                                                                            className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                        >
                                                                            <span className="text-emerald-600 select-none">
                                                                                🧬
                                                                            </span>
                                                                            <div
                                                                                className="text-stone-700"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: sanitizeHtml(item),
                                                                                }}
                                                                            />
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        </div>

                                                        {diseaseDetails.risk_factors && (
                                                            <div>
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                    Risk Factors
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                    {parseHtmlList(diseaseDetails.risk_factors).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                            >
                                                                                <span className="text-amber-500 select-none">
                                                                                    ⚠️
                                                                                </span>
                                                                                <div
                                                                                    className="text-stone-700"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: sanitizeHtml(item),
                                                                                    }}
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* TREATMENT TAB */}
                                                {activeDetailTab === 'treatment' && (
                                                    <div className="flex flex-col gap-5">
                                                        {diseaseDetails.diagnosis && (
                                                            <div>
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                    Diagnosis & Clinical Testing
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                    {parseHtmlList(diseaseDetails.diagnosis).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                            >
                                                                                <span className="text-blue-500 select-none">
                                                                                    🔬
                                                                                </span>
                                                                                <div
                                                                                    className="text-stone-700"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: sanitizeHtml(item),
                                                                                    }}
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {diseaseDetails.medicines && (
                                                            <div>
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                    Standard Treatments & Pharmacotherapy
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                    {parseHtmlList(diseaseDetails.medicines).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                            >
                                                                                <span className="text-indigo-500 select-none">
                                                                                    💊
                                                                                </span>
                                                                                <div
                                                                                    className="text-stone-700"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: sanitizeHtml(item),
                                                                                    }}
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {diseaseDetails.home_remedies && (
                                                            <div>
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                    Home Care & Lifestyle Support
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                    {parseHtmlList(diseaseDetails.home_remedies).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                            >
                                                                                <span className="text-emerald-500 select-none">
                                                                                    🏠
                                                                                </span>
                                                                                <div
                                                                                    className="text-stone-700"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: sanitizeHtml(item),
                                                                                    }}
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* PREVENTION TAB */}
                                                {activeDetailTab === 'prevention' && (
                                                    <div className="flex flex-col gap-5">
                                                        <div>
                                                            <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                Preventative Guidelines & Health Habits
                                                            </h3>
                                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                {parseHtmlList(diseaseDetails.prevention).map(
                                                                    (item, idx) => (
                                                                        <li
                                                                            key={idx}
                                                                            className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                        >
                                                                            <span className="text-purple-500 select-none">
                                                                                🛡️
                                                                            </span>
                                                                            <div
                                                                                className="text-stone-700"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: sanitizeHtml(item),
                                                                                }}
                                                                            />
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        </div>

                                                        {diseaseDetails.complications && (
                                                            <div>
                                                                <h3 className="font-heading text-base font-bold text-vd-forest mb-1">
                                                                    Potential Long-term Complications
                                                                </h3>
                                                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none">
                                                                    {parseHtmlList(diseaseDetails.complications).map(
                                                                        (item, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs flex gap-2.5"
                                                                            >
                                                                                <span className="text-rose-500 select-none">
                                                                                    📈
                                                                                </span>
                                                                                <div
                                                                                    className="text-stone-700"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: sanitizeHtml(item),
                                                                                    }}
                                                                                />
                                                                            </li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* FAQS TAB */}
                                                {activeDetailTab === 'faqs' && (
                                                    <div>
                                                        <h3 className="font-heading text-base font-bold text-vd-forest mb-1 flex items-center gap-2">
                                                            <HelpCircle className="w-4 h-4" />
                                                            <span>Frequently Asked Patient Questions</span>
                                                        </h3>
                                                        <p className="text-stone-500 text-xs font-light mb-4">
                                                            Clinical questions answered for patient clarity.
                                                        </p>
                                                        <div className="flex flex-col gap-2.5">
                                                            {parseFaqs(diseaseDetails.faqs).map((faq) => {
                                                                const isOpen = openFaqs[faq.id] || false;
                                                                return (
                                                                    <div
                                                                        key={faq.id}
                                                                        className="bg-white border border-stone-200/80 rounded-2xl shadow-2xs overflow-hidden"
                                                                    >
                                                                        <button
                                                                            onClick={() =>
                                                                                setOpenFaqs((prev) => ({
                                                                                    ...prev,
                                                                                    [faq.id]: !isOpen,
                                                                                }))
                                                                            }
                                                                            className="w-full text-left p-4 font-semibold text-stone-800 hover:text-vd-forest flex justify-between items-center gap-3 transition-colors cursor-pointer"
                                                                        >
                                                                            <span className="text-xs sm:text-sm leading-snug">
                                                                                {faq.question}
                                                                            </span>
                                                                            <span className="text-base font-bold text-stone-400">
                                                                                {isOpen ? '−' : '+'}
                                                                            </span>
                                                                        </button>
                                                                        <AnimatePresence initial={false}>
                                                                            {isOpen && (
                                                                                <motion.div
                                                                                    initial={{ height: 0 }}
                                                                                    animate={{ height: 'auto' }}
                                                                                    exit={{ height: 0 }}
                                                                                    transition={{ duration: 0.2 }}
                                                                                    className="overflow-hidden"
                                                                                >
                                                                                    <div className="px-4 pb-4 pt-1 text-stone-600 font-light border-t border-stone-100 text-xs sm:text-sm leading-relaxed">
                                                                                        {faq.answer}
                                                                                    </div>
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <div className="text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-4 font-semibold text-center text-xs">
                                                Failed to load detailed medical insights. Please ensure backend services
                                                are online.
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Disclaimer Footer */}
                                <div className="shrink-0 p-4 border-t border-stone-200 bg-stone-100/70 text-[10px] text-stone-500 font-light text-center leading-relaxed">
                                    ⚠️ <strong>Clinical Notice:</strong> Information in the Vaididea Health Library is for
                                    educational reference and does not substitute professional medical diagnosis or
                                    prescriptions. Always consult with certified medical practitioners.
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
