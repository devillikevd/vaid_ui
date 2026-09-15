'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Sparkles,
    Users,
    Video,
    Calendar,
    Award,
    ShieldCheck,
    Mail,
    Lock,
    User,
    Phone,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    DollarSign,
    Briefcase,
    GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi, wellnessApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const STEPS = [
    { id: 1, label: 'Coach Details', desc: 'Name & Contact' },
    { id: 2, label: 'Practice & Fees', desc: 'Specialties & Rates' },
    { id: 3, label: 'Email OTP', desc: 'Verify & Submit' },
];

const BENEFITS = [
    { icon: Users,         text: 'Manage Clients & Personalized Care Plans' },
    { icon: Video,         text: '1-on-1 HD Video & Chat Consultations' },
    { icon: Calendar,      text: 'Flexible Session Scheduling' },
    { icon: Award,         text: 'Verified Practitioner Listing' },
    { icon: DollarSign,    text: 'Guaranteed Payouts & Practice Revenue' },
    { icon: ShieldCheck,   text: 'HIPAA-Compliant Encrypted System' },
];

const COACH_TYPES = [
    { id: 'yoga_coach', label: 'Yoga & Meditation Coach' },
    { id: 'fitness_trainer', label: 'Fitness & Strength Trainer' },
    { id: 'nutritionist', label: 'Diet & Nutritionist' },
    { id: 'lifestyle_coach', label: 'Holistic Lifestyle Coach' },
    { id: 'mental_wellness', label: 'Mental Wellbeing Mentor' },
];

function req(label: string) { return `${label} *`; }

