'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Stethoscope, Video, CheckCircle2, X } from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface OnboardingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export default function OnboardingPopup({ isOpen, onClose, onComplete }: OnboardingPopupProps) {
    const toast = useToast();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const options = [
        {
            id: 'own_clinic',
            title: 'I have my own Clinic',
            description: 'Register your clinic on Vaididea and manage your entire practice seamlessly.',
            icon: Building2,
            actionText: 'Register Clinic',
        },
        {
            id: 'join_organization',
            title: 'I want to join a Clinic/Hospital',
            description: 'Search for existing clinics or hospitals on Vaididea and send a join request.',
            icon: Stethoscope,
            actionText: 'Find Organizations',
        },
        {
            id: 'video_only',
            title: 'Video Consultation Only',
            description: 'I will only provide video consultations without any physical clinic affiliation.',
            icon: Video,
            actionText: 'Start Video Practice',
        }
    ];

    const handleConfirm = async () => {
        if (!selectedOption) return;
        
        setIsSubmitting(true);
        try {
            await doctorApi.completeOnboarding(selectedOption);
            toast.success('Preference Saved', 'Your preference has been saved.');
            onComplete();
            
            // Redirect based on choice
            if (selectedOption === 'own_clinic') {
                router.push('/clinic/register');
            } else if (selectedOption === 'join_organization') {
                router.push('/doctor/care-networks/find');
            }
        } catch (error: any) {
            toast.error('Unable to save preference', error.message || 'Please try again later.');
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
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    How would you like to set up your practice?
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Choose an option below to customize your Vaididea experience. You can always change this later.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {options.map((option) => {
                                    const isSelected = selectedOption === option.id;
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setSelectedOption(option.id)}
                                            className={`relative p-6 text-left rounded-xl border-2 transition-all duration-200 ${
                                                isSelected
                                                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-4 right-4 text-brand-600">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center ${
                                                isSelected 
                                                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                {option.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {option.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Decide Later
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedOption || isSubmitting}
                                    className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all shadow-lg ${
                                        !selectedOption || isSubmitting
                                            ? 'bg-brand-400 cursor-not-allowed shadow-none'
                                            : 'bg-brand-600 hover:bg-brand-700 hover:shadow-brand-500/25'
                                    }`}
                                >
                                    {isSubmitting ? 'Saving...' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
