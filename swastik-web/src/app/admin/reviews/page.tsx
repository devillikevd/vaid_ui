'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Star, ShieldCheck, Search, Filter, Eye, EyeOff, CheckCircle2,
    XCircle, Trash2, Flag, MessageCircle, AlertTriangle, ChevronLeft,
    ChevronRight, RefreshCw, Clock, UserRoundX
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reviewsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface AdminReview {
    id: string;
    reviewable_type: string;
    reviewable_id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    is_verified: boolean;
    is_visible: boolean;
    is_approved: boolean;
    created_at: string;
    response?: string;
    admin_response?: string;
    patient?: {
        name?: string;
        full_name?: string;
        profile_image_url?: string;
    };
}

export default function AdminReviewsModerationPage() {
    const toast = useToast();
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        totalReviews: number;
        averageRating: number;
        visibleReviews: number;
        pendingModeration: number;
        reportedReviews: number;
        verifiedReviews: number;
    } | null>(null);

    // Filters
    const [targetType, setTargetType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load stats
            const statsRes = await reviewsApi.getAdminReviewStats();
            if (statsRes.success) {
                setStats(statsRes.data as any);
            }

            // Build filter params
            const filters: Record<string, any> = {};
            if (targetType !== 'all') filters.targetType = targetType;
            if (searchQuery.trim()) filters.search = searchQuery.trim();

            if (statusFilter === 'visible') filters.isVisible = true;
            else if (statusFilter === 'hidden') filters.isVisible = false;
            else if (statusFilter === 'unapproved') filters.isApproved = false;
            else if (statusFilter === 'reported') filters.isReported = true;

            const reviewsRes = await reviewsApi.getAdminReviews(filters, page, 15);
            if (reviewsRes.success) {
                setReviews((reviewsRes.data as AdminReview[]) || []);
                setTotalPages(reviewsRes.pagination?.totalPages || 1);
                setTotalCount(reviewsRes.pagination?.total || 0);
            } else {
                toast.error('Failed to load reviews');
            }
        } catch {
            toast.error('Network error loading reviews');
        } finally {
            setLoading(false);
        }
    }, [targetType, statusFilter, searchQuery, page, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleVisibility = async (id: string, currentVisible: boolean) => {
        try {
            const res = await reviewsApi.updateAdminReviewVisibility(id, !currentVisible);
            if (res.success) {
                toast.success(!currentVisible ? 'Review published' : 'Review hidden');
                loadData();
            } else {
                toast.error(res.error || 'Failed to update visibility');
            }
        } catch {
            toast.error('Failed to update review');
        }
    };

    const handleToggleApproval = async (id: string, currentApproved: boolean) => {
        try {
            const res = await reviewsApi.updateAdminReviewApproval(id, !currentApproved);
            if (res.success) {
                toast.success(!currentApproved ? 'Review approved' : 'Review rejected');
                loadData();
            } else {
                toast.error(res.error || 'Failed to update approval');
            }
        } catch {
            toast.error('Failed to update approval');
        }
    };

    const handleDeleteReview = async (id: string) => {
        if (!confirm('Are you sure you want to remove this review from public display?')) return;
        try {
            const res = await reviewsApi.deleteAdminReview(id);
            if (res.success) {
                toast.success('Review removed');
                loadData();
            } else {
                toast.error(res.error || 'Failed to remove review');
            }
        } catch {
            toast.error('Failed to remove review');
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                        Public Reviews Moderation
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor verified patient reviews across all healthcare entities, inspect reported flags, and manage visibility.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* KPI Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Reviews</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalReviews}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Avg Rating</p>
                        <p className="text-2xl font-black text-amber-500 flex items-center gap-1">
                            {stats.averageRating} <Star className="w-5 h-5 fill-amber-500" />
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Verified</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.verifiedReviews}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Visible</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.visibleReviews}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Flagged / Reported</p>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.reportedReviews}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Pending Approval</p>
                        <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.pendingModeration}</p>
                    </div>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                    <select
                        value={targetType}
                        onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Entity Types</option>
                        <option value="doctor">Doctors</option>
                        <option value="clinic">Clinics</option>
                        <option value="hospital">Hospitals</option>
                        <option value="pharmacy">Pharmacies</option>
                        <option value="diagnostic_center">Diagnostic Centers</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="visible">Visible Only</option>
                        <option value="hidden">Hidden Only</option>
                        <option value="unapproved">Pending Moderation</option>
                        <option value="reported">Reported Reviews</option>
                    </select>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search review content..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500 text-sm font-bold">Loading public reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <Star className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reviews found</h3>
                        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    reviews.map(review => {
                        const isReported = Boolean(review.admin_response && review.admin_response.includes('"isReported":true'));
                        let reportObj: any = null;
                        if (isReported) {
                            try { reportObj = JSON.parse(review.admin_response || '{}'); } catch {}
                        }

                        const authorName = review.patient?.name || review.patient?.full_name || 'Patient';

                        return (
                            <div
                                key={review.id}
                                className={`bg-white dark:bg-gray-900 p-6 rounded-3xl border transition-all space-y-4 ${
                                    isReported 
                                        ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' 
                                        : 'border-gray-100 dark:border-gray-800 shadow-sm'
                                }`}
                            >
                                {/* Top Banner if Reported */}
                                {isReported && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200/50 dark:border-red-900/30">
                                        <span className="flex items-center gap-2">
                                            <Flag className="w-4 h-4 text-red-500" />
                                            Flagged by User: {reportObj?.reason || 'Policy Violation'}
                                            {reportObj?.details && <span className="font-normal">({reportObj.details})</span>}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(reportObj?.reportedAt || '').toLocaleDateString()}</span>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm text-gray-600 dark:text-gray-300">
                                            {review.is_anonymous ? <UserRoundX className="w-4 h-4" /> : authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                    {review.is_anonymous ? 'Anonymous' : authorName}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                    {review.reviewable_type.replace('_', ' ')}
                                                </span>
                                                {review.is_verified && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                                                        <ShieldCheck className="w-3 h-3" /> Verified
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    review.is_visible 
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                                }`}>
                                                    {review.is_visible ? 'Visible' : 'Hidden'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" /> {new Date(review.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="flex items-center gap-1 text-amber-500 font-black text-sm bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-200/40">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                                        ))}
                                        <span className="ml-1">{review.rating}.0</span>
                                    </div>
                                </div>

                                {/* Comment */}
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium pl-2">
                                    {review.comment || <span className="italic text-gray-400">No written comment provided.</span>}
                                </p>

                                {/* Provider Response if present */}
                                {review.response && (
                                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs space-y-1">
                                        <p className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                            <MessageCircle className="w-3.5 h-3.5 text-indigo-500" /> Provider Response:
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400 pl-5">{review.response}</p>
                                    </div>
                                )}

                                {/* Moderation Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap gap-2">
                                    <span className="text-xs font-mono text-gray-400">
                                        ID: {review.id.slice(0, 8)}... | Target: {review.reviewable_id.slice(0, 8)}...
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleVisibility(review.id, review.is_visible)}
                                            className="text-xs font-bold rounded-xl"
                                        >
                                            {review.is_visible ? <><EyeOff className="w-3.5 h-3.5 mr-1 text-gray-500" /> Hide</> : <><Eye className="w-3.5 h-3.5 mr-1 text-blue-500" /> Publish</>}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleApproval(review.id, review.is_approved)}
                                            className="text-xs font-bold rounded-xl"
                                        >
                                            {review.is_approved ? <><XCircle className="w-3.5 h-3.5 mr-1 text-red-500" /> Unapprove</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Approve</>}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteReview(review.id)}
                                            className="text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-xs font-bold text-gray-500">
                        Page {page} of {totalPages} ({totalCount} reviews)
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
