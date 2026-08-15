'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MapPin, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface JoinRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization: any; // The clinic or hospital being requested
    onSuccess?: () => void;
}

export default function JoinRequestModal({ isOpen, onClose, organization, onSuccess }: JoinRequestModalProps) {
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        message: '',
        practiceType: 'visiting', // 'full_time', 'part_time', 'visiting'
        department: '',
        preferredDays: [] as string[],
        preferredStartTime: '09:00',
        preferredEndTime: '13:00',
    });
    
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen || !organization) return null;

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            preferredDays: prev.preferredDays.includes(day)
                ? prev.preferredDays.filter(d => d !== day)
                : [...prev.preferredDays, day]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (organization.type === 'clinic') {
                await doctorApi.requestToJoinClinic(organization.id, formData);
            } else {
                await doctorApi.requestToJoinHospital(organization.id, formData);
            }
            setIsSuccess(true);
            toast.success('Request Sent', `Successfully requested to join ${organization.name}.`);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (error: any) {
            toast.error('Unable to send request', error.message || 'Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join {organization.name}</h2>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {organization.type === 'hospital' ? 'Hospital' : 'Clinic'}</span>
                                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {organization.city || 'Location unavailable'}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {isSuccess ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request Sent Successfully!</h3>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                        {organization.name} has been notified. They will review your request and get back to you soon.
                                    </p>
                                </div>
                            ) : (
                                <form id="join-request-form" onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Message (Optional)
                                        </label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-brand-500 focus:ring-brand-500 min-h-[100px] resize-none"
                                            placeholder="Introduce yourself or specify any preferences..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Practice Type
                                            </label>
                                            <select
                                                value={formData.practiceType}
                                                onChange={(e) => setFormData({ ...formData, practiceType: e.target.value })}
                                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-brand-500 focus:ring-brand-500"
                                            >
                                                <option value="visiting">Visiting Consultant</option>
                                                <option value="part_time">Part-Time</option>
                                                <option value="full_time">Full-Time</option>
                                            </select>
                                        </div>
                                        {organization.type === 'hospital' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Department (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-brand-500 focus:ring-brand-500"
                                                    placeholder="e.g. Cardiology"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-xl border border-brand-100 dark:border-brand-900/30">
                                        <h3 className="text-sm font-medium text-brand-800 dark:text-brand-300 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Proposed Schedule
                                        </h3>
                                        
                                        <div className="mb-4">
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                                                Preferred Days
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {daysOfWeek.map(day => {
                                                    const isSelected = formData.preferredDays.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleDay(day)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                                                isSelected
                                                                    ? 'bg-brand-600 text-white'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                                                            }`}
                                                        >
                                                            {day.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.preferredStartTime}
                                                    onChange={(e) => setFormData({ ...formData, preferredStartTime: e.target.value })}
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-brand-500 focus:ring-brand-500 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                                                    End Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.preferredEndTime}
                                                    onChange={(e) => setFormData({ ...formData, preferredEndTime: e.target.value })}
                                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-brand-500 focus:ring-brand-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3 italic">
                                            Note: You and the organization can negotiate this schedule later.
                                        </p>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Footer */}
                        {!isSuccess && (
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    form="join-request-form"
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send Join Request
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
