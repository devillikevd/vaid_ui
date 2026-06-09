'use client';

import { useState, useMemo } from 'react';
import { Star, MessageSquare, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    created_at: string;
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
        gradient: 'from-pink-600 to-pink-800',
        textLight: 'text-pink-100',
        text: 'text-pink-600',
        bg: 'bg-pink-100',
        border: 'border-pink-200',
        ring: 'focus:ring-pink-500',
        btnBg: 'bg-pink-600 hover:bg-pink-700',
        spinner: 'border-pink-600'
    },
    emerald: {
        gradient: 'from-emerald-600 to-emerald-800',
        textLight: 'text-emerald-100',
        text: 'text-emerald-600',
        bg: 'bg-emerald-100',
        border: 'border-emerald-200',
        ring: 'focus:ring-emerald-500',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700',
        spinner: 'border-emerald-600'
    },
    blue: {
        gradient: 'from-blue-600 to-blue-800',
        textLight: 'text-blue-100',
        text: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-200',
        ring: 'focus:ring-blue-500',
        btnBg: 'bg-blue-600 hover:bg-blue-700',
        spinner: 'border-blue-600'
    },
    teal: {
        gradient: 'from-teal-600 to-teal-800',
        textLight: 'text-teal-100',
        text: 'text-teal-600',
        bg: 'bg-teal-100',
        border: 'border-teal-200',
        ring: 'focus:ring-teal-500',
        btnBg: 'bg-teal-600 hover:bg-teal-700',
        spinner: 'border-teal-600'
    },
    orange: {
        gradient: 'from-orange-600 to-orange-800',
        textLight: 'text-orange-100',
        text: 'text-orange-600',
        bg: 'bg-orange-100',
        border: 'border-orange-200',
        ring: 'focus:ring-orange-500',
        btnBg: 'bg-orange-600 hover:bg-orange-700',
        spinner: 'border-orange-600'
    },
    purple: {
        gradient: 'from-purple-600 to-purple-800',
        textLight: 'text-purple-100',
        text: 'text-purple-600',
        bg: 'bg-purple-100',
        border: 'border-purple-200',
        ring: 'focus:ring-purple-500',
        btnBg: 'bg-purple-600 hover:bg-purple-700',
        spinner: 'border-purple-600'
    }
};

export default function ReviewManager({ reviews, loadingReviews, error, fetchReviews, themeColor }: ReviewManagerProps) {
    const [filter, setFilter] = useState<'all' | 'verified' | 'anonymous'>('all');
    const [searchQuery, setSearchQuery] = useState('');

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

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    }, [reviews]);
    
    const style = themeStyles[themeColor];
    
    return (
        <div className="space-y-6">
            <div className={`rounded-2xl p-6 text-white bg-gradient-to-r ${style.gradient}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" /> 
                            Reviews & Ratings
                        </h1>
                        <p className={`mt-1 ${style.textLight}`}>Manage patient feedback and track your service quality.</p>
                    </div>
                    <div className={`flex items-center gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20`}>
                        <div className="text-center px-4 border-r border-white/20">
                            <p className="text-3xl font-bold">{averageRating}</p>
                            <p className={`text-xs ${style.textLight}`}>Average Rating</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-3xl font-bold">{reviews.length}</p>
                            <p className={`text-xs ${style.textLight}`}>Total Reviews</p>
                        </div>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className={`h-5 w-5 ${style.text}`} />
                        Patient Feedback
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search reviews..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 ${style.ring} transition-shadow`}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full sm:w-auto">
                            {(['all', 'verified', 'anonymous'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all flex-1 sm:flex-none ${
                                        filter === f 
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingReviews ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${style.spinner}`}></div>
                            <p className="text-gray-500 mt-4 text-sm">Loading feedback...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button 
                                onClick={() => fetchReviews()}
                                className={`px-4 py-2 ${style.btnBg} text-white rounded-lg transition-colors text-sm font-medium`}
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredReviews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className={`h-16 w-16 ${style.bg} rounded-full flex items-center justify-center mb-4`}>
                                <MessageSquare className={`h-8 w-8 ${style.text}`} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No reviews found</h3>
                            <p className="text-gray-500 max-w-sm mt-2 text-sm">
                                {searchQuery || filter !== 'all' 
                                    ? "Try adjusting your search or filters to see more reviews."
                                    : "You don't have any reviews yet. Check back later when patients start rating your services."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReviews.map((review) => (
                                <div key={review.id} className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex gap-4">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                {review.is_anonymous ? (
                                                    <span className="text-gray-500 font-medium">A</span>
                                                ) : (
                                                    <span className={`font-medium ${style.text}`}>
                                                        {review.patient?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {review.is_anonymous ? 'Anonymous Patient' : review.patient?.full_name || 'Verified Patient'}
                                                    </h4>
                                                    {!review.is_anonymous && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                                                            Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(review.created_at).toLocaleDateString('en-IN', {
                                                        year: 'numeric', month: 'long', day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                    key={i} 
                                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'}`} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {review.comment && (
                                        <div className="mt-4 pl-14">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                &quot;{review.comment}&quot;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
