'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    MessageCircleQuestion, Send, User, Loader2, ArrowUp, Calendar, Edit2, 
    Trash2, CheckCircle2, MessageSquareReply, Search, Filter, 
    Star, TrendingUp, Clock, ChevronLeft, ChevronRight, RefreshCw 
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

const QuestionSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm mb-6 animate-pulse">
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
    </div>
);

export default function DoctorCommunityPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    
    const [activeTab, setActiveTab] = useState<'unanswered' | 'answered'>('unanswered');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'upvoted'

    // For answering
    const [answeringId, setAnsweringId] = useState<string | null>(null);
    const [answerContent, setAnswerContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // For editing/deleting
    const { user } = useAuthStore();
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.community.getQuestions(page, 50);
            if (response.success) {
                const data = response.data as any;
                setQuestions(data.questions || data.data || []);
            } else {
                setError(response.error || 'Failed to load questions');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const unansweredQuestions = useMemo(() => questions.filter(q => !q.answers || q.answers.length === 0), [questions]);
    const answeredQuestions = useMemo(() => questions.filter(q => q.answers && q.answers.length > 0), [questions]);
    const totalUpvotes = useMemo(() => questions.reduce((acc, q) => acc + (q.upvotes || 0), 0), [questions]);

    let displayedQuestions = activeTab === 'unanswered' ? unansweredQuestions : answeredQuestions;
    
    // Apply local UI filters
    if (searchQuery) {
        displayedQuestions = displayedQuestions.filter(q => 
            q.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            q.content?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    if (sortBy === 'newest') {
        displayedQuestions = [...displayedQuestions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'upvoted') {
        displayedQuestions = [...displayedQuestions].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    const handleAnswerSubmit = async (questionId: string) => {
        if (!answerContent.trim()) return;
        setSubmitting(true);
        try {
            const response = await api.community.addAnswer(questionId, answerContent);
            if (response.success) {
                setAnswerContent('');
                setAnsweringId(null);
                loadQuestions();
                setActiveTab('answered'); // Switch to answered tab to see the response
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
        if (!confirm('Are you sure you want to delete this answer?')) return;
        try {
            const response = await api.community.deleteAnswer(answerId);
            if (response.success) {
                loadQuestions();
            } else {
                alert(response.error || 'Failed to delete answer');
            }
        } catch (err: any) {
            alert(err.message || 'An error occurred');
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <MessageCircleQuestion className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
                        Community Q&A
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
                        Share your medical expertise and help patients worldwide.
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
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl border border-red-200 dark:border-red-800">
                    {error}
                </div>
            )}

            {/* Premium Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-orange-100 dark:border-orange-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-900/5 hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                            <Clock className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{unansweredQuestions.length}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span> Awaiting Answer
                        </p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/5 hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{answeredQuestions.length}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Answered
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/5 hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <MessageSquareReply className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{questions.length}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1.5">Total Questions</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/5 hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <Star className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{totalUpvotes}</p>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1.5">Community Upvotes</p>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Tabs + Search + Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mt-8 bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
                <div className="relative flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full lg:w-auto shrink-0 border border-gray-200/50 dark:border-gray-700/50">
                    <motion.div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-900 shadow-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl"
                        initial={false}
                        animate={activeTab === 'unanswered' ? { x: 4 } : { x: 'calc(100% + 4px)' }}
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                    <button 
                        onClick={() => setActiveTab('unanswered')}
                        className={`relative z-10 w-full sm:w-40 py-2.5 text-sm font-bold transition-colors duration-200 ${activeTab === 'unanswered' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Needs Answer ({unansweredQuestions.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('answered')}
                        className={`relative z-10 w-full sm:w-40 py-2.5 text-sm font-bold transition-colors duration-200 ${activeTab === 'answered' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Answered ({answeredQuestions.length})
                    </button>
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
                ) : displayedQuestions.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6 ring-8 ring-gray-50/50 dark:ring-gray-800/50">
                            <MessageCircleQuestion className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                            {activeTab === 'unanswered' ? (searchQuery ? 'No results found' : 'No unanswered questions') : (searchQuery ? 'No results found' : 'No answered questions yet')}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                            {searchQuery 
                                ? "We couldn't find any questions matching your search criteria."
                                : activeTab === 'unanswered' 
                                    ? "Great job! You've helped catch up on all community questions. Check back later." 
                                    : "You haven't answered any questions yet. Head over to the 'Needs Answer' tab to share your expertise."}
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
                                                    <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-teal-200/50 dark:border-teal-800/30 shadow-sm">
                                                        {q.category || 'General Health'}
                                                    </span>
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
                                            <Button
                                                onClick={() => {
                                                    if (q.answers?.length > 0) setActiveTab('answered');
                                                    setAnsweringId(q.id);
                                                }}
                                                className={`h-11 rounded-xl px-6 font-bold shadow-sm transition-all active:scale-95 hover:-translate-y-0.5 border-0 whitespace-nowrap w-full md:w-auto ${!q.answers?.length ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-500/25' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'}`}
                                            >
                                                <MessageCircleQuestion className="w-4 h-4 mr-2" />
                                                {!q.answers?.length ? 'Be the first to answer' : 'Add another answer'}
                                            </Button>
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
                                                                        Dr
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-gray-900 dark:text-white font-bold text-sm">
                                                                            Dr. {a.doctor?.name || 'Unknown Doctor'}
                                                                        </p>
                                                                        {a.doctor?.user_id === user?.id && <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/30">You</span>}
                                                                    </div>
                                                                </div>
                                                                
                                                                {a.doctor?.user_id === user?.id && (
                                                                    <div className="flex gap-2 opacity-0 group-hover/answer:opacity-100 transition-opacity">
                                                                        <button onClick={() => { setEditingAnswerId(a.id); setEditContent(a.content); }} className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-500 hover:text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors">
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteAnswer(a.id)} className="p-2 rounded-xl bg-white dark:bg-gray-700 text-gray-500 hover:text-rose-600 shadow-sm border border-gray-200 dark:border-gray-600 transition-colors">
                                                                            <Trash2 className="h-4 w-4" />
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
                                                <MessageSquareReply className="w-4 h-4" /> Write your professional response
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
        </div>
    );
}
