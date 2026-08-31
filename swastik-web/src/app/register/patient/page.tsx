'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    HeartPulse,
    Calendar,
    FileText,
    Pill,
    CreditCard,
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const STEPS = [
    { id: 1, label: 'Profile Info', desc: 'Basic Details' },
    { id: 2, label: 'Email OTP', desc: 'Verify & Activate' },
];

const BENEFITS = [
    { icon: Calendar,    text: 'Doctor Appointments & Video Consultations' },
    { icon: FileText,    text: 'Access Lab Reports & Medical Records' },
    { icon: Pill,        text: 'Order Medicines & Health Products' },
    { icon: CreditCard,  text: 'Digital Health Card & ABHA Health ID' },
    { icon: HeartPulse,  text: 'Personalized Care & Health Tracking' },
    { icon: ShieldCheck, text: 'Secure & Private Health Data' },
];

function req(label: string) { return `${label} *`; }

export default function PatientRegisterPage() {
    const router = useRouter();
    const { register } = useAuthStore();

    const [step, setStep] = useState(1);

    // Step 1 Form Fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('male');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 OTP Fields
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

        if (!phone.trim()) errs.phone = 'Mobile number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter a valid 10-15 digit phone number';

        if (!password) errs.password = 'Password is required';
        else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errs.password = 'Must include uppercase, lowercase, and a number';

        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

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

                // Send OTP automatically when moving to Step 2
                const otpRes = await authApi.sendRegistrationOtp(email.trim().toLowerCase(), name.trim(), 'patient');
                if (otpRes.success) {
                    setVerificationSent(true);
                    setVerificationInfo('A 6-digit verification code has been sent to your email.');
                    setResendCooldown(60);
                    setStep(2);
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
            const res = await authApi.sendRegistrationOtp(email.trim().toLowerCase(), name.trim(), 'patient');
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

            // Create patient account
            setIsLoading(true);
            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password,
                gender,
                dateOfBirth: dateOfBirth || null,
            };

            const regRes = await register(payload, 'patient');
            if (regRes.success) {
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
            <div className="hidden lg:flex lg:w-[38%] relative flex-col justify-between p-10 xl:p-14 border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#091512] to-[#07241c] shrink-0">
                {/* Glow & grid */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-500/[0.09] blur-[120px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-500/[0.09] blur-[110px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="pat-reg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#pat-reg-grid)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <Link
                        href="/"
                        aria-label="Vaididea Home"
                        className="inline-flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
                    >
                        <VaidideaLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
                        <span className="text-xl font-bold tracking-tight text-white font-heading">
                            VAIDIDEA
                        </span>
                    </Link>

                    <div className="mt-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
                            <User className="w-3.5 h-3.5" />
                            Patient Health Network
                        </div>

                        <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 font-heading">
                            Create Your Vaididea Account
                        </h1>

                        <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8 max-w-sm">
                            Your connected healthcare journey starts here. Access verified doctors, lab tests, prescriptions, and health records.
                        </p>

                        <div className="space-y-4 max-w-sm">
                            {BENEFITS.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-[#D4D4D8]">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-emerald-400">
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
                                        ? 'bg-emerald-500 text-black'
                                        : step === s.id
                                        ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
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
                        href="/login/patient"
                        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Sign In</span>
                    </Link>

                    <div className="text-xs text-[#71717A]">
                        Step <span className="text-emerald-400 font-semibold">{step}</span> of 2
                    </div>
                </div>

                {/* Success View */}
                {verificationComplete ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center space-y-5"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-heading">Account Created Successfully</h2>
                            <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
                                Welcome to Vaididea, <strong>{name}</strong>! Your personal patient health profile is ready.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={() => router.push('/patient')}
                                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                            >
                                Go to Patient Portal
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
                                Step {step}: {STEPS[step - 1].label}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
                                {step === 1 ? 'Personal Information' : 'Email Verification'}
                            </h2>
                            <p className="text-sm text-[#A1A1AA] mt-1">
                                {step === 1
                                    ? 'Enter your name, contact details, and password.'
                                    : `Enter the 6-digit code sent to ${email}.`}
                            </p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* ── STEP 1: Profile Information ── */}
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
                                                placeholder="e.g. Ananya Sharma"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
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
                                                    placeholder="ananya@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
                                                />
                                            </div>
                                            {fieldErrors.email && <p className="text-xs text-rose-400 mt-1">{fieldErrors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Mobile Phone')}</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="tel"
                                                    placeholder="+91 98765 43210"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
                                                />
                                            </div>
                                            {fieldErrors.phone && <p className="text-xs text-rose-400 mt-1">{fieldErrors.phone}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Date of Birth</label>
                                            <Input
                                                type="date"
                                                value={dateOfBirth}
                                                onChange={(e) => setDateOfBirth(e.target.value)}
                                                className="h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Gender</label>
                                            <select
                                                value={gender}
                                                onChange={(e) => setGender(e.target.value)}
                                                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="male" className="bg-[#09090B] text-white">Male</option>
                                                <option value="female" className="bg-[#09090B] text-white">Female</option>
                                                <option value="other" className="bg-[#09090B] text-white">Other</option>
                                            </select>
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
                                                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
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
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-emerald-500"
                                                />
                                            </div>
                                            {fieldErrors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{fieldErrors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 2: Email OTP ── */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
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
                                            <p className="text-xs text-emerald-400">{verificationInfo}</p>
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
                                                    className="w-full h-11 px-4 text-center tracking-widest text-lg font-mono rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-[#52525B] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-[#71717A]">
                                                <span>Didn&apos;t receive code?</span>
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    disabled={resendingOtp || resendCooldown > 0}
                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 cursor-pointer"
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
                                    onClick={() => setStep(1)}
                                    className="px-5 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-sm font-semibold text-[#D4D4D8] transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step === 1 ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    disabled={isLoading}
                                    className="px-6 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleVerifyOtpAndRegister}
                                    disabled={verificationOtp.length !== 6 || verifyingOtp || isLoading}
                                    className="flex-1 max-w-xs h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {verifyingOtp || isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Sign in footer */}
                        <div className="pt-6 border-t border-white/[0.06] text-center">
                            <p className="text-xs text-[#71717A]">
                                Already have a patient account?{' '}
                                <Link
                                    href="/login/patient"
                                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
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
