'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageCircleQuestion, Send, User, Loader2, ArrowUp, Calendar, Edit2, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { useAuthStore } from '@/stores/authStore';

export default function DoctorCommunityPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    
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
            const response = await api.community.getQuestions(page, 20);
            if (response.success) {
                // The backend pagination returns data in response.data.questions or response.data.data
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

    const handleAnswerSubmit = async (questionId: string) => {
        if (!answerContent.trim()) return;
        setSubmitting(true);
        try {
            const response = await api.community.addAnswer(questionId, answerContent);
            if (response.success) {
                setAnswerContent('');
                setAnsweringId(null);
                loadQuestions();
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

    if (loading && questions.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading community Q&A...</span></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community Q&A</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Answer patient questions to help the community</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {questions.length === 0 ? (
                    <Card padding="md">
                        <div className="text-center text-gray-500 py-8">
                            No questions found in the community right now.
                        </div>
                    </Card>
                ) : questions.map((q) => (
                    <Card key={q.id} padding="md" className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{q.title}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mt-1">{q.content}</p>
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1"><User className="h-4 w-4" /> {q.patient?.name || 'Anonymous Patient'}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(q.created_at).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><ArrowUp className="h-3 w-3" /> {q.upvotes || 0} Upvotes</span>
                                </div>
                            </div>
                        </div>

                        {/* Answers Section */}
                        {q.answers && q.answers.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Answers ({q.answers.length})</h4>
                                {q.answers.map((a: any) => (
                                    <div key={a.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm group relative">
                                        {editingAnswerId === a.id ? (
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full text-sm"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingAnswerId(null)}>Cancel</Button>
                                                    <Button size="sm" onClick={() => handleEditSubmit(a.id)} disabled={!editContent.trim() || submitting}>
                                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-gray-800 dark:text-gray-200">{a.content}</p>
                                                <div className="flex justify-between items-end mt-1">
                                                    <p className="text-gray-500 text-xs font-medium">
                                                        Dr. {a.doctor?.name || 'Unknown Doctor'}
                                                    </p>
                                                    {a.doctor?.user_id === user?.id && (
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setEditingAnswerId(a.id); setEditContent(a.content); }} className="text-gray-400 hover:text-blue-600">
                                                                <Edit2 className="h-3 w-3" />
                                                            </button>
                                                            <button onClick={() => handleDeleteAnswer(a.id)} className="text-gray-400 hover:text-red-600">
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Answer Input */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-4">
                            {answeringId === q.id ? (
                                <div className="flex gap-2 items-start">
                                    <Input
                                        placeholder="Type your medical advice..."
                                        value={answerContent}
                                        onChange={(e) => setAnswerContent(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button 
                                        onClick={() => handleAnswerSubmit(q.id)} 
                                        disabled={!answerContent.trim() || submitting}
                                        leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    >
                                        Submit
                                    </Button>
                                    <Button variant="ghost" onClick={() => { setAnsweringId(null); setAnswerContent(''); }}>Cancel</Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" onClick={() => setAnsweringId(q.id)} leftIcon={<MessageCircleQuestion className="h-4 w-4" />}>
                                    Write an Answer
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="mr-2">Previous Page</Button>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={questions.length < 20}>Next Page</Button>
            </div>
        </div>
    );
}
