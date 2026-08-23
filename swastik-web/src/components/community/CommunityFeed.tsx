'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    MessageCircleQuestion, Send, User, Loader2, ArrowUp, Calendar, Edit2, 
    Trash2, CheckCircle2, MessageSquareReply, Search, Filter, 
    Star, TrendingUp, Clock, ChevronLeft, ChevronRight, RefreshCw,
    Flag, AlertTriangle 
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricCard } from '@/components/doctor/MetricCard';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';

const getResponderBadgeProps = (type: string, name: string, isVerified: boolean, defaultDoctorName?: string, defaultDoctorSpecialty?: string) => {
    switch (type) {
        case 'hospital': return { label: name, subLabel: 'Verified Hospital', iconLetter: 'H' };
        case 'clinic': return { label: name, subLabel: 'Verified Clinic', iconLetter: 'C' };
        case 'pharmacy': return { label: name, subLabel: 'Verified Pharmacy', iconLetter: 'P' };
        case 'diagnostic_center': return { label: name, subLabel: 'Verified Diagnostic Center', iconLetter: 'D' };
        default: return { label: defaultDoctorName ? `Dr. ${defaultDoctorName}` : 'Unknown Doctor', subLabel: 'Verified Doctor', iconLetter: 'Dr', extra: defaultDoctorSpecialty };
    }
};

const QuestionSkeleton = () => (
    <DoctorPortalCard className="mb-6 animate-pulse">
        <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
            <div className="flex-1 space-y-4 pt-1">
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-5/6"></div>
                <div className="flex gap-3 pt-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-28"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-32"></div>
                </div>
            </div>
        </div>
    </DoctorPortalCard>
);

type PortalType = 'doctor' | 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic' | 'diagnostic_center';

interface CommunityFeedProps {
    portalType: PortalType;
}

const getTabsForPortal = (type: PortalType) => {
    switch (type) {
        case 'doctor': return ['My Specialty', 'All', 'Unanswered', 'Answered'];
        case 'clinic': return ['Relevant', 'All', 'Unanswered', 'Answered'];
        case 'hospital': return ['Relevant', 'All', 'Unanswered', 'Answered'];
        case 'pharmacy': return ['Medications', 'Unanswered', 'Answered'];
        case 'diagnostic': return ['Diagnostics', 'Unanswered', 'Answered'];
        default: return ['All', 'Unanswered', 'Answered'];
    }
};

