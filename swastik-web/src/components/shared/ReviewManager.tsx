'use client';

import { useState, useMemo } from 'react';
import { Star, MessageSquare, Search, FileText, X, Clock, User, CheckCircle2, Quote, UserRoundX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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

export default function ReviewManager({ reviews, loadingReviews, error, fetchReviews, themeColor }: ReviewManagerProps) {
    const [filter, setFilter] = useState<'all' | 'verified' | 'anonymous'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [consultationDetails, setConsultationDetails] = useState<any>(null);
    const [loadingConsultation, setLoadingConsultation] = useState(false);

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

    const filteredReviews = useMemo(() => {
        return reviews.filter(review => {
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
    }, [reviews, filter, searchQuery]);

    const { averageRating, ratingCounts } = useMemo(() => {
        if (reviews.length === 0) return { averageRating: '0.0', ratingCounts: [0,0,0,0,0] };
        let sum = 0;
        const counts = [0,0,0,0,0]; // 1, 2, 3, 4, 5 stars
        
        reviews.forEach(r => {
            sum += r.rating;
            if (r.rating >= 1 && r.rating <= 5) {
                counts[r.rating - 1]++;
            }
        });
        
        return { 
            averageRating: (sum / reviews.length).toFixed(1),
            ratingCounts: counts
        };
    }, [reviews]);
    
    const style = themeStyles[themeColor];
    
    return (
        <div className="space-y-6">
            {/* Premium Glassmorphism Header */}
            <div className={`relative rounded-3xl overflow-hidden text-white bg-gradient-to-br ${style.gradient} shadow-lg shadow-${themeColor}-900/20 border border-${themeColor}-500/20`}>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
                
                <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 z-10">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 text-xs font-medium tracking-wide uppercase text-white/90 shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            Feedback Dashboard
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 drop-shadow-sm">
                            Reviews & Ratings
                        </h1>
                        <p className={`text-base ${style.textLight} max-w-md`}>
                            Manage patient feedback, track your service quality, and see what people are saying.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-6 bg-black/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl border border-white/10 shadow-inner">
                        <div className="text-center">
                            <p className="text-4xl font-bold tracking-tight drop-shadow-md">{averageRating}</p>
                            <p className="flex justify-center mt-1 mb-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.round(Number(averageRating)) ? 'fill-yellow-400 text-yellow-400' : 'fill-white/20 text-white/20'}`} 
                                    />
                                ))}
                            </p>
                            <p className={`text-xs ${style.textLight} font-medium`}>Average Rating</p>
                        </div>
                        <div className="w-px h-16 bg-white/20"></div>
                        <div className="text-center px-2">
                            <p className="text-4xl font-bold tracking-tight drop-shadow-md">{reviews.length}</p>
                            <p className={`text-xs ${style.textLight} font-medium mt-6`}>Total Reviews</p>
                        </div>
                    </div>
                </div>
                
                {/* Rating Distribution Bar (only show if reviews exist) */}
                {reviews.length > 0 && (
                    <div className="px-6 sm:px-8 pb-6 relative z-10">
                        <div className="h-1.5 w-full bg-black/20 rounded-full flex overflow-hidden">
                            {[5,4,3,2,1].map(rating => {
                                const count = ratingCounts[rating - 1];
                                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                if (percentage === 0) return null;
                                
                                const colorClass = 
                                    rating === 5 ? 'bg-emerald-400' : 
                                    rating === 4 ? 'bg-green-400' : 
                                    rating === 3 ? 'bg-yellow-400' : 
                                    rating === 2 ? 'bg-orange-400' : 'bg-red-400';
                                    
                                return (
                                    <div 
                                        key={rating} 
                                        className={`h-full ${colorClass} transition-all duration-1000 ease-out`} 
                                        style={{ width: `${percentage}%` }}
                                        title={`${rating} Star: ${count} reviews (${percentage.toFixed(0)}%)`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 pb-4 pt-5">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className={`h-5 w-5 ${style.text}`} />
                        Patient Feedback
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search feedback..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 ${style.ring} transition-shadow`}
                            />
                        </div>
                        <div className="flex p-1 bg-gray-100/80 dark:bg-gray-800 rounded-xl w-full sm:w-auto">
                            {(['all', 'verified', 'anonymous'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex-1 sm:flex-none ${
                                        filter === f 
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingReviews ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-l-2 border-r-transparent ${style.spinner}`}></div>
                            <p className="text-gray-500 mt-4 text-sm font-medium">Gathering feedback...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                <X className="h-8 w-8 text-red-500" />
                            </div>
                            <p className="text-red-500 font-medium mb-4">{error}</p>
                            <button 
                                onClick={() => fetchReviews()}
                                className={`px-5 py-2.5 ${style.btnBg} text-white rounded-xl transition-all shadow-sm text-sm font-semibold`}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredReviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            <div className={`h-20 w-20 ${style.bgSubtle} dark:bg-gray-800 rounded-full flex items-center justify-center mb-5 ring-8 ring-white dark:ring-gray-900 shadow-sm`}>
                                <MessageSquare className={`h-10 w-10 ${style.text}`} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No feedback found</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm leading-relaxed">
                                {searchQuery || filter !== 'all' 
                                    ? "We couldn't find any reviews matching your search criteria. Try adjusting your filters."
                                    : "You don't have any reviews yet. Great service leads to great feedback, so keep up the good work!"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredReviews.map((review) => (
                                <div 
                                    key={review.id} 
                                    onClick={() => handleReviewClick(review)}
                                    className={`p-6 bg-white dark:bg-gray-900 transition-all ${
                                        review.consultation_id 
                                            ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/50 hover:shadow-inner' 
                                            : ''
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                                        <div className="flex gap-4">
                                            {/* Avatar */}
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-900 shadow-sm ${review.is_anonymous ? 'bg-gray-100 dark:bg-gray-800' : style.bg}`}>
                                                {review.is_anonymous ? (
                                                    <UserRoundX className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                                ) : (
                                                    <span className={`font-bold text-lg ${style.text}`}>
                                                        {review.patient?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                        {review.is_anonymous ? 'Anonymous Patient' : review.patient?.full_name || 'Verified Patient'}
                                                    </h4>
                                                    {!review.is_anonymous && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50">
                                                            <CheckCircle2 className="h-3 w-3" /> Verified
                                                        </span>
                                                    )}
                                                    {review.consultation_id && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.badgeBg} ${style.badgeText} flex items-center gap-1 border border-${themeColor}-200/50 dark:border-${themeColor}-800/50`}>
                                                            <FileText className="h-3 w-3" /> Consultation
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {new Date(review.created_at).toLocaleDateString('en-IN', {
                                                        year: 'numeric', month: 'long', day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Stars */}
                                        <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-600'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Comment */}
                                    {review.comment && (
                                        <div className="mt-5 pl-16 pr-4 relative">
                                            <Quote className="absolute top-0 left-10 w-5 h-5 text-gray-200 dark:text-gray-700 -translate-x-2 -translate-y-2 transform rotate-180" />
                                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed italic relative z-10 font-serif">
                                                {review.comment}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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
                            className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800"
                        >
                            {/* Modal Header */}
                            <div className={`p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r ${style.bgSubtle} dark:bg-gray-800/30`}>
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className={`p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800`}>
                                        <FileText className={`h-4 w-4 ${style.text}`} />
                                    </div>
                                    Consultation Context
                                </h3>
                                <button 
                                    onClick={() => setSelectedReview(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto">
                                {loadingConsultation ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-r-transparent ${style.spinner}`}></div>
                                        <p className="text-gray-500 mt-4 text-sm font-medium">Fetching details...</p>
                                    </div>
                                ) : consultationDetails ? (
                                    <div className="space-y-6">
                                        {/* Patient Info Row */}
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-700 shadow-sm ${selectedReview.is_anonymous ? 'bg-gray-200 dark:bg-gray-700' : style.bg}`}>
                                                {selectedReview.is_anonymous ? (
                                                    <UserRoundX className="h-5 w-5 text-gray-500" />
                                                ) : (
                                                    <span className={`font-bold text-lg ${style.text}`}>
                                                        {selectedReview.patient?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Patient</h4>
                                                <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                                                    {selectedReview.is_anonymous ? 'Anonymous' : selectedReview.patient?.full_name || 'Unknown Patient'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1.5">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-xs font-semibold uppercase tracking-wider">Date & Time</span>
                                                </div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {new Date(consultationDetails.created_at || consultationDetails.start_time).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1.5">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
                                                </div>
                                                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                                    {consultationDetails.status || 'Completed'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Diagnosis */}
                                        {consultationDetails.diagnosis && (
                                            <div className={`p-5 rounded-2xl border ${style.bgSubtle} border-${themeColor}-100 dark:bg-${themeColor}-900/10 dark:border-${themeColor}-900/30`}>
                                                <h4 className={`text-xs font-bold ${style.text} uppercase tracking-wider mb-2`}>Diagnosis / Impression</h4>
                                                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-medium">
                                                    {consultationDetails.diagnosis}
                                                </p>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {consultationDetails.notes && (
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Consultation Notes</h4>
                                                <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                    {consultationDetails.notes}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!consultationDetails.diagnosis && !consultationDetails.notes && (
                                            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-sm font-medium text-gray-500">No diagnosis or notes were recorded for this consultation.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                                            <X className="h-8 w-8 text-red-500" />
                                        </div>
                                        <p className="text-red-500 font-medium">Could not load consultation details.</p>
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
