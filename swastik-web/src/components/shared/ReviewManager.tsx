'use client';

import { useState, useMemo } from 'react';
import { 
    Star, MessageSquare, Search, FileText, X, Clock, 
    User, CheckCircle2, Quote, UserRoundX, Filter, 
    MoreVertical, ThumbsUp, ShieldCheck, MessageCircle,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { consultationsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    created_at: string;
    consultation_id?: string;
    patient?: {
        full_name: string;
        profile_image_url?: string;
    };
    doctor_response?: {
        content: string;
        created_at: string;
    };
    helpful_count?: number;
}

interface ReviewManagerProps {
    reviews: Review[];
    loadingReviews: boolean;
    error: string | null;
    fetchReviews: (page?: number) => Promise<void>;
    themeColor: 'pink' | 'emerald' | 'blue' | 'teal' | 'orange' | 'purple';
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

export default function ReviewManager({ reviews, loadingReviews, error, fetchReviews, themeColor }: ReviewManagerProps) {
    const [filter, setFilter] = useState<'all' | 'verified' | 'anonymous'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [consultationDetails, setConsultationDetails] = useState<any>(null);
    const [loadingConsultation, setLoadingConsultation] = useState(false);
    
    // For local pagination if needed
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
        } catch (error) {
            console.error('Failed to fetch consultation details:', error);
        } finally {
            setLoadingConsultation(false);
        }
    };

    const filteredAndSortedReviews = useMemo(() => {
        const result = reviews.filter(review => {
            const matchesFilter = 
                filter === 'all' || 
                (filter === 'verified' && !review.is_anonymous) || 
                (filter === 'anonymous' && review.is_anonymous);
                
            const matchesSearch = 
                !searchQuery || 
                review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (!review.is_anonymous && review.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
                
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

    // Apply pagination
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
            if (!r.is_anonymous) vCount++;
            if (r.doctor_response) rCount++;
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
            {/* Premium Hero Header */}
            <div className={`relative rounded-[2rem] overflow-hidden text-white bg-gradient-to-br ${style.gradient} shadow-2xl shadow-${themeColor}-900/20 border border-${themeColor}-500/20`}>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
                
                <div className="relative p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-10 z-10">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 text-xs font-bold tracking-widest uppercase text-white shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            Feedback Dashboard
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md">
                            Reviews & Ratings
                        </h1>
                        <p className={`text-lg font-medium text-white/80 max-w-lg leading-relaxed`}>
                            Manage patient feedback, track your service quality, and engage with your community.
                        </p>
                    </div>
                    
                    <div className="flex items-center bg-black/20 rounded-[2rem] p-8 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <div className="text-center">
                            <div className="flex items-end justify-center gap-1 mb-2">
                                <motion.span 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-6xl font-extrabold tracking-tighter drop-shadow-lg leading-none"
                                >
                                    {averageRating}
                                </motion.span>
                                <span className="text-xl font-bold text-white/60 mb-1">/5</span>
                            </div>
                            <div className="flex justify-center gap-1.5 mt-3 mb-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-5 w-5 ${i < Math.round(Number(averageRating)) ? 'fill-yellow-400 text-yellow-400 drop-shadow-md' : 'fill-white/20 text-white/20'}`} 
                                    />
                                ))}
                            </div>
                            <p className="text-sm font-bold text-white/70 uppercase tracking-widest mt-2">Overall Rating</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-black/20 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{reviews.length}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">Total Reviews</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-black/20 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{verifiedCount}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">Verified Reviews</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-black/20 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl text-yellow-600 dark:text-yellow-500 group-hover:scale-110 transition-transform">
                            <Star className="h-6 w-6 fill-yellow-500/20" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{fiveStarCount}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">5★ Ratings</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-black/20 hover:-translate-y-1 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3.5 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <MessageCircle className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{responseRate}%</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">Response Rate</p>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Tabs + Search + Filters */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-gray-900 p-3 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
                <div className="relative flex p-1 bg-gray-50 dark:bg-gray-800 rounded-2xl w-full lg:w-auto shrink-0 border border-gray-200/50 dark:border-gray-700/50">
                    <motion.div
                        className="absolute top-1 bottom-1 w-[calc(33.333%-2.6px)] bg-white dark:bg-gray-900 shadow-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl"
                        initial={false}
                        animate={{
                            x: filter === 'all' ? 4 : filter === 'verified' ? 'calc(100% + 4px)' : 'calc(200% + 4px)'
                        }}
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                    {(['all', 'verified', 'anonymous'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setCurrentPage(1); }}
                            className={`relative z-10 w-full sm:w-28 py-3 text-sm font-bold capitalize transition-colors duration-200 ${
                                filter === f 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full h-[52px] pl-11 pr-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
                        />
                    </div>
                    <div className="relative shrink-0 w-full sm:w-56">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                            className="w-full h-[52px] pl-11 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="highest">Highest Rating</option>
                            <option value="lowest">Lowest Rating</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
                {loadingReviews ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
                                <div className="space-y-3 flex-1">
                                    <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/6"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-5/6"></div>
                            </div>
                        </div>
                    ))
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-red-100 dark:border-red-900/30">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50 dark:ring-red-900/10">
                            <X className="h-10 w-10 text-red-500" />
                        </div>
                        <p className="text-red-600 dark:text-red-400 font-bold mb-6 text-lg">{error}</p>
                        <button 
                            onClick={() => fetchReviews()}
                            className={`px-8 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-xl transition-all shadow-sm font-bold`}
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredAndSortedReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-gray-900/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className={`h-24 w-24 ${style.bgSubtle} dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 ring-8 ring-white dark:ring-gray-900 shadow-sm`}>
                            <MessageSquare className={`h-12 w-12 ${style.text}`} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">No feedback found</h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">
                            {searchQuery || filter !== 'all' 
                                ? "We couldn't find any reviews matching your search criteria. Try adjusting your filters."
                                : "You don't have any reviews yet. Great service leads to great feedback, so keep up the good work!"}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {paginatedReviews.map((review) => (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                key={review.id}
                                onClick={() => handleReviewClick(review)}
                                className={`bg-white dark:bg-gray-900 rounded-[2rem] p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden ${review.consultation_id ? 'cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800' : ''}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
                                    <div className="flex gap-5 items-center">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 shadow-sm ${review.is_anonymous ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'}`}>
                                            {review.is_anonymous ? (
                                                <UserRoundX className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                            ) : (
                                                <span className={`font-extrabold text-xl text-indigo-700 dark:text-indigo-400`}>
                                                    {review.patient?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                <h4 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                                                    {review.is_anonymous ? 'Anonymous Patient' : review.patient?.full_name || 'Verified Patient'}
                                                </h4>
                                                {!review.is_anonymous && (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50 shadow-sm">
                                                        <ShieldCheck className="h-3 w-3" /> Verified
                                                    </span>
                                                )}
                                                {review.consultation_id && (
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center gap-1 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm`}>
                                                        <FileText className="h-3 w-3" /> Consultation
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                {new Date(review.created_at).toLocaleDateString('en-IN', {
                                                    year: 'numeric', month: 'long', day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <StarRating rating={review.rating} size="lg" />
                                        <button className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {review.comment && (
                                    <div className="relative mb-6 group-hover:pl-2 transition-all duration-300">
                                        <Quote className="absolute -top-1 -left-1 w-8 h-8 text-gray-100 dark:text-gray-800/50 transform rotate-180 -z-10" />
                                        <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium relative z-10 pl-6 border-l-[3px] border-gray-100 dark:border-gray-800 py-1">
                                            {review.comment}
                                        </p>
                                    </div>
                                )}

                                {/* Tags & Helpful Count */}
                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-5">
                                    <div className="flex flex-wrap gap-2">
                                        {review.rating >= 4 && (
                                            <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Highly Recommended</span>
                                        )}
                                        {review.title && (
                                            <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{review.title}</span>
                                        )}
                                    </div>
                                    {review.helpful_count !== undefined && (
                                        <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({review.helpful_count})
                                        </button>
                                    )}
                                </div>

                                {/* Doctor Response Section */}
                                {review.doctor_response && (
                                    <div className="mt-6 p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px]">
                                                Dr
                                            </div>
                                            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Your Response</span>
                                            <span className="text-xs font-medium text-emerald-600/60 dark:text-emerald-400/60 ml-auto">
                                                {new Date(review.doctor_response.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-emerald-800 dark:text-emerald-200/80 pl-8 font-medium leading-relaxed">
                                            {review.doctor_response.content}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Premium Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-3 shadow-sm mt-8">
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1} 
                        className="h-11 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-5"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`flex items-center justify-center w-11 h-11 rounded-2xl font-extrabold text-sm transition-all ${
                                    currentPage === i + 1 
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages} 
                        className="h-11 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-5"
                    >
                        Next <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </div>
            )}

            {/* Consultation Details Modal */}
            <AnimatePresence>
                {selectedReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                            onClick={() => setSelectedReview(null)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800"
                        >
                            <div className={`p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30`}>
                                <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-3 text-lg">
                                    <div className={`p-2.5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700`}>
                                        <FileText className={`h-5 w-5 ${style.text}`} />
                                    </div>
                                    Consultation Context
                                </h3>
                                <button 
                                    onClick={() => setSelectedReview(null)}
                                    className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto">
                                {loadingConsultation ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-r-transparent ${style.spinner}`}></div>
                                        <p className="text-gray-500 mt-5 font-bold">Fetching clinical details...</p>
                                    </div>
                                ) : consultationDetails ? (
                                    <div className="space-y-6">
                                        {/* Content inside modal */}
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[1.5rem] border border-gray-200 dark:border-gray-700/50">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700 shadow-sm ${selectedReview.is_anonymous ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'}`}>
                                                {selectedReview.is_anonymous ? (
                                                    <UserRoundX className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                                ) : (
                                                    <span className={`font-extrabold text-xl text-indigo-700 dark:text-indigo-400`}>
                                                        {selectedReview.patient?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Patient</h4>
                                                <p className="font-extrabold text-gray-900 dark:text-white text-xl leading-tight">
                                                    {selectedReview.is_anonymous ? 'Anonymous' : selectedReview.patient?.full_name || 'Unknown Patient'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[1.5rem] border border-gray-200 dark:border-gray-700/50">
                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-xs font-extrabold uppercase tracking-widest">Date & Time</span>
                                                </div>
                                                <p className="font-extrabold text-gray-900 dark:text-white">
                                                    {new Date(consultationDetails.created_at || consultationDetails.start_time).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[1.5rem] border border-gray-200 dark:border-gray-700/50">
                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="text-xs font-extrabold uppercase tracking-widest">Status</span>
                                                </div>
                                                <p className="font-extrabold text-gray-900 dark:text-white capitalize">
                                                    {consultationDetails.status || 'Completed'}
                                                </p>
                                            </div>
                                        </div>

                                        {consultationDetails.diagnosis && (
                                            <div className={`p-6 rounded-[1.5rem] border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700`}>
                                                <h4 className={`text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3`}>Diagnosis / Impression</h4>
                                                <p className="text-gray-900 dark:text-white text-[15px] leading-relaxed font-bold">
                                                    {consultationDetails.diagnosis}
                                                </p>
                                            </div>
                                        )}

                                        {consultationDetails.notes && (
                                            <div>
                                                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">Consultation Notes</h4>
                                                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[1.5rem] border border-gray-200 dark:border-gray-700/50 text-[15px] font-medium text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                    {consultationDetails.notes}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!consultationDetails.diagnosis && !consultationDetails.notes && (
                                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-[1.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-[15px] font-bold text-gray-500">No diagnosis or notes were recorded.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-8 ring-red-50/50 dark:ring-red-900/10">
                                            <X className="h-10 w-10 text-red-500" />
                                        </div>
                                        <p className="text-red-600 dark:text-red-400 font-bold text-lg">Could not load consultation details.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