export default function WellnessRegisterPage() {
    const router = useRouter();
    const { register } = useAuthStore();

    const [step, setStep] = useState(1);

    // Step 1: Basic credentials
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2: Practice & Rates
    const [coachType, setCoachType] = useState('yoga_coach');
    const [qualifications, setQualifications] = useState('');
    const [experienceYears, setExperienceYears] = useState('3');
    const [sessionFee, setSessionFee] = useState('500');
    const [headline, setHeadline] = useState('');

    // Step 3: OTP Verification
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationOtp, setVerificationOtp] = useState('');
    const [verificationInfo, setVerificationInfo] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendingOtp, setResendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // General state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => window.clearTimeout(t);
    }, [resendCooldown]);

    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Full name is required';
        else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

        if (!email.trim()) errs.email = 'Email address is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errs.email = 'Invalid email address';

        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter a valid 10-15 digit phone number';

        if (!password) errs.password = 'Password is required';
        else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errs.password = 'Must include uppercase, lowercase, and a number';

        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!qualifications.trim()) errs.qualifications = 'Please specify your qualification or certification';
        if (!experienceYears || Number(experienceYears) < 0) errs.experienceYears = 'Valid experience years required';
        if (!sessionFee || Number(sessionFee) < 0) errs.sessionFee = 'Valid session fee required';

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const goNext = async () => {
        if (step === 1) {
            if (!validateStep1()) return;
            setError('');
            setIsLoading(true);
            try {
                const checkRes = await authApi.checkDuplicate(email.trim().toLowerCase(), phone.trim());
                if (checkRes.isDuplicate) {
                    setFieldErrors((prev) => ({ ...prev, [checkRes.field || 'email']: checkRes.message || 'Already registered' }));
                    setError(checkRes.message || 'Email or phone already registered.');
                    setIsLoading(false);
                    return;
                }
                setStep(2);
            } catch {
                setError('Network error. Please try again.');
            } finally {
                setIsLoading(false);
            }
        } else if (step === 2) {
            if (!validateStep2()) return;
            setError('');
            setIsLoading(true);
            try {
                // Send OTP before step 3
                const otpRes = await authApi.sendRegistrationOtp(email.trim().toLowerCase(), name.trim(), 'wellness_coach');
                if (otpRes.success) {
                    setVerificationSent(true);
                    setVerificationInfo('A 6-digit verification code has been sent to your email.');
                    setResendCooldown(60);
                    setStep(3);
                } else {
                    setError(otpRes.message || 'Failed to dispatch verification code.');
                }
            } catch {
                setError('Network error. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resendingOtp) return;
        setResendingOtp(true);
        setVerificationError('');
        try {
            const res = await authApi.sendRegistrationOtp(email.trim().toLowerCase(), name.trim(), 'wellness_coach');
            if (res.success) {
                setVerificationInfo('A new verification code has been dispatched.');
                setResendCooldown(60);
            } else {
                setVerificationError(res.message || 'Failed to resend code.');
            }
        } catch {
            setVerificationError('Network error. Please try again.');
        } finally {
            setResendingOtp(false);
        }
    };

    const handleVerifyOtpAndRegister = async () => {
        if (!/^\d{6}$/.test(verificationOtp.trim())) {
            setVerificationError('Please enter the 6-digit verification code.');
            return;
        }

        setVerifyingOtp(true);
        setVerificationError('');
        try {
            const verifyRes = await authApi.verifyRegistrationOtp(email.trim().toLowerCase(), verificationOtp.trim());
            if (!verifyRes.success) {
                setVerificationError(verifyRes.message || verifyRes.error || 'Invalid or expired code.');
                setVerifyingOtp(false);
                return;
            }

            // Map subRole if applicable
            const validSubRoles = ['fitness_trainer', 'yoga_coach', 'nutritionist'];
            const mappedSubRole = validSubRoles.includes(coachType) ? coachType : null;

            setIsLoading(true);
            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password,
                coachTypes: [coachType],
                specialties: [coachType],
                subRole: mappedSubRole,
                qualifications: qualifications.split(',').map((q) => q.trim()).filter(Boolean),
                experienceYears: Number(experienceYears) || 0,
                sessionFee: Number(sessionFee) || 0,
                headline: headline.trim() || `${COACH_TYPES.find((c) => c.id === coachType)?.label || 'Wellness Coach'}`,
            };

            const regRes = await register(payload, 'wellness_coach');
            if (regRes.success) {
                await wellnessApi.submitCoachForApproval();
                setVerificationComplete(true);
            } else {
                setError(regRes.error || 'Registration failed. Please review your details.');
                if (regRes.fieldErrors?.length) {
                    const mapped: Record<string, string> = {};
                    regRes.fieldErrors.forEach((fe) => { mapped[fe.field] = fe.message; });
                    setFieldErrors(mapped);
                }
            }
        } catch {
            setVerificationError('Network error during registration.');
        } finally {
            setVerifyingOtp(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col lg:flex-row overflow-x-hidden font-sans text-white">
            {/* ── LEFT PANEL (Branding & Value Props) ── */}
            <div className="hidden lg:flex lg:w-[38%] relative flex-col justify-between p-10 xl:p-14 border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#0b1022] to-[#0c1638] shrink-0">
                {/* Glow & grid */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/[0.12] blur-[120px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/[0.12] blur-[110px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="well-reg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#well-reg-grid)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <Link
                        href="/"
                        aria-label="Vaididea Home"
                        className="inline-flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                    >
                        <VaidideaLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
                        <span className="text-xl font-bold tracking-tight text-white font-heading">
                            VAIDIDEA
                        </span>
                    </Link>

                    <div className="mt-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
                            <Sparkles className="w-3.5 h-3.5" />
                            Wellness Coach Partner
                        </div>

                        <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 font-heading">
                            Join Vaididea as a Wellness Coach
                        </h1>

                        <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8 max-w-sm">
                            Build trusted wellness relationships with your clients, run 1-on-1 consultations, and grow your digital coaching practice.
                        </p>

                        <div className="space-y-4 max-w-sm">
                            {BENEFITS.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-[#D4D4D8]">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-indigo-400">
                                        <item.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="relative z-10 pt-8 border-t border-white/[0.06]">
                    <div className="space-y-3">
                        {STEPS.map((s) => (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step > s.id
                                        ? 'bg-indigo-500 text-white'
                                        : step === s.id
                                        ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-400'
                                        : 'bg-white/[0.04] border border-white/[0.1] text-[#71717A]'
                                }`}>
                                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold ${step >= s.id ? 'text-white' : 'text-[#71717A]'}`}>{s.label}</p>
                                    <p className="text-[11px] text-[#71717A]">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL (Multi-Step Form) ── */}
            <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-14 max-w-xl mx-auto w-full">
                {/* Top Nav */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/login/wellness"
                        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Sign In</span>
                    </Link>

                    <div className="text-xs text-[#71717A]">
                        Step <span className="text-indigo-400 font-semibold">{step}</span> of 3
                    </div>
                </div>

                {/* Success View */}
                {verificationComplete ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center space-y-5"
                    >
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-heading">Application Under Review</h2>
                            <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
                                Welcome, <strong>{name}</strong>! Your coach profile has been registered and submitted for verification by our clinical quality team.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={() => router.push('/login/wellness')}
                                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                            >
                                Track Status / Sign In
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
                                Step {step}: {STEPS[step - 1].label}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
                                {step === 1 ? 'Coach Profile & Credentials' : step === 2 ? 'Specialization & Session Rates' : 'Email OTP Verification'}
                            </h2>
                            <p className="text-sm text-[#A1A1AA] mt-1">
                                {step === 1
                                    ? 'Enter your name, contact email, phone, and secure password.'
                                    : step === 2
                                    ? 'Set your coaching specialty, qualifications, experience, and fee.'
                                    : `Enter the 6-digit verification code sent to ${email}.`}
                            </p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* ── STEP 1: Basic Info ── */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Full Name')}</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="e.g. Coach Vikram Rao"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                            />
                                        </div>
                                        {fieldErrors.name && <p className="text-xs text-rose-400 mt-1">{fieldErrors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Email Address')}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="email"
                                                    placeholder="vikram@wellness.org"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                            </div>
                                            {fieldErrors.email && <p className="text-xs text-rose-400 mt-1">{fieldErrors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Contact Phone')}</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="tel"
                                                    placeholder="+91 98765 43210"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                            </div>
                                            {fieldErrors.phone && <p className="text-xs text-rose-400 mt-1">{fieldErrors.phone}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Password')}</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="At least 8 chars"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {fieldErrors.password && <p className="text-xs text-rose-400 mt-1">{fieldErrors.password}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Confirm Password')}</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Re-enter password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                            </div>
                                            {fieldErrors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{fieldErrors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 2: Practice & Fees ── */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Primary Specialty / Role')}</label>
                                        <select
                                            value={coachType}
                                            onChange={(e) => setCoachType(e.target.value)}
                                            className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        >
                                            {COACH_TYPES.map((ct) => (
                                                <option key={ct.id} value={ct.id} className="bg-[#09090B] text-white">
                                                    {ct.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Qualifications / Certifications')}</label>
                                        <div className="relative">
                                            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="e.g. Certified Yoga Master, MSc Clinical Nutrition, ACE-CPT"
                                                value={qualifications}
                                                onChange={(e) => setQualifications(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                            />
                                        </div>
                                        {fieldErrors.qualifications && <p className="text-xs text-rose-400 mt-1">{fieldErrors.qualifications}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Experience (Years)')}</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="3"
                                                    value={experienceYears}
                                                    onChange={(e) => setExperienceYears(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                            </div>
                                            {fieldErrors.experienceYears && <p className="text-xs text-rose-400 mt-1">{fieldErrors.experienceYears}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Session Fee (₹)')}</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="500"
                                                    value={sessionFee}
                                                    onChange={(e) => setSessionFee(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                                />
                                            </div>
                                            {fieldErrors.sessionFee && <p className="text-xs text-rose-400 mt-1">{fieldErrors.sessionFee}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Professional Headline / Bio</label>
                                        <Input
                                            placeholder="e.g. Holistic Yoga Coach helping working professionals manage stress and posture"
                                            value={headline}
                                            onChange={(e) => setHeadline(e.target.value)}
                                            className="h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-indigo-500"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 3: Email OTP ── */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-white">Email OTP Verification</h3>
                                                <p className="text-xs text-[#A1A1AA] mt-0.5">
                                                    Enter the 6-digit verification code sent to <strong>{email}</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {verificationInfo && (
                                            <p className="text-xs text-indigo-400">{verificationInfo}</p>
                                        )}
                                        {verificationError && (
                                            <p className="text-xs text-rose-400">{verificationError}</p>
                                        )}

                                        <div className="space-y-3 pt-2">
                                            <div>
                                                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Enter 6-Digit Code</label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    inputMode="numeric"
                                                    placeholder="••••••"
                                                    value={verificationOtp}
                                                    onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full h-11 px-4 text-center tracking-widest text-lg font-mono rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-[#52525B] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-[#71717A]">
                                                <span>Didn&apos;t receive code?</span>
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    disabled={resendingOtp || resendCooldown > 0}
                                                    className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 cursor-pointer"
                                                >
                                                    {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action Buttons */}
                        <div className="pt-4 flex items-center justify-between gap-3">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => s - 1)}
                                    className="px-5 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-sm font-semibold text-[#D4D4D8] transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    disabled={isLoading}
                                    className="px-6 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleVerifyOtpAndRegister}
                                    disabled={verificationOtp.length !== 6 || verifyingOtp || isLoading}
                                    className="flex-1 max-w-xs h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {verifyingOtp || isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...</>
                                    ) : (
                                        'Submit Application'
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Sign in footer */}
                        <div className="pt-6 border-t border-white/[0.06] text-center">
                            <p className="text-xs text-[#71717A]">
                                Already have a coach account?{' '}
                                <Link
                                    href="/login/wellness"
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                                >
                                    Sign In here &rarr;
                                </Link>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
