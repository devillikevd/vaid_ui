'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import { ProviderSelectionLink } from '@/components/shared/ProviderSelectionLink';
import {
    HeartPulse,
    Calendar,
    FileText,
    Pill,
    CreditCard,
    ShieldCheck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    User,
} from 'lucide-react';
import { useAuthStore, ROLE_HOME_ROUTES } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { doesRoleMatchPortal, getSafeRedirectUrl } from '@/lib/roles';

const FEATURES = [
    { icon: Calendar, text: 'Doctor Appointments & Video Consultations' },
    { icon: FileText, text: 'Digital Health Records & Lab Reports' },
    { icon: Pill, text: 'Prescription Refills & Pharmacy Orders' },
    { icon: CreditCard, text: 'Universal ABHA Digital Health Card' },
    { icon: HeartPulse, text: 'Vitals Tracking & Wellness Programs' },
    { icon: ShieldCheck, text: 'End-to-End Encrypted Health Records' },
];

export default function PatientLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpiredRedirect = searchParams.get('expired') === '1';
    const { login, isAuthenticated, user, _hasHydrated } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const [resendingVerification, setResendingVerification] = useState(false);
    const [verificationResent, setVerificationResent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verificationOtp, setVerificationOtp] = useState('');
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState(false);

    useEffect(() => {
        if (_hasHydrated && isAuthenticated && doesRoleMatchPortal(user?.role, 'patient')) {
            const redirectParam = searchParams.get('redirect');
            const target = getSafeRedirectUrl(redirectParam, ROLE_HOME_ROUTES['patient']);
            router.replace(target);
        }
    }, [_hasHydrated, isAuthenticated, user, searchParams, router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailNotVerified(false);
        setVerificationResent(false);
        setVerificationComplete(false);
        setIsLoading(true);
        try {
            const result = await login(email.trim(), password, 'patient', rememberMe);
            if (result.success) {
                const redirectParam = searchParams.get('redirect');
                const target = getSafeRedirectUrl(redirectParam, ROLE_HOME_ROUTES['patient']);
                router.replace(target);
            } else {
                if (result.code === 'EMAIL_NOT_VERIFIED') setEmailNotVerified(true);
                setError(result.error || 'Login failed. Please check your credentials.');
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (resendCooldown > 0) return;
        if (!email.trim()) { setError('Enter your email address first.'); return; }
        setResendingVerification(true);
        try {
            const result = await authApi.resendVerification(email.trim());
            if (result.success) {
                setVerificationResent(true);
                setError('');
                setVerificationComplete(false);
                setResendCooldown(60);
            } else {
                setError(result.message || 'Failed to resend verification code');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setResendingVerification(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!email.trim()) { setError('Enter your email address first.'); return; }
        if (!/^\d{6}$/.test(verificationOtp.trim())) { setError('Enter the 6-digit code from your email.'); return; }
        setVerifyingOtp(true);
        try {
            const result = await authApi.verifyEmailOtp(email.trim(), verificationOtp.trim());
            if (result.success) {
                setVerificationComplete(true);
                setEmailNotVerified(false);
                setVerificationResent(false);
                setError('');
            } else {
                setError(result.message || 'Verification failed.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col md:flex-row overflow-x-hidden font-sans">
            {/* ── LEFT PANEL (Desktop Hero) ── */}
            <div className="hidden md:flex w-[42%] lg:w-[45%] relative flex-col border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#091512] to-[#07241c]">
                {/* Glow layers */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[65%] rounded-full bg-emerald-500/[0.09] blur-[110px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[55%] h-[55%] rounded-full bg-teal-500/[0.09] blur-[100px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="patient-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#patient-grid)" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12">
                    {/* Brand */}
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

                    {/* Main pitch */}
                    <div className="my-auto py-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
                            <User className="w-3.5 h-3.5" />
                            Patient Health Portal
                        </div>

                        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 font-heading">
                            Your Personal Healthcare Journey, Simplified
                        </h1>

                        <p className="text-sm lg:text-base text-[#A1A1AA] leading-relaxed mb-8 max-w-md">
                            Access appointments, health records, prescriptions, digital health cards, and personalized care from top medical specialists.
                        </p>

                        <div className="grid grid-cols-1 gap-3.5 max-w-md">
                            {FEATURES.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.08 }}
                                    className="flex items-center gap-3 text-sm text-[#D4D4D8]"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-emerald-400">
                                        <item.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span>{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Trust Badge */}
                    <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#71717A]">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>100% Encrypted &amp; HIPAA Compliant</span>
                        </div>
                        <span>ABDM Integrated</span>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL (Auth Form) ── */}
            <div className="flex-1 flex flex-col justify-center relative p-6 sm:p-10 lg:p-16 min-h-screen">
                {/* Header Navigation */}
                <div className="w-full max-w-md mx-auto mb-6 flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Vaididea</span>
                    </Link>
                    <ProviderSelectionLink />
                </div>

                <div className="w-full max-w-md mx-auto">
                    {/* Session Expired Banner */}
                    {isExpiredRedirect && (
                        <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span>Your session has expired. Please sign in again to continue.</span>
                        </div>
                    )}

                    {/* Welcome Header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-inner">
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
                            Welcome Back
                        </h2>
                        <p className="text-sm text-[#A1A1AA] mt-1.5">
                            Continue your healthcare journey with Vaididea.
                        </p>
                    </div>

                    {/* Verification Complete Banner */}
                    {verificationComplete && (
                        <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Email verified successfully! Please enter your password to sign in.</span>
                        </div>
                    )}

                    {/* Unverified Email Overlay */}
                    {emailNotVerified ? (
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Email Verification Required</h3>
                                    <p className="text-xs text-[#A1A1AA] mt-1">
                                        Your account email has not been verified yet. Enter the 6-digit code sent to <strong>{email}</strong>.
                                    </p>
                                </div>
                            </div>

                            {verificationResent && (
                                <p className="text-xs text-emerald-400">A new verification code has been dispatched to your email.</p>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Verification Code</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="Enter 6-digit code"
                                    value={verificationOtp}
                                    onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full h-11 px-4 text-center tracking-widest text-lg font-mono rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-[#52525B] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-rose-400">{error}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={verifyingOtp || verificationOtp.length !== 6}
                                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendingVerification || resendCooldown > 0}
                                    className="px-4 h-11 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-[#D4D4D8] transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {resendingVerification ? 'Sending...' : resendCooldown > 0 ? `${resendCooldown}s` : 'Resend'}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEmailNotVerified(false)}
                                className="w-full text-center text-xs text-[#71717A] hover:text-white transition-colors cursor-pointer"
                            >
                                Back to Password Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email / Mobile */}
                            <div>
                                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                    <input
                                        type="email"
                                        required
                                        autoComplete="email"
                                        placeholder="patient@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm placeholder:text-[#52525B] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-medium text-[#D4D4D8]">Password</label>
                                    <Link
                                        href="/forgot-password/patient"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm placeholder:text-[#52525B] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors cursor-pointer"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.05] text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0 accent-emerald-500"
                                    />
                                    <span className="text-xs text-[#A1A1AA]">Keep me signed in</span>
                                </label>
                            </div>

                            {/* Error Banner */}
                            {error && (
                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Signing In...</>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    )}

                    {/* Register Footer */}
                    <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
                        <p className="text-xs text-[#71717A]">
                            Don&apos;t have a patient account?{' '}
                            <Link
                                href="/register/patient"
                                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors inline-flex items-center gap-0.5"
                            >
                                Create Patient Account &rarr;
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
