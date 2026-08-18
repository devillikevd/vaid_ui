'use client';

import { useState } from 'react';
import { Star, X, ShieldCheck, UserRoundX, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reviewsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    target: {
        type: 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'diagnostic_center';
        id: string;
        name: string;
        sourceType?: string;
        sourceId?: string;
        consultationId?: string;
    };
}

export default function ReviewSubmissionModal({
    isOpen,
    onClose,
    onSuccess,
    target
}: ReviewSubmissionModalProps) {
    const [rating, setRating] = useState<number>(5);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating < 1 || rating > 5) {
            setError('Please select a star rating between 1 and 5');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await reviewsApi.submitReview({
                reviewableType: target.type,
                reviewableId: target.id,
                rating,
                sourceType: target.sourceType,
                sourceId: target.sourceId,
                consultationId: target.consultationId,
                title: title.trim() || undefined,
                comment: comment.trim() || undefined,
                isAnonymous
            });

            if (res.success) {
                setSubmitted(true);
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    onClose();
                }, 1200);
            } else {
                setError(res.error || 'Failed to submit review');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while submitting your review');
        } finally {
            setSubmitting(false);
        }
    };

    const targetTypeLabel = target.type.replace('_', ' ');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                Review Experience
                            </span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                {targetTypeLabel}
                            </span>
                        </div>
                        <h3 className="font-black text-xl text-gray-900 dark:text-white">
                            {target.name}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {submitted ? (
                    <div className="p-12 text-center space-y-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto"
                        >
                            <CheckCircle2 className="w-10 h-10" />
                        </motion.div>
                        <h4 className="text-2xl font-black text-gray-900 dark:text-white">Thank You!</h4>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Your verified review has been submitted and helps improve healthcare quality for the entire community.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 border border-red-200/50">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Interactive Star Rating */}
                        <div className="text-center py-2 space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                Overall Rating
                            </label>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isFilled = (hoverRating || rating) >= star;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                                        >
                                            <Star
                                                className={`w-8 h-8 ${
                                                    isFilled
                                                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                                        : 'text-gray-300 dark:text-gray-700'
                                                }`}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                                {rating === 5 && 'Outstanding Experience (5/5)'}
                                {rating === 4 && 'Very Good Experience (4/5)'}
                                {rating === 3 && 'Average Experience (3/5)'}
                                {rating === 2 && 'Needs Improvement (2/5)'}
                                {rating === 1 && 'Poor Experience (1/5)'}
                            </p>
                        </div>

                        {/* Optional Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Review Headline (Optional)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Prompt service, great medical care"
                                maxLength={100}
                                className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Review Comment */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Your Detailed Review
                                </label>
                                <span className="text-[11px] text-gray-400">{comment.length}/1000</span>
                            </div>
                            <textarea
                                rows={4}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share details about your healthcare experience, waiting time, communication, and overall quality..."
                                maxLength={1000}
                                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Anonymous Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isAnonymous ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                                }`}>
                                    {isAnonymous ? <UserRoundX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                </div>
                                <div>
                                    <p className="text-xs font-extrabold text-gray-900 dark:text-white">Post Anonymously</p>
                                    <p className="text-[11px] text-gray-500">Hides your name and avatar on public ratings</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </Button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
