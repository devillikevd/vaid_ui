'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Shield, Calendar, Video, FileText, HeartPulse, Wallet, Circle, Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Step1Basic } from './Step1Basic';
import { Step2Professional } from './Step2Professional';
import { Step3Clinic } from './Step3Clinic';
import { Step4Documents } from './Step4Documents';
import { Step5Preview } from './Step5Preview';
import { Step6Success } from './Step6Success';

const STEPS = [
    { id: 1, title: 'Basic Information' },
    { id: 2, title: 'Professional Details' },
    { id: 3, title: 'Clinic Details' },
    { id: 4, title: 'Documents' },
    { id: 5, title: 'Preview' },
    { id: 6, title: 'Completed' }
];

const FEATURES = [
    { icon: Shield, title: 'Secure Consultations' },
    { icon: Calendar, title: 'Appointment Management' },
    { icon: Video, title: 'Video Consultation' },
    { icon: FileText, title: 'Digital Prescription' },
    { icon: HeartPulse, title: 'Patient Records' },
    { icon: Wallet, title: 'Secure Payments' }
];

export default function PremiumDoctorWizard() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '',
        otpSent: false, otpVerified: false,
        medicalCouncil: '', registrationNumber: '', qualifications: [{ degree: '', university: '', year: '' }],
        specializations: [] as string[], experienceYears: '', languages: [] as string[],
        consultationTypes: { video: false, clinic: false, home: false },
        clinicName: '', address: '', city: '', state: '', pincode: '', videoFee: '', clinicFee: '', followupFee: '',
        mbbsCert: null as File | null, registrationCert: null as File | null, panCard: null as File | null, aadhaarCard: null as File | null, profilePhoto: null as File | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateData = (updates: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        const newErrors = { ...errors };
        Object.keys(updates).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    const handleNext = () => { if (step < 6) setStep(s => s + 1); };
    const handleBack = () => { if (step > 1) setStep(s => s - 1); };
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setStep(6);
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderStep = () => {
        const props = { data: formData, updateData, nextStep: handleNext, prevStep: handleBack, errors, setErrors };
        switch (step) {
            case 1: return <Step1Basic {...props} />;
            case 2: return <Step2Professional {...props} />;
            case 3: return <Step3Clinic {...props} />;
            case 4: return <Step4Documents {...props} />;
            case 5: return <Step5Preview {...props} submitForm={handleSubmit} isLoading={isLoading} />;
            case 6: return <Step6Success />;
            default: return null;
        }
    };

    return (
        <div className="h-screen w-full bg-[#09090B] flex flex-col md:flex-row overflow-hidden font-sans text-white relative">
            <style dangerouslySetInnerHTML={{__html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .noise-bg { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E"); }
            `}} />

            {/* Global Background Noise Texture */}
            <div className="absolute inset-0 noise-bg pointer-events-none opacity-50 mix-blend-overlay z-0" />

            {/* LEFT SIDE - 35/40% */}
            <div className="hidden md:flex md:w-[35%] lg:w-[40%] h-full overflow-y-auto hide-scrollbar relative flex-col p-8 lg:p-14 border-r border-[rgba(255,255,255,0.05)] bg-gradient-to-br from-[#09090B] via-[#0a110d] to-[#0d1f14] z-10">
                {/* Decorative glow */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[10%] -left-[20%] w-[80%] h-[80%] rounded-full bg-green-500/5 blur-[120px]" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-[#22C55E] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <svg className="text-white w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Vaididea</span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight mb-4">
                        Become a <span className="text-[#22C55E]">Verified</span> Doctor
                    </h1>
                    <p className="text-[#A1A1AA] text-base lg:text-lg max-w-sm mb-10">
                        Join thousands of doctors providing secure online consultations through Vaididea.
                    </p>

                    {/* Features Checklist */}
                    <div className="grid grid-cols-1 gap-y-4 mb-10">
                        {FEATURES.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center gap-4 text-[#A1A1AA] text-sm lg:text-base group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] group-hover:bg-[#22C55E]/10 group-hover:border-[#22C55E]/20 flex items-center justify-center shrink-0 transition-colors">
                                        <Icon className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#22C55E] transition-colors" />
                                    </div>
                                    <span className="font-medium group-hover:text-white transition-colors">{feature.title}</span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Progress Tracker (Moved Up) */}
                    <div className="relative z-10 mb-10 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="text-xs font-bold tracking-widest text-[#A1A1AA] uppercase mb-6">Registration Progress</div>
                        <div className="relative flex flex-col gap-5 lg:gap-6">
                            {/* Connecting Line */}
                            <div className="absolute left-[11px] top-[14px] bottom-[14px] w-[2px] bg-white/5" />
                            <motion.div 
                                className="absolute left-[11px] top-[14px] w-[2px] bg-[#22C55E] origin-top"
                                initial={{ height: 0 }}
                                animate={{ height: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                            />

                            {STEPS.map((s) => {
                                const isCompleted = step > s.id;
                                const isCurrent = step === s.id;
                                
                                return (
                                    <div key={s.id} className="relative flex items-center gap-4">
                                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 bg-[#09090B]`}>
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                                            ) : isCurrent ? (
                                                <div className="w-5 h-5 rounded-full border-2 border-[#22C55E] bg-[#22C55E]/20 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                                                </div>
                                            ) : (
                                                <Circle className="w-5 h-5 text-white/20" />
                                            )}
                                        </div>
                                        <span className={`text-sm lg:text-base font-medium transition-colors duration-300 ${isCurrent ? 'text-white font-semibold' : isCompleted ? 'text-[#A1A1AA]' : 'text-white/30'}`}>
                                            {s.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trust Section (At Bottom) */}
                    <div className="mt-auto pt-8 border-t border-[rgba(255,255,255,0.05)] grid grid-cols-2 gap-4 opacity-70">
                        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                            <Shield className="w-4 h-4 text-[#22C55E]" />
                            <span>Medical Council Verified</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                            <Lock className="w-4 h-4 text-[#22C55E]" />
                            <span>256-bit Encryption</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#A1A1AA] col-span-2">
                            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                            <span>Privacy Compliant Platform</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE - 60% */}
            <div className="flex-1 h-full relative flex flex-col items-center p-6 md:p-8 lg:p-12 overflow-y-auto hide-scrollbar z-10">
                {/* Top Right Login Link */}
                <div className="absolute top-6 right-6 lg:top-8 lg:right-12 z-20 hidden md:flex items-center gap-2">
                    <span className="text-sm text-[#A1A1AA]">Already have an account?</span>
                    <Link href="/login/doctor" className="text-sm font-semibold text-white hover:text-[#22C55E] transition-colors flex items-center gap-1 group">
                        Sign In <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {/* Mobile Progress & Logo */}
                <div className="md:hidden w-full max-w-[640px] mb-8 shrink-0 pt-4">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center">
                                <svg className="text-white w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Vaididea</span>
                        </div>
                        <Link href="/login/doctor" className="text-sm font-medium text-[#22C55E]">Sign In</Link>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-[#A1A1AA] mb-2">
                        <span>Step {step} of 6</span>
                        <span className="font-medium text-white">{STEPS[step-1]?.title}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-[#22C55E]"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 6) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Form Container */}
                <div className="w-full max-w-[640px] relative z-10 shrink-0 md:mt-10 py-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
