'use client';

import React, { useEffect, useState, useCallback, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    MessageSquare,
    Plus,
    Search,
    Filter,
    ChevronDown,
    ThumbsUp,
    Bookmark,
    Share2,
    Eye,
    ShieldCheck,
    CheckCircle2,
    Clock,
    User,
    Stethoscope,
    AlertCircle,
    X,
    Loader2,
    Send,
    Sparkles,
    Check,
    Info,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';
import { communityApi, CommunityQuestion, CommunityAnswer } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

const TOPIC_CATEGORIES = [
    'All Topics',
    'General Health',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Gynecology',
    'Mental Health',
    'ENT',
    'Dental',
    'Nutrition',
    'Diabetes',
];

const FILTER_TABS = [
    { id: 'All', label: 'All Discussions' },
    { id: 'Verified', label: 'Doctor Answered' },
    { id: 'Unanswered', label: 'Needs Answer' },
    { id: 'Answered', label: 'Answered' },
    { id: 'Saved', label: 'Bookmarked' },
];

const SORT_OPTIONS = [
    { id: 'recent', label: 'Most Recent' },
    { id: 'upvotes', label: 'Most Upvoted' },
    { id: 'answers', label: 'Most Discussed' },
    { id: 'oldest', label: 'Oldest First' },
];

export default function PatientCommunityPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { requireAuth, openAuthGate } = useAuthGate();

    // Data states
    const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedTopic, setSelectedTopic] = useState('All Topics');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [askModalOpen, setAskModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<CommunityQuestion | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Ask Form State
    const [askTitle, setAskTitle] = useState('');
    const [askContent, setAskContent] = useState('');
    const [askTopic, setAskTopic] = useState('General Health');
    const [askAnonymous, setAskAnonymous] = useState(false);
    const [submittingQuestion, setSubmittingQuestion] = useState(false);
    const [askError, setAskError] = useState<string | null>(null);

    // Reply Form State
    const [replyContent, setReplyContent] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);

    // Local Upvote / Bookmark optimistic updates
    const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
    const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});
    const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

    // Auto-open ask modal if ?action=ask in URL
    useEffect(() => {
        if (searchParams.get('action') === 'ask') {
            setAskModalOpen(true);
        }
        const qId = searchParams.get('q');
        if (qId) {
            handleOpenDetails(qId);
        }
    }, [searchParams]);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await communityApi.getQuestions({
                page,
                limit: 15,
                filter: activeFilter,
                topic: selectedTopic === 'All Topics' ? undefined : selectedTopic,
                search: searchQuery.trim() || undefined,
                sortBy,
            });

            if (res.success && res.data) {
                const data = res.data as any;
                const items = data.questions || (Array.isArray(data) ? data : []);
                setQuestions(items);
                setTotalCount(data.total ?? items.length);
                setTotalPages(data.totalPages ?? 1);

                // Populate local state caches
                const upvotesMap: Record<string, boolean> = {};
                const bookmarksMap: Record<string, boolean> = {};
                items.forEach((q: CommunityQuestion) => {
                    if (q.is_upvoted) upvotesMap[q.id] = true;
                    if (q.is_bookmarked) bookmarksMap[q.id] = true;
                });
                setUpvotedIds((prev) => ({ ...prev, ...upvotesMap }));
                setBookmarkedIds((prev) => ({ ...prev, ...bookmarksMap }));
            } else {
                setError(res.message || 'Unable to load community questions.');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching community discussions.');
        } finally {
            setLoading(false);
        }
    }, [page, activeFilter, selectedTopic, searchQuery, sortBy]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const handleOpenDetails = async (id: string) => {
        setDetailsLoading(true);
        try {
            const res = await communityApi.getQuestionDetails(id);
            if (res.success && res.data) {
                setSelectedQuestion(res.data);
            }
        } catch {
            // non-fatal
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleOpenAskModal = () => {
        requireAuth({
            actionType: 'community_ask',
            title: 'Sign In to Ask a Question',
            description: 'Sign in or create a patient account to ask a health question to verified doctors and community members.',
            returnUrl: '/patient/community?action=ask',
            onAuthenticated: () => setAskModalOpen(true),
        });
    };

    const handleUpvoteQuestion = async (e: React.MouseEvent, qId: string) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openAuthGate({
                actionType: 'community_ask',
                title: 'Sign In to Upvote',
                description: 'Please sign in to upvote helpful questions and answers in the community.',
                returnUrl: `/patient/community?q=${qId}`,
            });
            return;
        }

        const currentlyUpvoted = upvotedIds[qId] ?? false;
        const targetAction = currentlyUpvoted ? 'remove' : 'upvote';

        // Optimistic update
        setUpvotedIds((prev) => ({ ...prev, [qId]: !currentlyUpvoted }));
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId
                    ? { ...q, upvotes: currentlyUpvoted ? Math.max(0, q.upvotes - 1) : q.upvotes + 1 }
                    : q
            )
        );
        if (selectedQuestion?.id === qId) {
            setSelectedQuestion((prev) =>
                prev
                    ? {
                          ...prev,
                          upvotes: currentlyUpvoted ? Math.max(0, prev.upvotes - 1) : prev.upvotes + 1,
                          is_upvoted: !currentlyUpvoted,
                      }
                    : null
            );
        }

        try {
            await communityApi.upvoteQuestion(qId, targetAction);
        } catch {
            // Revert on error
            setUpvotedIds((prev) => ({ ...prev, [qId]: currentlyUpvoted }));
        }
    };

    const handleToggleBookmark = async (e: React.MouseEvent, qId: string) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            openAuthGate({
                actionType: 'community_ask',
                title: 'Sign In to Bookmark',
                description: 'Sign in to save this discussion for quick reference later.',
                returnUrl: `/patient/community?q=${qId}`,
            });
            return;
        }

        const currentlyBookmarked = bookmarkedIds[qId] ?? false;

        // Optimistic update
        setBookmarkedIds((prev) => ({ ...prev, [qId]: !currentlyBookmarked }));
        if (selectedQuestion?.id === qId) {
            setSelectedQuestion((prev) =>
                prev ? { ...prev, is_bookmarked: !currentlyBookmarked } : null
            );
        }

        try {
            const res = await communityApi.toggleBookmark(qId);
            if (res.success && res.data) {
                setBookmarkedIds((prev) => ({ ...prev, [qId]: (res.data as any).bookmarked }));
            }
        } catch {
            setBookmarkedIds((prev) => ({ ...prev, [qId]: currentlyBookmarked }));
        }
    };

    const handleUpvoteAnswer = async (answerId: string, currentUpvotes: number) => {
        if (!isAuthenticated) {
            openAuthGate({
                actionType: 'community_ask',
                title: 'Sign In to Upvote Answer',
                description: 'Please sign in to upvote verified answers from doctors.',
                returnUrl: selectedQuestion ? `/patient/community?q=${selectedQuestion.id}` : '/patient/community',
            });
            return;
        }

        try {
            await communityApi.upvoteAnswer(answerId, 'upvote');
            if (selectedQuestion) {
                setSelectedQuestion({
                    ...selectedQuestion,
                    answers: selectedQuestion.answers?.map((a) =>
                        a.id === answerId ? { ...a, upvotes: a.upvotes + 1 } : a
                    ),
                });
            }
        } catch {
            // ignore
        }
    };

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!askTitle.trim() || !askContent.trim()) {
            setAskError('Please fill in both the question title and description.');
            return;
        }

        setSubmittingQuestion(true);
        setAskError(null);

        try {
            const res = await communityApi.createQuestion({
                title: askTitle.trim(),
                content: askContent.trim(),
                topic: askTopic,
                category: askTopic,
                is_anonymous: askAnonymous,
            });

            if (res.success && res.data) {
                setAskModalOpen(false);
                setAskTitle('');
                setAskContent('');
                setAskAnonymous(false);
                fetchQuestions();
                setSelectedQuestion(res.data);
            } else {
                setAskError(res.message || 'Unable to post your question. Please try again.');
            }
        } catch (err: any) {
            setAskError(err.message || 'Network error submitting question.');
        } finally {
            setSubmittingQuestion(false);
        }
    };

    const handleAddReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuestion || !replyContent.trim()) return;

        if (!isAuthenticated) {
            openAuthGate({
                actionType: 'community_ask',
                title: 'Sign In to Reply',
                description: 'Sign in or create an account to post an answer or reply in the community discussion.',
                returnUrl: `/patient/community?q=${selectedQuestion.id}`,
            });
            return;
        }

        setSubmittingReply(true);
        setReplyError(null);

        try {
            const res = await communityApi.addAnswer(selectedQuestion.id, replyContent.trim());
            if (res.success && res.data) {
                setReplyContent('');
                // Refresh question details with new answer
                const updated = await communityApi.getQuestionDetails(selectedQuestion.id);
                if (updated.success && updated.data) {
                    setSelectedQuestion(updated.data);
                }
                fetchQuestions();
            } else {
                setReplyError(res.message || 'Failed to submit response.');
            }
        } catch (err: any) {
            setReplyError(err.message || 'Error submitting response.');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleShare = (e: React.MouseEvent, qId: string) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/patient/community?q=${qId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedShareId(qId);
        setTimeout(() => setCopiedShareId(null), 2000);
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const diff = Date.now() - new Date(dateStr).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            const hours = Math.floor(mins / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            if (days < 30) return `${days}d ago`;
            return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return 'Recently';
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Page Header & Main Actions */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white rounded-3xl p-6 sm:p-8 border border-emerald-100/80 shadow-xs relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-vd-forest border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Vaididea Health Forum</span>
                        </div>
                        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                            Community Health Q&A
                        </h1>
                        <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                            Ask health questions, learn from verified medical answers, and connect with trusted doctors and patients across India.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleOpenAskModal}
                            className="px-5 py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Ask a Question</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Row */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search questions by symptoms, medical conditions, medications..."
                            className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none placeholder:text-stone-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-stone-500 font-medium hidden sm:inline">Sort:</span>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setPage(1);
                                }}
                                className="appearance-none bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 pr-9 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-vd-forest focus:outline-none cursor-pointer"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Filter Status Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'Saved' && !isAuthenticated) {
                                        openAuthGate({
                                            actionType: 'community_bookmark',
                                            title: 'Sign In to View Saved Discussions',
                                            description: 'Sign in or register to access your bookmarked community questions and verified answers.',
                                            returnUrl: '/patient/community',
                                        });
                                        return;
                                    }
                                    setActiveFilter(tab.id);
                                    setPage(1);
                                }}
                                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-vd-forest text-white shadow-xs'
                                        : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Topic Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-100 pb-1 scrollbar-none">
                    {TOPIC_CATEGORIES.map((t) => {
                        const isSelected = selectedTopic === t;
                        return (
                            <button
                                key={t}
                                onClick={() => {
                                    setSelectedTopic(t);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                    isSelected
                                        ? 'bg-emerald-50 text-vd-forest border-emerald-300 font-bold'
                                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                                }`}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Questions Feed */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-40 bg-white rounded-3xl border border-stone-200 animate-pulse p-6 space-y-3"
                        >
                            <div className="h-4 bg-stone-200 rounded-md w-3/4" />
                            <div className="h-3 bg-stone-100 rounded-md w-full" />
                            <div className="h-3 bg-stone-100 rounded-md w-1/2" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <h3 className="font-heading font-bold text-base text-stone-900">{error}</h3>
                    <button
                        onClick={fetchQuestions}
                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                        Try Again
                    </button>
                </div>
            ) : questions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-vd-forest flex items-center justify-center mx-auto border border-emerald-100">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-heading font-bold text-lg text-stone-900">
                            No Discussions Found
                        </h3>
                        <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                            Be the first to ask a health question to our network of verified doctors and health specialists.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenAskModal}
                        className="px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Ask the First Question</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((q) => {
                        const isUpvoted = upvotedIds[q.id] ?? q.is_upvoted ?? false;
                        const isBookmarked = bookmarkedIds[q.id] ?? q.is_bookmarked ?? false;
                        const authorName = q.is_anonymous ? 'Anonymous Patient' : q.patient?.name || 'Vaididea Patient';
                        const answersCount = q.answers?.length ?? q.answer_count ?? 0;
                        const hasDoctorAnswer = q.has_verified_answer || q.answers?.some((a) => a.is_doctor_verified || a.responder_type === 'doctor');

                        return (
                            <div
                                key={q.id}
                                onClick={() => handleOpenDetails(q.id)}
                                className="bg-white rounded-3xl p-6 border border-stone-200/80 hover:border-emerald-300/80 hover:shadow-md transition-all duration-200 group cursor-pointer space-y-4"
                            >
                                {/* Card Header: Author, Topic, Date */}
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-vd-forest font-bold text-xs flex items-center justify-center shrink-0">
                                            {q.is_anonymous ? '👤' : (authorName[0] || 'P')}
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-900 leading-tight">
                                                {authorName}
                                            </p>
                                            <p className="text-[10px] text-stone-400 font-light mt-0.5">
                                                {formatRelativeTime(q.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {q.topic && (
                                            <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 font-semibold text-[10px]">
                                                {q.topic}
                                            </span>
                                        )}
                                        {hasDoctorAnswer && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100/70 text-emerald-800 font-bold text-[10px] border border-emerald-200/80">
                                                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                                <span>Doctor Answered</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Title & Content Excerpt */}
                                <div className="space-y-1.5">
                                    <h3 className="font-heading font-bold text-base text-stone-900 group-hover:text-vd-forest transition-colors">
                                        {q.title}
                                    </h3>
                                    <p className="text-xs text-stone-600 font-light line-clamp-2 leading-relaxed">
                                        {q.content}
                                    </p>
                                </div>

                                {/* Card Footer: Upvote, Answers Count, Views, Bookmark */}
                                <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500">
                                    <div className="flex items-center gap-3">
                                        {/* Upvote Button */}
                                        <button
                                            onClick={(e) => handleUpvoteQuestion(e, q.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                isUpvoted
                                                    ? 'bg-emerald-50 text-vd-forest border-emerald-300'
                                                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                                            }`}
                                        >
                                            <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-vd-forest' : ''}`} />
                                            <span>{q.upvotes}</span>
                                        </button>

                                        {/* Answers Count Badge */}
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-stone-600 font-semibold text-xs">
                                            <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                                            <span>{answersCount} {answersCount === 1 ? 'answer' : 'answers'}</span>
                                        </span>

                                        {/* Views */}
                                        {q.views > 0 && (
                                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-stone-400 font-light">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>{q.views}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleShare(e, q.id)}
                                            className="p-2 text-stone-400 hover:text-vd-forest hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
                                            title="Copy Link"
                                        >
                                            {copiedShareId === q.id ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Share2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>

                                        <button
                                            onClick={(e) => handleToggleBookmark(e, q.id)}
                                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                                                isBookmarked
                                                    ? 'text-vd-forest bg-emerald-50'
                                                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                                            }`}
                                            title="Bookmark"
                                        >
                                            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-vd-forest' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 disabled:opacity-40 cursor-pointer"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-stone-500 font-medium px-2">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 disabled:opacity-40 cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Medical Disclaimer Capsule */}
            <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200/80 flex items-start gap-3.5 text-xs text-stone-500 font-light">
                <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                    <strong className="font-semibold text-stone-700">Educational Forum Disclaimer:</strong> Information and medical answers shared in Community Q&A are intended strictly for educational awareness and discussion. They do not constitute formal medical diagnosis or prescription. Always consult an in-person or verified video doctor for clinical treatments.
                </p>
            </div>

            {/* ========================================================================= */}
            {/* MODAL: Ask a Question Flow */}
            {/* ========================================================================= */}
            {askModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setAskModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-[2rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
                            <div>
                                <h3 className="font-heading font-bold text-lg text-stone-900">
                                    Ask a Health Question
                                </h3>
                                <p className="text-xs text-stone-500 font-light mt-0.5">
                                    Get answers from verified doctors and the Vaididea community.
                                </p>
                            </div>
                            <button
                                onClick={() => setAskModalOpen(false)}
                                className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {askError && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{askError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-800 mb-1">
                                    Question Title / Summary *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={askTitle}
                                    onChange={(e) => setAskTitle(e.target.value)}
                                    placeholder="e.g. Constant throbbing headache on right side for 3 days"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-800 mb-1">
                                    Health Category / Specialty *
                                </label>
                                <select
                                    value={askTopic}
                                    onChange={(e) => setAskTopic(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none"
                                >
                                    {TOPIC_CATEGORIES.filter((t) => t !== 'All Topics').map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-800 mb-1">
                                    Detailed Symptoms & Description *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={askContent}
                                    onChange={(e) => setAskContent(e.target.value)}
                                    placeholder="Describe your symptoms in detail: onset, severity, what makes it better/worse, and any medications tried..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none resize-none"
                                />
                            </div>

                            {/* Anonymous Toggle */}
                            <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={askAnonymous}
                                    onChange={(e) => setAskAnonymous(e.target.checked)}
                                    className="w-4 h-4 rounded text-vd-forest focus:ring-vd-forest cursor-pointer"
                                />
                                <div className="text-xs">
                                    <p className="font-bold text-stone-900">Post Anonymously</p>
                                    <p className="text-stone-500 font-light text-[11px]">
                                        Your name and profile avatar will remain hidden on the forum.
                                    </p>
                                </div>
                            </label>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAskModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingQuestion}
                                    className="px-5 py-2.5 rounded-xl bg-vd-forest hover:bg-vd-forest-deep text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {submittingQuestion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Submit Question</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL / DRAWER: Question Details & Answers View */}
            {/* ========================================================================= */}
            {selectedQuestion && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setSelectedQuestion(null)}
                >
                    <div
                        className="bg-white rounded-[2rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto space-y-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with Back & Close */}
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer mr-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-vd-forest font-bold text-xs border border-emerald-200">
                                    {selectedQuestion.topic || 'General Health'}
                                </span>
                            </div>

                            <button
                                onClick={() => setSelectedQuestion(null)}
                                className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Question Content */}
                        <div className="space-y-4">
                            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 leading-tight">
                                {selectedQuestion.title}
                            </h2>

                            <div className="flex items-center gap-3 text-xs text-stone-500">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-vd-forest font-bold text-xs flex items-center justify-center">
                                    {selectedQuestion.is_anonymous ? '👤' : (selectedQuestion.patient?.name?.[0] || 'P')}
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900">
                                        {selectedQuestion.is_anonymous ? 'Anonymous Patient' : selectedQuestion.patient?.name || 'Vaididea Patient'}
                                    </p>
                                    <p className="text-[10px] text-stone-400 font-light">
                                        Posted {formatRelativeTime(selectedQuestion.created_at)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs sm:text-sm text-stone-800 leading-relaxed font-normal whitespace-pre-line">
                                {selectedQuestion.content}
                            </div>

                            {/* Upvote & Actions */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => handleUpvoteQuestion(e, selectedQuestion.id)}
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                            upvotedIds[selectedQuestion.id]
                                                ? 'bg-emerald-50 text-vd-forest border-emerald-300'
                                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                                        }`}
                                    >
                                        <ThumbsUp className={`w-3.5 h-3.5 ${upvotedIds[selectedQuestion.id] ? 'fill-vd-forest' : ''}`} />
                                        <span>{selectedQuestion.upvotes} Helpful</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleShare(e, selectedQuestion.id)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                    >
                                        {copiedShareId === selectedQuestion.id ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                            <Share2 className="w-3.5 h-3.5" />
                                        )}
                                        <span>Share</span>
                                    </button>
                                </div>

                                <button
                                    onClick={(e) => handleToggleBookmark(e, selectedQuestion.id)}
                                    className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                                        bookmarkedIds[selectedQuestion.id]
                                            ? 'bg-emerald-50 text-vd-forest border-emerald-300'
                                            : 'bg-stone-100 hover:bg-stone-200 text-stone-500 border-stone-200'
                                    }`}
                                >
                                    <Bookmark className={`w-4 h-4 ${bookmarkedIds[selectedQuestion.id] ? 'fill-vd-forest' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Answers Section */}
                        <div className="space-y-4 pt-4 border-t border-stone-200">
                            <div className="flex items-center justify-between">
                                <h3 className="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-vd-forest" />
                                    <span>Answers ({selectedQuestion.answers?.length ?? 0})</span>
                                </h3>
                            </div>

                            {selectedQuestion.answers && selectedQuestion.answers.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedQuestion.answers.map((ans) => {
                                        const isDoctor = ans.responder_type === 'doctor' || ans.is_doctor_verified || Boolean(ans.doctor_id && ans.doctor);
                                        const doctorInfo = ans.doctor;

                                        return (
                                            <div
                                                key={ans.id}
                                                className={`p-5 rounded-3xl border transition-all ${
                                                    isDoctor
                                                        ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                                                        : 'bg-stone-50 border-stone-200/80'
                                                }`}
                                            >
                                                {/* Responder Header */}
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                            isDoctor
                                                                ? 'bg-vd-forest text-white shadow-xs'
                                                                : 'bg-stone-200 text-stone-700'
                                                        }`}>
                                                            {isDoctor ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-heading font-bold text-xs text-stone-900">
                                                                    {isDoctor ? doctorInfo?.name || ans.responder_name || 'Verified Doctor' : ans.patient?.name || 'Community Member'}
                                                                </h4>
                                                                {isDoctor && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider border border-emerald-300">
                                                                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                                                        <span>VERIFIED DOCTOR</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isDoctor && doctorInfo?.specialization && (
                                                                <p className="text-[10px] text-vd-forest font-semibold mt-0.5">
                                                                    {doctorInfo.specialization} {doctorInfo.qualifications?.length ? `• ${doctorInfo.qualifications.join(', ')}` : ''} {doctorInfo.experience_years ? `(${doctorInfo.experience_years}y exp)` : ''}
                                                                </p>
                                                            )}
                                                            <p className="text-[9px] text-stone-400 font-light mt-0.5">
                                                                {formatRelativeTime(ans.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleUpvoteAnswer(ans.id, ans.upvotes)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-[11px] font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                                                    >
                                                        <ThumbsUp className="w-3 h-3 text-stone-400" />
                                                        <span>{ans.upvotes}</span>
                                                    </button>
                                                </div>

                                                {/* Answer Content */}
                                                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal whitespace-pre-line pl-12">
                                                    {ans.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center text-xs text-stone-500 font-light">
                                    No answers posted yet. Be the first to share an answer or recommendation!
                                </div>
                            )}

                            {/* Reply Input Form */}
                            <form onSubmit={handleAddReply} className="space-y-3 pt-3">
                                {replyError && (
                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                                        {replyError}
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea
                                        rows={3}
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Write an answer or helpful perspective to support this patient..."
                                        className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-vd-forest focus:outline-none resize-none pr-24"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingReply || !replyContent.trim()}
                                        className="absolute right-3 bottom-4 px-4 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                    >
                                        {submittingReply ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Send className="w-3.5 h-3.5" />
                                        )}
                                        <span>Reply</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
