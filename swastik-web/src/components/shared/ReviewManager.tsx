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
    metrics?: {
        totalReviews: number;
        averageRating: number;
        verifiedReviews: number;
        distribution: Record<number, number>;
    } | null;
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
    compactHeader?: boolean;
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
                <div key={i}>
                    <Star 
                        className={`${starClass} ${
                            i < rating 
                                ? 'fill-yellow-400 text-yellow-500' 
                                : 'fill-gray-200 text-gray-300 dark:fill-gray-700/50 dark:text-gray-600'
                        }`} 
                    />
                </div>
            ))}
        </div>
    );
};

const ReviewCard = ({ 
    review, 
    compactCards = true, 
    isFacility,
    entityName,
    onReport,
    onRespond,
    onContextClick,
    allowRespond
}: { 
    review: Review, 
    compactCards?: boolean,
    isFacility?: boolean,
    entityName?: string,
    onReport: () => void,
    onRespond: () => void,
    onContextClick: () => void,
    allowRespond: boolean
}) => {
    const [expanded, setExpanded] = useState(false);
    
    const isAnonymized = review.is_anonymous || entityName === 'Doctor';
    const patientName = isAnonymized ? 'Anonymous Patient' : (review.patient?.name || review.patient?.full_name || 'Verified Patient');
    const hasResponse = Boolean(review.response || review.doctor_response);
    const responseContent = review.response || review.doctor_response?.content;
    const responseDate = review.responded_at || review.doctor_response?.created_at;

    const needsTruncation = review.comment && review.comment.length > 180;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all space-y-3 min-w-0"
        >
            {/* Top Row: Patient Info + Rating */}
            <div className="flex items-start justify-between gap-3 min-w-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-200/60 dark:border-emerald-800/40">
                        {isAnonymized ? <UserRoundX className="w-4 h-4" /> : patientName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                {isAnonymized ? 'Anonymous Patient' : patientName}
                            </h4>
                            {review.is_verified && (
                                <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40">
                                    <ShieldCheck className="h-3 w-3" /> Verified
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString('en-IN', {
                                year: 'numeric', month: 'short', day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">{review.rating.toFixed(1)}</span>
                    <button 
                        onClick={onReport}
                        className="text-gray-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-1"
                        title="Report review"
                    >
                        <Flag className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Review Comment */}
            {review.comment && (
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className={`${!expanded && needsTruncation ? 'line-clamp-3' : ''}`}>
                        "{review.comment}"
                    </div>
                    {needsTruncation && (
                        <button 
                            onClick={() => setExpanded(!expanded)}
                            className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-1 hover:underline inline-block"
                        >
                            {expanded ? 'Show Less' : 'Read More'}
                        </button>
                    )}
                </div>
            )}

            {/* Provider Response */}
            {hasResponse && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border-l-2 border-emerald-500 dark:border-emerald-600 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
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
                    <p className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed font-medium">
                        {responseContent}
                    </p>
                </div>
            )}

            {/* Bottom Actions / Clinical Context */}
            {(review.consultation_id || allowRespond) && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <div>
                        {review.consultation_id && (
                            <button
                                onClick={onContextClick}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                                <FileText className="w-3.5 h-3.5" /> View Clinical Context
                            </button>
                        )}
                    </div>

                    {allowRespond && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRespond}
                            className="text-xs font-bold rounded-xl h-7 px-3 border-gray-200 dark:border-gray-700"
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
    metrics,
    loadingReviews, 
    error, 
    fetchReviews, 
    themeColor = 'emerald',
    onRespond,
    isFacility = false,
    tabs,
    activeTab,
    onTabChange,
    hideHero = false,
    compactHeader = true,
    compactCards = true,
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
                
            const isAnonymized = review.is_anonymous || entityName === 'Doctor';
            const patientName = isAnonymized ? 'Anonymous Patient' : (review.patient?.name || review.patient?.full_name || '');
            const doctorName = review.doctor?.name || '';
            const matchesSearch = 
                !searchQuery || 
                review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (!isAnonymized && patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
    }, [reviews, filter, searchQuery, sortBy, entityName]);

    const paginatedReviews = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedReviews.slice(start, start + itemsPerPage);
    }, [filteredAndSortedReviews, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedReviews.length / itemsPerPage);

    const { averageRating, ratingCounts, verifiedCount, fiveStarCount, responseRate, totalReviewsCount } = useMemo(() => {
        if (metrics) {
            let rCount = 0;
            reviews.forEach(r => {
                if (r.response || r.doctor_response) rCount++;
            });
            const totalCount = metrics.totalReviews || reviews.length;
            return {
                averageRating: Number(metrics.averageRating || 0).toFixed(1),
                ratingCounts: [metrics.distribution[1] || 0, metrics.distribution[2] || 0, metrics.distribution[3] || 0, metrics.distribution[4] || 0, metrics.distribution[5] || 0],
                verifiedCount: metrics.verifiedReviews || 0,
                fiveStarCount: metrics.distribution[5] || 0,
                responseRate: totalCount > 0 ? ((rCount / totalCount) * 100).toFixed(0) : '0',
                totalReviewsCount: totalCount
            };
        }

        if (reviews.length === 0) return { averageRating: '0.0', ratingCounts: [0,0,0,0,0], verifiedCount: 0, fiveStarCount: 0, responseRate: '0', totalReviewsCount: 0 };
        
        let sum = 0;
        let vCount = 0;
        let rCount = 0;
        const counts = [0,0,0,0,0]; // 1, 2, 3, 4, 5 stars
        
        reviews.forEach(r => {
            sum += r.rating;
            if (r.rating >= 1 && r.rating <= 5) {
                counts[r.rating - 1]++;
            }
            if (r.is_verified) vCount++;
            if (r.response || r.doctor_response) rCount++;
        });
        
        return { 
            averageRating: (sum / reviews.length).toFixed(1),
            ratingCounts: counts,
            verifiedCount: vCount,
            fiveStarCount: counts[4],
            responseRate: ((rCount / reviews.length) * 100).toFixed(0),
            totalReviewsCount: reviews.length
        };
    }, [reviews, metrics]);
    
    const style = themeStyles[themeColor] || themeStyles.emerald;
    
    return (
        <div className="space-y-5 pb-24 min-w-0">
            {/* Optional Section Tabs (e.g. Clinic Reviews vs Doctor Reviews) */}
            {tabs && tabs.length > 0 && onTabChange && (
                <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`pb-3 text-sm font-bold transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-gray-900 dark:text-white border-b-2 border-emerald-600'
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

            {/* Compact Header Summary Card */}
            {!hideHero && !error && (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm min-w-0 space-y-4">
                    {/* Top Row: Title Badge + Overall Rating */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                {entityName} Reviews
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                                Patient feedback & consultation experience
                            </p>
                        </div>

                        {/* Top-Right Rating Block */}
                        <div className="sm:text-right shrink-0">
                            <div className="flex items-center sm:justify-end gap-1.5 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                <span>Rating {averageRating}</span>
                                <Star className="h-6 w-6 fill-yellow-400 text-yellow-500 inline-block shrink-0" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                {totalReviewsCount} Total Reviews
                            </p>
                        </div>
                    </div>

                    {/* Bottom Row: 4 Soft Green Metric Cards */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-xs min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80 block mb-1 truncate">
                                Verified Patients
                            </span>
                            <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 truncate">
                                {verifiedCount}
                            </p>
                        </div>

                        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-xs min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80 block mb-1 truncate">
                                5★ Ratings
                            </span>
                            <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 truncate">
                                {fiveStarCount}
                            </p>
                        </div>

                        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-xs min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80 block mb-1 truncate">
                                Response Rate
                            </span>
                            <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 truncate">
                                {responseRate}%
                            </p>
                        </div>

                        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-xs min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80 block mb-1 truncate">
                                5★ Distribution
                            </span>
                            <p className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100 truncate">
                                {totalReviewsCount > 0 ? Math.round((fiveStarCount / totalReviewsCount) * 100) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm w-full min-w-0">
                {/* Tabs Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
                    <button 
                        onClick={() => { setFilter('all'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filter === 'all' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        All ({totalReviewsCount})
                    </button>
                    <button 
                        onClick={() => { setFilter('verified'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filter === 'verified' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        Verified ({verifiedCount})
                    </button>
                    <button 
                        onClick={() => { setFilter('anonymous'); setCurrentPage(1); }}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filter === 'anonymous' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        Anonymous ({totalReviewsCount - verifiedCount})
                    </button>
                </div>

                {/* Search & Sort Row */}
                <div className="flex items-center gap-2 flex-1 sm:max-w-md min-w-0">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full min-w-0 h-9 pl-9 pr-3 rounded-xl text-xs bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white placeholder:text-gray-400 truncate"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-9 px-2.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0 cursor-pointer"
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
                                entityName={entityName}
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
