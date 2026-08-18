'use client';

import { useState, useMemo } from 'react';
import { 
    Star, Search, FileText, X, Clock, 
    CheckCircle2, Quote, UserRoundX,
    ThumbsUp, ShieldCheck, MessageCircle,
    ChevronLeft, ChevronRight, Flag, Send, Building2, Stethoscope, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { consultationsApi, reviewsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    is_verified?: boolean;
    created_at: string;
    consultation_id?: string;
    patient?: {
        name?: string;
        full_name?: string;
        profile_image_url?: string;
    };
    doctor?: {
        id?: string;
        name: string;
        specialization?: string;
        profile_image_url?: string;
    };
    doctor_response?: {
        content: string;
        created_at: string;
    };
    response?: string;
    responded_at?: string;
    helpful_count?: number;
}

interface ReviewManagerProps {
    reviews: Review[];
    loadingReviews: boolean;
    error: string | null;
    fetchReviews: (page?: number) => Promise<void>;
    themeColor: 'pink' | 'emerald' | 'blue' | 'teal' | 'orange' | 'purple';
    onRespond?: (reviewId: string, responseText: string) => Promise<boolean>;
    isFacility?: boolean;
    tabs?: { id: string; label: string; count?: number }[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    hideHero?: boolean;
    compactCards?: boolean;
    entityName?: 'Clinic' | 'Hospital' | 'Pharmacy' | 'Diagnostic Center' | 'Doctor';
}

const themeStyles = {
    pink: {
        gradient: 'from-pink-600 via-pink-700 to-pink-900',
        textLight: 'text-pink-100',
        text: 'text-pink-600',
        bg: 'bg-pink-100',
        bgSubtle: 'bg-pink-50',
        border: 'border-pink-200',
        ring: 'focus:ring-pink-500',
        btnBg: 'bg-pink-600 hover:bg-pink-700',
        spinner: 'border-pink-600',
        badgeBg: 'bg-pink-500/10',
        badgeText: 'text-pink-700 dark:text-pink-400'
    },
    emerald: {
        gradient: 'from-emerald-500 via-emerald-600 to-emerald-900',
        textLight: 'text-emerald-100',
        text: 'text-emerald-600',
        bg: 'bg-emerald-100',
        bgSubtle: 'bg-emerald-50',
        border: 'border-emerald-200',
        ring: 'focus:ring-emerald-500',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700',
        spinner: 'border-emerald-600',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-700 dark:text-emerald-400'
    },
    blue: {
        gradient: 'from-blue-600 via-blue-700 to-blue-900',
        textLight: 'text-blue-100',
        text: 'text-blue-600',
        bg: 'bg-blue-100',
        bgSubtle: 'bg-blue-50',
        border: 'border-blue-200',
        ring: 'focus:ring-blue-500',
        btnBg: 'bg-blue-600 hover:bg-blue-700',
        spinner: 'border-blue-600',
        badgeBg: 'bg-blue-500/10',
        badgeText: 'text-blue-700 dark:text-blue-400'
    },
    teal: {
        gradient: 'from-teal-500 via-teal-600 to-teal-900',
        textLight: 'text-teal-100',
        text: 'text-teal-600',
        bg: 'bg-teal-100',
        bgSubtle: 'bg-teal-50',
        border: 'border-teal-200',
        ring: 'focus:ring-teal-500',
        btnBg: 'bg-teal-600 hover:bg-teal-700',
        spinner: 'border-teal-600',
        badgeBg: 'bg-teal-500/10',
        badgeText: 'text-teal-700 dark:text-teal-400'
    },
    orange: {
        gradient: 'from-orange-500 via-orange-600 to-orange-900',
        textLight: 'text-orange-100',
        text: 'text-orange-600',
        bg: 'bg-orange-100',
        bgSubtle: 'bg-orange-50',
        border: 'border-orange-200',
        ring: 'focus:ring-orange-500',
        btnBg: 'bg-orange-600 hover:bg-orange-700',
        spinner: 'border-orange-600',
        badgeBg: 'bg-orange-500/10',
        badgeText: 'text-orange-700 dark:text-orange-400'
    },
    purple: {
        gradient: 'from-purple-600 via-purple-700 to-purple-900',
        textLight: 'text-purple-100',
        text: 'text-purple-600',
        bg: 'bg-purple-100',
        bgSubtle: 'bg-purple-50',
        border: 'border-purple-200',
        ring: 'focus:ring-purple-500',
        btnBg: 'bg-purple-600 hover:bg-purple-700',
        spinner: 'border-purple-600',
        badgeBg: 'bg-purple-500/10',
        badgeText: 'text-purple-700 dark:text-purple-400'
    }
};

const StarRating = ({ rating, size = "md" }: { rating: number, size?: "sm" | "md" | "lg" }) => {
    const starClass = size === "sm" ? "h-3.5 w-3.5" : size === "md" ? "h-4 w-4" : "h-5 w-5";
    return (
        <div className="flex gap-1 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-yellow-900/10 dark:to-amber-900/10 p-1.5 px-2 rounded-lg border border-yellow-100/50 dark:border-yellow-800/30">
            {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                    key={i}
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <Star 
                        className={`${starClass} ${
                            i < rating 
                                ? 'fill-yellow-400 text-yellow-500 drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]' 
                                : 'fill-gray-200 text-gray-300 dark:fill-gray-700/50 dark:text-gray-600'
                        }`} 
                    />
                </motion.div>
            ))}
        </div>
    );
};


