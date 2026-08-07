'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { MessageCircleQuestion, Send, User, Loader2, ArrowUp, Calendar, Edit2, Trash2, CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function DoctorCommunityPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    
    const [activeTab, setActiveTab] = useState<'unanswered' | 'answered'>('unanswered');

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
            // We fetch more questions to ensure we have enough to filter into tabs locally
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

    const displayedQuestions = activeTab === 'unanswered' ? unansweredQuestions : answeredQuestions;

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
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <MessageCircleQuestion className="w-8 h-8 text-indigo-600 dark:text-indigo-500" />
                        Community Q&A
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Answer patient questions to help the community</p>
                </div>
                <Button variant="outline" onClick={() => loadQuestions()} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-2 pt-2">
                    <button
                        onClick={() => setActiveTab('unanswered')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative rounded-t-lg flex items-center gap-2 ${
                            activeTab === 'unanswered' 
                                ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-500 border-t border-l border-r border-gray-200 dark:border-gray-800' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-t border-l border-r border-transparent'
                        }`}
                    >
                        <Circle className="w-4 h-4" />
                        Needs Answer ({unansweredQuestions.length})
                        {activeTab === 'unanswered' && <div className="absolute -bottom-px left-0 right-0 h-px bg-white dark:bg-gray-900" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('answered')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative rounded-t-lg flex items-center gap-2 ${
                            activeTab === 'answered' 
                                ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-500 border-t border-l border-r border-gray-200 dark:border-gray-800' 
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border-t border-l border-r border-transparent'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Answered
                        {activeTab === 'answered' && <div className="absolute -bottom-px left-0 right-0 h-px bg-white dark:bg-gray-900" />}
                    </button>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/30">
                    {loading && questions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                            <p className="font-medium text-gray-600 dark:text-gray-400">Loading community questions...</p>
                        </div>
                    ) : displayedQuestions.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {activeTab === 'unanswered' ? 'No unanswered questions' : 'No answered questions'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                {activeTab === 'unanswered' ? "Great job! The community is fully caught up. Check back later for new questions." : "You haven't answered any questions yet. Head over to the 'Needs Answer' tab to help out."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <AnimatePresence>
                                {displayedQuestions.map((q) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        key={q.id}
                                    >
                                        <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="p-5 sm:p-6">
                                                <div className="flex items-start gap-4">
                                                    {/* Patient Avatar Placeholder */}
                                                    <div className="hidden sm:flex w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center flex-shrink-0 text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                                                        {(q.patient?.name || 'A')[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2">
                                                            {q.title}
                                                        </h3>
                                                        <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base leading-relaxed mb-4">
                                                            {q.content}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                                                            <span className="flex items-center gap-1.5 font-medium">
                                                                <User className="w-4 h-4" /> {q.patient?.name || 'Anonymous Patient'}
                                                            </span>
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="w-4 h-4" /> {new Date(q.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded-full font-medium">
                                                                <ArrowUp className="w-3.5 h-3.5" /> {q.upvotes || 0} Upvotes
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Answers Section */}
                                                {q.answers && q.answers.length > 0 && (
                                                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-4">
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                                            Answers ({q.answers.length})
                                                        </h4>
                                                        {q.answers.map((a: any) => (
                                                            <div key={a.id} className="bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4 rounded-xl text-sm group relative">
                                                                {editingAnswerId === a.id ? (
                                                                    <div className="flex flex-col gap-3">
                                                                        <Input
                                                                            value={editContent}
                                                                            onChange={(e) => setEditContent(e.target.value)}
                                                                            className="w-full text-base"
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                                                            <Button size="sm" onClick={() => handleEditSubmit(a.id)} disabled={!editContent.trim() || submitting} className="bg-indigo-600 hover:bg-indigo-700">
                                                                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xs">
                                                                                Dr
                                                                            </div>
                                                                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                                                                                Dr. {a.doctor?.name || 'Unknown Doctor'}
                                                                            </p>
                                                                            {a.doctor?.user_id === user?.id && <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full ml-2">You</span>}
                                                                        </div>
                                                                        <p className="text-gray-700 dark:text-gray-300 pl-8 leading-relaxed text-base">{a.content}</p>
                                                                        
                                                                        {a.doctor?.user_id === user?.id && (
                                                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => { setEditingAnswerId(a.id); setEditContent(a.content); }} className="p-1.5 rounded-md bg-white dark:bg-gray-700 text-gray-500 hover:text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-600">
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteAnswer(a.id)} className="p-1.5 rounded-md bg-white dark:bg-gray-700 text-gray-500 hover:text-rose-600 shadow-sm border border-gray-200 dark:border-gray-600">
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Answer Input */}
                                                <div className="pt-5 mt-5 border-t border-gray-100 dark:border-gray-800">
                                                    {answeringId === q.id ? (
                                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                                            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Your Answer</p>
                                                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                                                <Input
                                                                    placeholder="Type your medical advice..."
                                                                    value={answerContent}
                                                                    onChange={(e) => setAnswerContent(e.target.value)}
                                                                    className="flex-1 bg-white dark:bg-gray-800"
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2 w-full sm:w-auto">
                                                                    <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => { setAnsweringId(null); setAnswerContent(''); }}>Cancel</Button>
                                                                    <Button 
                                                                        className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white"
                                                                        onClick={() => handleAnswerSubmit(q.id)} 
                                                                        disabled={!answerContent.trim() || submitting}
                                                                        leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                                    >
                                                                        Submit
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            className={activeTab === 'unanswered' ? "w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white" : "w-full sm:w-auto"} 
                                                            variant={activeTab === 'unanswered' ? 'primary' : 'outline'} 
                                                            onClick={() => setAnsweringId(q.id)} 
                                                            leftIcon={<MessageCircleQuestion className="h-4 w-4" />}
                                                        >
                                                            {activeTab === 'unanswered' ? 'Be the first to answer' : 'Add another answer'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="mr-2">Previous Page</Button>
                <span className="inline-flex items-center px-4 text-sm font-medium text-gray-500">Page {page}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={questions.length < 50 || loading} className="ml-2">Next Page</Button>
            </div>
        </div>
    );
}