export function CommunityFeed({ portalType }: CommunityFeedProps) {
    const tabs = getTabsForPortal(portalType);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<string>(tabs[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'upvoted'

    // For answering
    const [answeringId, setAnsweringId] = useState<string | null>(null);
    const [answerContent, setAnswerContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // For editing/deleting
    const { user } = useAuthStore();
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // For reporting
    const [reportTarget, setReportTarget] = useState<{type: 'question' | 'answer', id: string} | null>(null);
    const [reportReason, setReportReason] = useState('Spam');
    const [reportDetails, setReportDetails] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const backendFilter = activeTab;
            const response = await api.community.getQuestions(page, 50, backendFilter, debouncedSearch, sortBy);
            if (response.success) {
                const data = response.data as any;
                setQuestions(data.questions || data.data || []);
            } else {
                let errMessage = response.error || 'Failed to load questions';
                const status = (response.status as number) || 500;
                
                if (status === 401) errMessage = 'Authentication required';
                else if (status === 403) errMessage = 'You are not authorized for this Community action.';
                else if (status === 400) errMessage = 'Invalid Community filter for this portal.';
                else if (status === 404) errMessage = 'Community resource not found.';
                else if (status >= 500) errMessage = 'Unable to load community questions.';
                
                setError(errMessage);
            }
        } catch (err: any) {
            setError(err.message || 'Unable to load community questions.');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, debouncedSearch, sortBy]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const unansweredQuestionsCount = useMemo(() => questions.filter(q => !q.answers || q.answers.length === 0).length, [questions]);
    const answeredQuestionsCount = useMemo(() => questions.filter(q => q.answers && q.answers.length > 0).length, [questions]);
    const totalUpvotes = useMemo(() => questions.reduce((acc, q) => acc + (q.upvotes || 0), 0), [questions]);

    const displayedQuestions = questions; // Now filtered on the backend

    const handleAnswerSubmit = async (questionId: string) => {
        if (!answerContent.trim()) return;
        setSubmitting(true);
        try {
            const response = await api.community.addAnswer(questionId, answerContent);
            if (response.success) {
                setAnswerContent('');
                setAnsweringId(null);
                loadQuestions();
                setActiveTab('Answered'); // Switch to answered tab to see the response
            } else {
                alert(response.error || 'Failed to submit answer');
            }
        } catch (err: any) {
            alert(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditSubmit = async (answerId: string) => {
        if (!editContent.trim()) return;
        setSubmitting(true);
        try {
            const response = await api.community.editAnswer(answerId, editContent);
            if (response.success) {
                setEditingAnswerId(null);
                setEditContent('');
                loadQuestions();
            } else {
                alert(response.error || 'Failed to update answer');
            }
        } catch (err: any) {
            alert(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnswer = async (answerId: string) => {
        if (!confirm('Are you sure you want to delete your answer?')) return;
        try {
            await api.community.deleteAnswer(answerId);
            setQuestions(questions.map(q => ({
                ...q,
                answers: q.answers?.filter((a: any) => a.id !== answerId)
            })));
        } catch (err: any) {
            console.error('Failed to delete answer:', err);
            alert('Failed to delete answer');
        }
    };

    const handleReport = async () => {
        if (!reportTarget) return;
        setSubmittingReport(true);
        try {
            const data = { reason: reportReason, details: reportDetails };
            let res;
            if (reportTarget.type === 'question') {
                res = await api.community.reportQuestion(reportTarget.id, data);
            } else {
                res = await api.community.reportAnswer(reportTarget.id, data);
            }
            if (res.success) {
                setReportSuccessMessage('Report submitted successfully.');
                setTimeout(() => {
                    setReportSuccessMessage(null);
                    setReportTarget(null);
                    setReportReason('Spam');
                    setReportDetails('');
                }, 2000);
            } else {
                alert(res.error || 'Failed to submit report. It might be a duplicate.');
                setReportTarget(null);
            }
        } catch (err: any) {
            console.error('Failed to report:', err);
            alert('Failed to submit report. Please try again.');
        } finally {
            setSubmittingReport(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <MessageCircleQuestion className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
                        {portalType === 'doctor' ? 'Community Q&A' :
                         portalType === 'hospital' ? 'Community Q&A' :
                         portalType === 'clinic' ? 'Community Insights' :
                         portalType === 'pharmacy' ? 'Pharmacy Community' :
                         'Diagnostic Community'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                        {portalType === 'doctor' ? 'Share your medical expertise and help patients worldwide.' :
                         portalType === 'clinic' ? 'Discover and contribute to relevant public healthcare discussions.' :
                         portalType === 'hospital' ? 'Explore and contribute to relevant healthcare discussions.' :
                         portalType === 'pharmacy' ? 'Answer and explore medication and pharmacy-related questions.' :
                         'Answer and explore diagnostic and testing-related questions.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => loadQuestions()} 
                        disabled={loading}
                        className="h-11 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 px-6"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl border border-red-200 dark:border-red-800 flex items-center justify-between">
                    <span>{error}</span>
                    <Button 
                        variant="outline" 
                        onClick={() => loadQuestions()} 
                        className="h-8 rounded-lg bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-bold px-3 text-sm"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Premium Summary Statistics */}
            {portalType === 'doctor' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-6">
                    <MetricCard
                        title="Total Questions"
                        value={questions.length.toString()}
                        icon={<MessageSquareReply className="h-5 w-5" />}
                        trend={undefined}
                    />

                    <MetricCard
                        title="Community Upvotes"
                        value={totalUpvotes.toString()}
                        icon={<Star className="h-5 w-5" />}
                        trend={undefined}
                    />
                </div>
            ) : null}

            {/* Controls Bar: Tabs + Search + Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mt-8 bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-x-auto w-full lg:w-auto shrink-0 border border-gray-200/50 dark:border-gray-700/50">
                    {tabs.map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative z-10 px-4 py-2 text-sm font-bold transition-all duration-200 rounded-xl whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 shadow-sm border border-gray-200/50 dark:border-gray-700/50' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-[46px] pl-11 pr-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all"
                        />
                    </div>
                    <div className="relative shrink-0 w-full sm:w-48">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full h-[46px] pl-11 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="upvoted">Most Upvoted</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Questions List */}
            <div className="mt-8 space-y-6">
                {loading && questions.length === 0 ? (
                    <>
                        <QuestionSkeleton />
                        <QuestionSkeleton />
                        <QuestionSkeleton />
                    </>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 border-dashed dark:border-red-800/30 py-24 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-6 ring-8 ring-red-50 dark:ring-red-900/10">
                            <RefreshCw className="w-16 h-16 text-red-500 dark:text-red-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                            Unable to load questions
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                            An error occurred while fetching the community questions.
                        </p>
                        <Button 
                            onClick={() => loadQuestions()} 
                            className="h-11 rounded-xl px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Retry
                        </Button>
                    </div>
                ) : displayedQuestions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6 ring-8 ring-gray-50/50 dark:ring-gray-800/50">
                            <MessageCircleQuestion className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                            {searchQuery ? 'No results found' : `No questions in ${activeTab}`}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                            {searchQuery 
                                ? "We couldn't find any questions matching your search criteria."
                                : "Check back later or adjust your filters to see more questions."}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {displayedQuestions.map((q) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                key={q.id}
                            >
                                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-[0_2px_10px_-3px_rgba(79,70,229,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all duration-300 relative group overflow-hidden">
                                    
                                    {/* Top Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                        <div className="flex items-start gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-extrabold text-2xl border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm shrink-0">
                                                {(q.patient?.name || 'A')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                    {q.category && (
                                                        <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                                                            {q.category}
                                                        </span>
                                                    )}
                                                    {q.specialty_target && (
                                                        <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-teal-200/50 dark:border-teal-800/30 shadow-sm">
                                                            {q.specialty_target}
                                                        </span>
                                                    )}
                                                    {!q.category && !q.specialty_target && q.topic && (
                                                        <span className="text-[10px] font-extrabold text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                                            #{q.topic}
                                                        </span>
                                                    )}
                                                    {q.upvotes > 10 && (
                                                        <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-purple-200/50 dark:border-purple-800/30 flex items-center gap-1 shadow-sm">
                                                            <TrendingUp className="w-3 h-3" /> Trending
                                                        </span>
                                                    )}
                                                    {!q.answers?.length ? (
                                                        <span className="text-[10px] font-extrabold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-orange-200/50 dark:border-orange-800/30 shadow-sm">
                                                            Needs Answer
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
                                                            Answered
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
                                                    {q.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Preview */}
                                    <p className="text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed mb-6 bg-gray-50/80 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        {q.content}
                                    </p>

                                    {/* Footer info */}
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-t border-gray-100 dark:border-gray-800 pt-5">
                                        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <User className="w-4 h-4 text-gray-400" /> {q.patient?.name || 'Anonymous'}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <Calendar className="w-4 h-4 text-gray-400" /> {new Date(q.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                                                <ArrowUp className="w-4 h-4" /> {q.upvotes || 0} Upvotes
                                            </span>
                                            {q.answers?.length > 0 && (
                                                <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                                    <CheckCircle2 className="w-4 h-4" /> {q.answers.length} {q.answers.length === 1 ? 'Reply' : 'Replies'}
                                                </span>
                                            )}
                                        </div>

                                        {/* CTA Button */}
                                        {!answeringId || answeringId !== q.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => setReportTarget({type: 'question', id: q.id})} className="p-2 rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-red-600 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                                                    <Flag className="h-4 w-4" />
                                                </button>
                                                <Button
                                                    onClick={() => {
                                                        if (q.answers?.length > 0 && activeTab !== 'My Specialty' && activeTab !== 'All') setActiveTab('Answered');
                                                        setAnsweringId(q.id);
                                                    }}
                                                    className={`h-11 rounded-xl px-6 font-bold shadow-sm transition-all active:scale-95 hover:-translate-y-0.5 border-0 whitespace-nowrap w-full md:w-auto ${!q.answers?.length ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'}`}
                                                >
                                                    <MessageCircleQuestion className="w-4 h-4 mr-2" />
                                                    {!q.answers?.length ? 'Be the first to answer' : 'Add another answer'}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Existing Answers */}
                                    {q.answers && q.answers.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                                            <h4 className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Answers ({q.answers.length})
                                            </h4>
                                            {q.answers.map((a: any) => (
                                                <div key={a.id} className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 p-5 rounded-2xl relative group/answer">
                                                    {editingAnswerId === a.id ? (
                                                        <div className="flex flex-col gap-3">
                                                            <textarea
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                className="w-full min-h-[100px] p-4 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all outline-none resize-none shadow-sm"
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <Button className="h-10 rounded-xl px-5 font-bold" variant="outline" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                                                <Button className="h-10 rounded-xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-0 shadow-indigo-500/25" onClick={() => handleEditSubmit(a.id)} disabled={!editContent.trim() || submitting}>
                                                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 font-extrabold text-sm border border-teal-200 dark:border-teal-800">
                                                                        {getResponderBadgeProps(a.responder_type || (a.doctor_id ? 'doctor' : 'patient'), a.responder_name, a.responder_verified, a.doctor?.name, a.doctor?.specialization).iconLetter}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex flex-col">
                                                                            <p className="text-gray-900 dark:text-white font-bold text-sm">
                                                                                {getResponderBadgeProps(a.responder_type || (a.doctor_id ? 'doctor' : 'patient'), a.responder_name, a.responder_verified, a.doctor?.name, a.doctor?.specialization).label}
                                                                            </p>
                                                                            <div className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                                                                                {(a.responder_verified || (a.responder_type === 'doctor' && a.doctor?.is_verified)) && (
                                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                                )}
                                                                                {getResponderBadgeProps(a.responder_type || (a.doctor_id ? 'doctor' : 'patient'), a.responder_name, a.responder_verified, a.doctor?.name, a.doctor?.specialization).subLabel}
                                                                            </div>
                                                                        </div>
                                                                        {((a.doctor?.user_id === user?.id) || (a.responder_type !== 'doctor' && a.responder_type !== 'patient' && portalType !== 'doctor')) && <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/30">You</span>}
                                                                    </div>
                                                                </div>
                                                                
                                                                {((a.doctor?.user_id === user?.id) || (['hospital', 'clinic', 'pharmacy', 'diagnostic_center'].includes(a.responder_type) && portalType === a.responder_type)) ? (
                                                                    <div className="flex gap-2 opacity-0 group-hover/answer:opacity-100 transition-opacity">
                                                                        <button onClick={() => { setEditingAnswerId(a.id); setEditContent(a.content); }} className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-500 hover:text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors">
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteAnswer(a.id)} className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-500 hover:text-rose-600 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors">
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex gap-2 opacity-0 group-hover/answer:opacity-100 transition-opacity">
                                                                        <button onClick={() => setReportTarget({type: 'answer', id: a.id})} className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-500 hover:text-red-600 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors" title="Report this answer">
                                                                            <Flag className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-700 dark:text-gray-300 pl-12 leading-relaxed text-[15px]">{a.content}</p>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* New Answer Form */}
                                    {answeringId === q.id && (
                                        <div className="mt-6 p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 shadow-inner">
                                            <p className="text-sm font-extrabold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                                <MessageSquareReply className="w-4 h-4" /> 
                                                Answering as {portalType === 'doctor' ? (user?.name ? `Dr. ${user.name}` : 'Doctor') : (user?.name || 'Organization')}
                                            </p>
                                            <div className="flex flex-col gap-3 items-start">
                                                <textarea
                                                    placeholder="Type your medical advice..."
                                                    value={answerContent}
                                                    onChange={(e) => setAnswerContent(e.target.value)}
                                                    className="w-full h-28 p-4 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all outline-none resize-none shadow-sm"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-3 w-full">
                                                    <Button variant="outline" className="h-11 rounded-xl px-6 font-bold bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => { setAnsweringId(null); setAnswerContent(''); }}>Cancel</Button>
                                                    <Button 
                                                        className="h-11 rounded-xl px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-sm shadow-indigo-500/25 border-0 font-bold active:scale-95 transition-all"
                                                        onClick={() => handleAnswerSubmit(q.id)} 
                                                        disabled={!answerContent.trim() || submitting}
                                                    >
                                                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                                        Post Answer
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Premium Pagination */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-3 shadow-sm mt-8">
                <Button 
                    variant="ghost" 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1 || loading} 
                    className="h-11 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-5"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-extrabold text-sm border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                        {page}
                    </span>
                </div>
                <Button 
                    variant="ghost" 
                    onClick={() => setPage(p => p + 1)} 
                    disabled={questions.length < 50 || loading} 
                    className="h-11 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-5"
                >
                    Next <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </div>

            {/* Report Modal */}
            <AnimatePresence>
                {reportTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 relative"
                        >
                            {reportSuccessMessage ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Report Submitted</h3>
                                    <p className="text-gray-500">{reportSuccessMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                        <AlertTriangle className="w-6 h-6 text-red-500" />
                                        Report {reportTarget.type === 'question' ? 'Question' : 'Answer'}
                                    </h3>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reason</label>
                                            <select 
                                                value={reportReason}
                                                onChange={(e) => setReportReason(e.target.value)}
                                                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                                            >
                                                <option>Spam</option>
                                                <option>Abuse</option>
                                                <option>Misinformation</option>
                                                <option>Privacy</option>
                                                <option>Offensive</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Details (Optional)</label>
                                            <textarea 
                                                value={reportDetails}
                                                onChange={(e) => setReportDetails(e.target.value)}
                                                placeholder="Provide more context..."
                                                className="w-full h-24 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setReportTarget(null)} className="rounded-xl px-6">Cancel</Button>
                                        <Button 
                                            onClick={handleReport}
                                            disabled={submittingReport}
                                            className="rounded-xl px-6 bg-red-600 hover:bg-red-700 text-white border-0"
                                        >
                                            {submittingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Submit Report'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