const ReviewCard = ({ 
    review, 
    compactCards, 
    isFacility,
    onReport,
    onRespond,
    onContextClick,
    allowRespond
}: { 
    review: Review, 
    compactCards?: boolean,
    isFacility?: boolean,
    onReport: () => void,
    onRespond: () => void,
    onContextClick: () => void,
    allowRespond: boolean
}) => {
    const [expanded, setExpanded] = useState(false);
    
    const patientName = review.patient?.name || review.patient?.full_name || 'Verified Patient';
    const hasResponse = Boolean(review.response || review.doctor_response);
    const responseContent = review.response || review.doctor_response?.content;
    const responseDate = review.responded_at || review.doctor_response?.created_at;

    const needsTruncation = review.comment && review.comment.length > 150;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-white dark:bg-[#111c2e] rounded-3xl ${compactCards ? 'p-4' : 'p-6 sm:p-8'} border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all h-fit`}
        >
            {/* Top Row: Avatar + Name + Rating */}
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center font-extrabold text-sm border border-gray-200 dark:border-gray-700 ${
                        review.is_anonymous 
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' 
                            : 'bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-700 dark:from-indigo-900/30 dark:to-purple-900/30 dark:text-indigo-300'
                    }`}>
                        {review.is_anonymous ? <UserRoundX className="w-4 h-4" /> : patientName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-gray-900 dark:text-white text-sm truncate max-w-full">
                                {review.is_anonymous ? 'Anonymous Patient' : patientName}
                            </h4>
                            {!review.is_anonymous && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50">
                                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString('en-IN', {
                                year: 'numeric', month: 'short', day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2 py-1 border border-gray-100 dark:border-gray-800">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 ml-1">{review.rating.toFixed(1)}</span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                    <button 
                        onClick={onReport}
                        className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center p-0.5"
                        title="Report review"
                    >
                        <Flag className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Review Body */}
            {review.comment && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words">
                    <div className={`${!expanded && needsTruncation ? 'line-clamp-3' : ''}`}>
                        {review.comment}
                    </div>
                    {needsTruncation && (
                        <button 
                            onClick={() => setExpanded(!expanded)}
                            className="text-indigo-600 dark:text-indigo-400 text-[11px] font-bold mt-1 hover:underline inline-block"
                        >
                            {expanded ? 'Show Less' : 'Read More'}
                        </button>
                    )}
                </div>
            )}

            {/* Provider Response Display */}
            {hasResponse && (
                <div className="mt-3 ml-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border-l-2 border-emerald-400 dark:border-emerald-600">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                        <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-emerald-600" />
                            {isFacility ? 'Organization Response' : 'Doctor Response'}
                        </span>
                        {responseDate && (
                            <span className="text-gray-400 font-normal text-[10px]">
                                {new Date(responseDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <p className="text-[13px] text-emerald-900 dark:text-emerald-200/90 leading-relaxed font-medium">
                        {responseContent}
                    </p>
                </div>
            )}

            {/* Bottom Actions */}
            {(review.consultation_id || allowRespond) && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex gap-2 items-center">
                        {review.consultation_id && (
                            <button
                                onClick={onContextClick}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                <FileText className="w-3 h-3" /> View Clinical Context
                            </button>
                        )}
                    </div>

                    {allowRespond && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRespond}
                            className="text-[11px] font-bold rounded-lg h-7 px-3"
                        >
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {hasResponse ? 'Edit Response' : 'Respond'}
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default function ReviewManager({ 
    reviews, 
    loadingReviews, 
    error, 
    fetchReviews, 
    themeColor,
    onRespond,
    isFacility = false,
    tabs,
    activeTab,
    onTabChange,
    hideHero = false,
    compactCards = false,
    entityName = 'Doctor'
}: ReviewManagerProps) {
    const [filter, setFilter] = useState<'all' | 'verified' | 'anonymous'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
    
    // Modal states
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [consultationDetails, setConsultationDetails] = useState<any>(null);
    const [loadingConsultation, setLoadingConsultation] = useState(false);

    // Response state
    const [respondingReview, setRespondingReview] = useState<Review | null>(null);
    const [responseText, setResponseText] = useState('');
    const [submittingResponse, setSubmittingResponse] = useState(false);

    // Report state
    const [reportingReview, setReportingReview] = useState<Review | null>(null);
    const [reportReason, setReportReason] = useState('Spam');
    const [reportDetails, setReportDetails] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleReviewClick = async (review: Review) => {
        if (!review.consultation_id) return;
        
        setSelectedReview(review);
        setLoadingConsultation(true);
        setConsultationDetails(null);
        
        try {
            const res = await consultationsApi.getById(review.consultation_id);
            if (res.success) {
                setConsultationDetails(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch consultation details:', err);
        } finally {
            setLoadingConsultation(false);
        }
    };

    const handleOpenResponse = (review: Review) => {
        setRespondingReview(review);
        setResponseText(review.response || review.doctor_response?.content || '');
    };

    const handleSubmitResponse = async () => {
        if (!respondingReview || !responseText.trim() || !onRespond) return;
        setSubmittingResponse(true);
        try {
            const success = await onRespond(respondingReview.id, responseText.trim());
            if (success) {
                setRespondingReview(null);
                setResponseText('');
                await fetchReviews(currentPage);
            }
        } finally {
            setSubmittingResponse(false);
        }
    };

    const handleReportSubmit = async () => {
        if (!reportingReview) return;
        setSubmittingReport(true);
        try {
            const res = await reviewsApi.reportReview(reportingReview.id, reportReason, reportDetails);
            if (res.success) {
                setReportSuccess(true);
                setTimeout(() => {
                    setReportingReview(null);
                    setReportSuccess(false);
                    setReportReason('Spam');
                    setReportDetails('');
                }, 1200);
            }
        } catch (err) {
            console.error('Failed to report review:', err);
        } finally {
            setSubmittingReport(false);
        }
    };

    const filteredAndSortedReviews = useMemo(() => {
        const result = reviews.filter(review => {
            const matchesFilter = 
                filter === 'all' || 
                (filter === 'verified' && (review.is_verified || !review.is_anonymous)) || 
                (filter === 'anonymous' && review.is_anonymous);
                
            const patientName = review.patient?.name || review.patient?.full_name || '';
            const doctorName = review.doctor?.name || '';
            const matchesSearch = 
                !searchQuery || 
                review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (!review.is_anonymous && patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                doctorName.toLowerCase().includes(searchQuery.toLowerCase());
                
            return matchesFilter && matchesSearch;
        });

        if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'highest') {
            result.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'lowest') {
            result.sort((a, b) => a.rating - b.rating);
        }

        return result;
    }, [reviews, filter, searchQuery, sortBy]);

    const paginatedReviews = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedReviews.slice(start, start + itemsPerPage);
    }, [filteredAndSortedReviews, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedReviews.length / itemsPerPage);

    const { averageRating, ratingCounts, verifiedCount, fiveStarCount, responseRate } = useMemo(() => {
        if (reviews.length === 0) return { averageRating: '0.0', ratingCounts: [0,0,0,0,0], verifiedCount: 0, fiveStarCount: 0, responseRate: '0' };
        
        let sum = 0;
        let vCount = 0;
        let rCount = 0;
        const counts = [0,0,0,0,0]; // 1, 2, 3, 4, 5 stars
        
        reviews.forEach(r => {
            sum += r.rating;
            if (r.rating >= 1 && r.rating <= 5) {
                counts[r.rating - 1]++;
            }
            if (r.is_verified || !r.is_anonymous) vCount++;
            if (r.response || r.doctor_response) rCount++;
        });
        
        return { 
            averageRating: (sum / reviews.length).toFixed(1),
            ratingCounts: counts,
            verifiedCount: vCount,
            fiveStarCount: counts[4],
            responseRate: ((rCount / reviews.length) * 100).toFixed(0)
        };
    }, [reviews]);
    
    const style = themeStyles[themeColor];
    
    return (
        <div className="space-y-8 pb-24">
            {/* Optional Section Tabs (e.g. Clinic Reviews vs Doctor Reviews) */}
            {tabs && tabs.length > 0 && onTabChange && (
                <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`pb-3 text-sm font-bold transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-gray-900 dark:text-white border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Premium Hero Header */}
            {!hideHero && !error && reviews.length > 0 && (
                <div className={`relative rounded-[2rem] overflow-hidden text-white bg-gradient-to-br ${style.gradient} shadow-2xl shadow-${themeColor}-900/20 border border-${themeColor}-500/20`}>
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
                    
                    <div className="relative p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-10 z-10">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 text-xs font-bold tracking-widest uppercase text-white shadow-sm">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                {entityName} Reviews
                            </div>
                            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
                                {entityName} Rating & Experience
                            </h1>
                            <p className="text-sm sm:text-base text-white/80 max-w-xl font-medium leading-relaxed">
                                {entityName === 'Doctor'
                                    ? 'Monitor patient feedback and ratings for doctors. Note: Doctor ratings do not alter facility aggregates.'
                                    : `Manage verified patient feedback, track clinical quality, and respond directly to your ${entityName.toLowerCase()} community.`}
                            </p>
                        </div>

                        {/* Overall Rating Display */}
                        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl shrink-0">
                            <div className="text-center">
                                <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white drop-shadow-md">
                                    {averageRating}
                                </div>
                                <div className="flex gap-1 justify-center my-2.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`h-4 w-4 ${
                                                i < Math.round(Number(averageRating))
                                                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' 
                                                    : 'fill-white/20 text-white/20'
                                            }`} 
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                                    {reviews.length} Total Reviews
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Rating Distribution & Key Metrics Banner */}
                    <div className="bg-black/20 backdrop-blur-xl border-t border-white/10 p-6 sm:px-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Verified Patients</p>
                            <p className="text-2xl font-black text-white">{verifiedCount}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">5-Star Ratings</p>
                            <p className="text-2xl font-black text-white">{fiveStarCount}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Response Rate</p>
                            <p className="text-2xl font-black text-white">{responseRate}%</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">5★ Distribution</p>
                            <p className="text-2xl font-black text-white">
                                {reviews.length > 0 ? Math.round((fiveStarCount / reviews.length) * 100) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar & Search */}
            <div className="flex flex-col gap-3 bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm w-full">
                {/* Tabs Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full">
                    <button 
                        onClick={() => { setFilter('all'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            filter === 'all' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        All ({reviews.length})
                    </button>
                    <button 
                        onClick={() => { setFilter('verified'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            filter === 'verified' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        Verified ({verifiedCount})
                    </button>
                    <button 
                        onClick={() => { setFilter('anonymous'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            filter === 'anonymous' 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        Anonymous ({reviews.length - verifiedCount})
                    </button>
                </div>

                {/* Search & Sort Row */}
                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full min-w-0 pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-indigo-500 shrink-0 w-28 sm:w-32"
                    >
                        <option value="newest">Newest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {loadingReviews ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">Loading reviews...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-red-100 dark:border-red-900/30">
                        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">Unable to load reviews</h3>
                        <p className="text-sm text-gray-500 mb-4">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => fetchReviews(currentPage)}>Retry</Button>
                    </div>
                ) : paginatedReviews.length === 0 ? (
                    <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No reviews yet</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            {searchQuery ? 'No reviews match your search criteria.' : 'Reviews from verified patient interactions will appear here.'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {paginatedReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                compactCards={compactCards}
                                isFacility={isFacility}
                                onReport={() => setReportingReview(review)}
                                onRespond={() => handleOpenResponse(review)}
                                onContextClick={() => handleReviewClick(review)}
                                allowRespond={!!onRespond}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-xs font-bold text-gray-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Provider Response Dialog */}
            <AnimatePresence>
                {respondingReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                                    Respond to Review
                                </h3>
                                <button onClick={() => setRespondingReview(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                                    <p className="font-extrabold text-gray-900 dark:text-white mb-1">
                                        Patient Review ({respondingReview.rating}★)
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
                                        {respondingReview.comment || 'No written comment provided.'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Your Public Response
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        placeholder="Thank the patient, acknowledge their feedback, or explain actions taken..."
                                        className="w-full p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        Your response will be visible publicly below this review.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/40">
                                <Button variant="outline" onClick={() => setRespondingReview(null)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleSubmitResponse} 
                                    disabled={submittingResponse || !responseText.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {submittingResponse ? 'Posting...' : 'Post Response'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Report Review Dialog */}
            <AnimatePresence>
                {reportingReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <Flag className="w-5 h-5 text-red-500" />
                                    Report Review
                                </h3>
                                <button onClick={() => setReportingReview(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {reportSuccess ? (
                                    <div className="p-6 text-center space-y-2">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base">Report Submitted</h4>
                                        <p className="text-xs text-gray-500">Our moderation team will review this review promptly.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                                Reason for Reporting
                                            </label>
                                            <select
                                                value={reportReason}
                                                onChange={(e) => setReportReason(e.target.value)}
                                                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="Spam">Spam or Advertising</option>
                                                <option value="Abuse">Abuse or Harassment</option>
                                                <option value="Offensive">Offensive or Inappropriate Language</option>
                                                <option value="Fake">Fake or Misleading Review</option>
                                                <option value="Privacy">Privacy Violation (exposes private medical info)</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                                Additional Details (Optional)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={reportDetails}
                                                onChange={(e) => setReportDetails(e.target.value)}
                                                placeholder="Explain why this review violates platform policies..."
                                                className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {!reportSuccess && (
                                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/40">
                                    <Button variant="outline" onClick={() => setReportingReview(null)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleReportSubmit} 
                                        disabled={submittingReport}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {submittingReport ? 'Submitting...' : 'Submit Report'}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
