'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
    Star, MessageCircle, RefreshCw, Loader2, ShieldCheck, 
    MessageSquareText, ThumbsUp, Quote, AlertTriangle, Building2
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardCard, CardHeader } from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { diagnosticCenterApi } from '@/lib/api';

interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    is_verified?: boolean;
    created_at: string;
    patient?: { name?: string; full_name?: string };
    response?: string;
    responded_at?: string;
    helpful_count?: number;
}

interface ReviewMetrics {
    totalReviews: number;
    averageRating: number;
    verifiedReviews: number;
    distribution: Record<string, number>;
}

export default function DiagnosticCenterReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filters
    const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'anonymous'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
    
    // Response State
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [submittingResponse, setSubmittingResponse] = useState(false);

    const loadData = async (currentPage: number = 1) => {
        setIsLoading(true);
        setError(null);
        try {
            // Using a large limit initially since the API doesn't support advanced filter/sort natively,
            // we will sort and filter client-side for this MVP dashboard approach.
            // Ideally, we'd pass filters to getReviews.
            const res = await diagnosticCenterApi.getReviews(1, 1000); 
            if (res.success && res.data) {
                // Safely handle both standard list return or nested data return depending on generic api mapping
                let fetchedReviews: Review[] = [];
                const rawData = res.data as any;
                const fetchedMetrics = rawData?.metrics || res.metrics || null;
                
                if (Array.isArray(rawData)) {
                    fetchedReviews = rawData;
                } else if (rawData?.data) {
                    fetchedReviews = rawData.data;
                }
                
                setReviews(fetchedReviews);
                
                // If metrics didn't come through natively, calculate them client-side
                if (fetchedMetrics) {
                    setMetrics(fetchedMetrics);
                } else if (fetchedReviews.length > 0) {
                    const total = fetchedReviews.length;
                    let verified = 0;
                    let sum = 0;
                    const dist: Record<string, number> = { '1':0, '2':0, '3':0, '4':0, '5':0 };
                    
                    fetchedReviews.forEach(r => {
                        sum += r.rating;
                        if (r.is_verified) verified++;
                        if (r.rating >= 1 && r.rating <= 5) dist[r.rating.toString()]++;
                    });
                    
                    setMetrics({
                        totalReviews: total,
                        averageRating: Math.round((sum / total) * 10) / 10,
                        verifiedReviews: verified,
                        distribution: dist
                    });
                } else {
                    setMetrics(null);
                }
            } else {
                setError(res.error || 'Failed to load reviews');
            }
        } catch {
            setError('Connection error while loading reviews.');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        void loadData();
    }, []);

    const handleRespond = async (reviewId: string) => {
        if (!responseText.trim()) return;
        setSubmittingResponse(true);
        try {
            const res = await diagnosticCenterApi.respondToReview(reviewId, responseText);
            if (res.success) {
                setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, response: responseText, responded_at: new Date().toISOString() } : r));
                setRespondingTo(null);
                setResponseText('');
            }
        } catch {
            // Error handling ignored for brevity in UI
        }
        setSubmittingResponse(false);
    };

    // Client-side filtering & sorting
    const filteredReviews = useMemo(() => {
        let result = [...reviews];
        
        if (activeTab === 'verified') result = result.filter(r => r.is_verified);
        if (activeTab === 'anonymous') result = result.filter(r => r.is_anonymous);
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => 
                (r.comment && r.comment.toLowerCase().includes(q)) || 
                (r.title && r.title.toLowerCase().includes(q)) ||
                (r.patient?.name && r.patient.name.toLowerCase().includes(q))
            );
        }
        
        result.sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortOrder === 'highest') return b.rating - a.rating;
            if (sortOrder === 'lowest') return a.rating - b.rating;
            return 0;
        });
        
        return result;
    }, [reviews, activeTab, searchQuery, sortOrder]);

    // Client-side pagination
    const itemsPerPage = 10;
    const paginatedReviews = useMemo(() => {
        const startIndex = (page - 1) * itemsPerPage;
        return filteredReviews.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReviews, page]);

    useEffect(() => {
        setTotalPages(Math.max(1, Math.ceil(filteredReviews.length / itemsPerPage)));
        setPage(1); // Reset page on filter change
    }, [filteredReviews.length]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertTriangle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => void loadData()} variant="outline">Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            <PageHeader
                title="Reviews & Reputation"
                subtitle="Monitor patient feedback, ratings, and your diagnostic center's reputation."
                actions={
                    <Button variant="outline" leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />} onClick={() => void loadData()}>
                        Refresh
                    </Button>
                }
            />

            {/* KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DashboardCard className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</p>
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-9 w-16 rounded block"></span> : (metrics?.averageRating || 0).toFixed(1)}
                            </p>
                            <span className="text-sm font-medium text-slate-500 mb-1">/ 5</span>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reviews</p>
                            <MessageCircle className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-9 w-12 rounded block"></span> : (metrics?.totalReviews || 0)}
                            </p>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified Reviews</p>
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-9 w-12 rounded block"></span> : (metrics?.verifiedReviews || 0)}
                            </p>
                            {!isLoading && metrics && metrics.totalReviews > 0 && (
                                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mb-1">
                                    {Math.round((metrics.verifiedReviews / metrics.totalReviews) * 100)}%
                                </span>
                            )}
                        </div>
                    </div>
                </DashboardCard>
                
                <DashboardCard>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Response Rate</p>
                            <MessageSquareText className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {isLoading ? <span className="animate-pulse bg-slate-200 dark:bg-slate-700 h-9 w-16 rounded block"></span> : `${metrics && metrics.totalReviews > 0 ? Math.round((reviews.filter(r => !!r.response).length / metrics.totalReviews) * 100) : 0}%`}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* RATING DISTRIBUTION */}
                <div className="lg:col-span-1">
                    <DashboardCard className="h-full">
                        <CardHeader title="Rating Distribution" icon={Star} iconColor="text-amber-500" />
                        <div className="space-y-3 mt-4">
                            {isLoading ? (
                                [5,4,3,2,1].map(i => <div key={i} className="h-6 bg-slate-100 animate-pulse rounded"></div>)
                            ) : metrics && metrics.totalReviews > 0 ? (
                                [5, 4, 3, 2, 1].map(stars => {
                                    const count = metrics.distribution[stars.toString()] || 0;
                                    const pct = Math.round((count / metrics.totalReviews) * 100);
                                    return (
                                        <div key={stars} className="flex items-center gap-3 text-sm">
                                            <div className="flex items-center w-8 shrink-0">
                                                <span className="font-medium mr-1">{stars}</span>
                                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                            </div>
                                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="w-12 text-right text-slate-500">{pct}%</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <Star className="h-8 w-8 mb-2 opacity-20" />
                                    No ratings yet
                                </div>
                            )}
                        </div>
                        
                        {!isLoading && metrics && metrics.totalReviews > 0 && (
                            <div className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/20">
                                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Reputation Insights</h4>
                                <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside">
                                    <li>Your average rating is <strong>{metrics.averageRating}</strong> across {metrics.totalReviews} reviews.</li>
                                    {metrics.distribution['5'] > 0 && (
                                        <li>5-star reviews represent <strong>{Math.round((metrics.distribution['5'] / metrics.totalReviews) * 100)}%</strong> of your feedback.</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </DashboardCard>
                </div>

                {/* REVIEW LIST */}
                <div className="lg:col-span-2">
                    <DashboardCard className="h-full">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                                <button onClick={() => setActiveTab('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}>All</button>
                                <button onClick={() => setActiveTab('verified')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'verified' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}>Verified</button>
                                <button onClick={() => setActiveTab('anonymous')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'anonymous' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}>Anonymous</button>
                            </div>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Input 
                                    placeholder="Search..." 
                                    className="max-w-[200px]" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <select 
                                    className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="highest">Highest Rating</option>
                                    <option value="lowest">Lowest Rating</option>
                                </select>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-xl"></div>)}
                            </div>
                        ) : paginatedReviews.length > 0 ? (
                            <div className="space-y-4">
                                {paginatedReviews.map((review) => (
                                    <div key={review.id} className="p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex">
                                                        {[1,2,3,4,5].map(star => (
                                                            <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                    {review.is_verified && (
                                                        <span className="flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                            <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                    {review.is_anonymous ? 'Anonymous Patient' : (review.patient?.name || review.patient?.full_name || 'Patient')}
                                                    <span className="text-slate-400 font-normal text-xs">• {new Date(review.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {(review.title || review.comment) && (
                                            <div className="mb-4 text-sm text-slate-700 dark:text-slate-300">
                                                {review.title && <h5 className="font-semibold mb-1 text-slate-900 dark:text-white">{review.title}</h5>}
                                                {review.comment && <p className="italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800"><Quote className="inline h-3 w-3 text-slate-300 mr-1 -mt-1" />{review.comment}</p>}
                                            </div>
                                        )}

                                        {review.response ? (
                                            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border-l-4 border-purple-500 text-sm">
                                                <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1 flex items-center gap-2">
                                                    <Building2 className="h-3 w-3" /> Center Response
                                                    {review.responded_at && <span className="text-xs font-normal text-purple-600/70">{new Date(review.responded_at).toLocaleDateString()}</span>}
                                                </p>
                                                <p className="text-purple-800 dark:text-purple-200">{review.response}</p>
                                            </div>
                                        ) : respondingTo === review.id ? (
                                            <div className="mt-4 space-y-2">
                                                <Input 
                                                    placeholder="Write your response..." 
                                                    value={responseText}
                                                    onChange={e => setResponseText(e.target.value)}
                                                    className="bg-slate-50 dark:bg-slate-800/50"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseText(''); }}>Cancel</Button>
                                                    <Button size="sm" onClick={() => void handleRespond(review.id)} disabled={submittingResponse || !responseText.trim()}>
                                                        {submittingResponse ? 'Submitting...' : 'Submit Response'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => setRespondingTo(review.id)} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                                    Reply to review
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {totalPages > 1 && (
                                    <div className="mt-6 flex justify-center">
                                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No reviews found</h3>
                                <p className="text-sm text-center max-w-sm">
                                    {searchQuery || activeTab !== 'all' 
                                        ? "No reviews match your current filters. Try adjusting your search."
                                        : "Reviews from verified patient interactions will appear here once completed."}
                                </p>
                            </div>
                        )}
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
}
