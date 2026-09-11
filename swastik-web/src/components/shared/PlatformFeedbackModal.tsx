'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, AlertCircle, CheckCircle2, Bug, Lightbulb, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { feedbackApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    pageName?: string;
    route?: string;
}

export default function PlatformFeedbackModal({
    isOpen,
    onClose,
    onSuccess,
    pageName,
    route
}: PlatformFeedbackModalProps) {
    const [type, setType] = useState('Suggest an Improvement');
    const [category, setCategory] = useState('UI/UX');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rating, setRating] = useState<number>(5);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            setError('Please provide a title and description for your feedback');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await feedbackApi.submitFeedback({
                type,
                category,
                title: title.trim(),
                description: description.trim(),
                rating,
                pageName: pageName || typeof window !== 'undefined' ? window.location.pathname : undefined,
                route: route || typeof window !== 'undefined' ? window.location.pathname : undefined
            });

            if (res.success) {
                setSubmitted(true);
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    onClose();
                }, 1200);
            } else {
                setError(res.error || 'Failed to submit feedback');
            }
        } catch (err: any) {
            setError(err.message || 'Network error submitting feedback');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[92dvh] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 shrink-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-black text-lg sm:text-xl text-gray-900 dark:text-white truncate">
                                Platform Feedback
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                                Send direct suggestions, bug reports, and UX ideas to Vaididea Admins
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {submitted ? (
                    <div className="p-8 sm:p-12 text-center space-y-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto"
                        >
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                        </motion.div>
                        <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Feedback Received!</h4>
                        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                            Thank you for helping us improve Vaididea. Our product team reviews all submissions directly.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
                        {error && (
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 border border-red-200/50">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Type Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Feedback Type
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { id: 'Report a Problem', label: 'Report Bug', icon: Bug },
                                    { id: 'Suggest an Improvement', label: 'Improvement', icon: Lightbulb },
                                    { id: 'Request a Feature', label: 'New Feature', icon: Sparkles }
                                ].map(item => {
                                    const Icon = item.icon;
                                    const isSelected = type === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setType(item.id)}
                                            className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-2 sm:gap-1.5 transition-all ${
                                                isSelected
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-300 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="UI/UX">UI & Visual Design</option>
                                <option value="Appointments">Appointments & Booking</option>
                                <option value="Consultations">Video / Live Consultations</option>
                                <option value="Prescriptions">Prescriptions & Pharmacy</option>
                                <option value="Diagnostics">Diagnostic Center & Lab Tests</option>
                                <option value="Hospital Management">Hospital & Inpatient Operations</option>
                                <option value="Performance">Speed & Performance</option>
                                <option value="Billing">Billing & Payments</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Subject / Summary
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Schedule calendar lag on mobile or suggestion for test routing"
                                maxLength={120}
                                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Description & Steps
                                </label>
                                <span className="text-[11px] text-gray-400">{description.length}/2000</span>
                            </div>
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what happened or what improvement you would like to see..."
                                maxLength={2000}
                                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {submitting ? 'Submitting...' : 'Send Feedback'}
                            </Button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
