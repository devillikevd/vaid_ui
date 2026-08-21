'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Microscope,
    Users,
    Calendar,
    ClipboardList,
    Building2,
    ShieldCheck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
    CheckCircle2,
} from 'lucide-react';
import { useAuthStore, ROLE_HOME_ROUTES } from '@/stores/authStore';
import { authApi } from '@/lib/api';

const FEATURES = [
    { icon: Microscope, text: 'Advanced Test Management' },
    { icon: Calendar, text: 'Home Collection Scheduling' },
    { icon: ClipboardList, text: 'Patient Reports & Results' },
    { icon: Users, text: 'Staff & Technician Access' },
    { icon: ShieldCheck, text: 'Secure Healthcare Records' },
];

export default function DiagnosticLoginPage() {
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
        if (_hasHydrated && isAuthenticated && user?.role === 'diagnostic_center_owner') {
            router.replace(ROLE_HOME_ROUTES['diagnostic_center_owner']);
        }
    }, [_hasHydrated, isAuthenticated, user, router]);

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
            const result = await login(email.trim(), password, 'diagnostic_center_owner', rememberMe);
            if (result.success) {
                router.push(ROLE_HOME_ROUTES['diagnostic_center_owner']);
            } else {
                if (result.code === 'EMAIL_NOT_VERIFIED') setEmailNotVerified(true);
                setError(result.error || 'Login failed');
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
        } catch { setError('Network error. Please try again.'); }
        finally { setResendingVerification(false); }
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
            } else { setError(result.message || 'Verification failed.'); }
        } catch { setError('Network error. Please try again.'); }
        finally { setVerifyingOtp(false); }
    };

    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col md:flex-row overflow-x-hidden font-sans">
            {/* ── LEFT PANEL (desktop only) ── */}
            <div className="hidden md:flex w-[42%] lg:w-[45%] relative flex-col border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#0D0B12] to-[#160B21]">
                {/* Glow layers */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[65%] rounded-full bg-[#7A42A8]/[0.07] blur-[110px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[55%] h-[55%] rounded-full bg-[#5B2A86]/[0.07] blur-[100px]" />
                    <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-[#7A42A8]/[0.04] blur-[80px]" />
                    {/* Subtle grid pattern */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="diagnostic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diagnostic-grid)" />
                    </svg>
                </div>

                {/* Scrollable inner */}
                <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    <div>
                        <div className="flex items-center justify-between mb-8 lg:mb-10">
                            <div className="flex items-center gap-2.5">
                                <VaidideaLogo className="w-9 h-9" />
                                <span className="text-xl font-bold text-white tracking-tight">Vaididea</span>
                            </div>
                            <Link href="/" className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Portal Selection</span>
                            </Link>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#7A42A8]/20 bg-[#5B2A86]/[0.06] mb-5">
                                <Microscope className="w-3 h-3 text-[#9D5BE0]" />
                                <span className="text-[11px] font-semibold text-[#9D5BE0] tracking-widest uppercase">Diagnostic Center Portal</span>
                            </div>

                            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-[1.2] tracking-tight mb-3">
                                Welcome to Vaididea<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D5BE0] to-[#7A42A8]">Diagnostic Portal</span>
                            </h1>

                            <p className="text-[#A1A1AA] text-sm lg:text-base leading-relaxed mb-6 lg:mb-8 max-w-xs">
                                Powering smarter diagnostic care. Manage tests, bookings, home collection and patient reports from one connected diagnostic platform.
                            </p>

                            <div className="space-y-2 lg:space-y-2.5">
                                {FEATURES.map((feature, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.15 + idx * 0.07 }}
                                        className="flex items-center gap-3 text-[#A1A1AA] hover:text-white transition-colors group"
                                    >
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center group-hover:bg-[#5B2A86]/10 group-hover:border-[#7A42A8]/20 transition-colors">
                                            <feature.icon className="w-3.5 h-3.5 text-[#9D5BE0]" />
                                        </div>
                                        <span className="font-medium text-sm">{feature.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <p className="text-xs text-[#A1A1AA]/40 mt-6 shrink-0">
                        &copy; {new Date().getFullYear()} Vaididea Healthcare Pvt. Ltd.
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex items-center justify-center p-5 sm:p-10 relative overflow-y-auto">
                <div className="md:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[10%] w-[80%] h-[50%] rounded-full bg-[#5B2A86]/[0.07] blur-[100px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45 }}
                    className="w-full max-w-[420px] relative z-10 py-8 md:py-0"
                >
                    <div className="md:hidden flex flex-col items-center gap-3 mb-7">
                        <div className="flex items-center gap-2.5">
                            <VaidideaLogo className="w-8 h-8" />
                            <span className="text-lg font-bold text-white tracking-tight">Vaididea</span>
                        </div>
                        <Link href="/" className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to portal selection
                        </Link>
                    </div>

                    <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-7 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B2A86]/20 to-[#7A42A8]/20 border border-[#7A42A8]/20 flex items-center justify-center shrink-0">
                                <Microscope className="w-4.5 h-4.5 text-[#9D5BE0]" style={{ width: '18px', height: '18px' }} />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">Welcome Back</h2>
                                <p className="text-[#A1A1AA] text-xs">Sign in to your diagnostic portal</p>
                            </div>
                        </div>

                        {isExpiredRedirect && !error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                                Your session has expired. Please sign in again.
                            </motion.div>
                        )}
                        {verificationResent && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="mb-4 p-3 rounded-xl bg-[#7A42A8]/10 border border-[#7A42A8]/20 text-[#9D5BE0] text-xs font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                Verification code sent. Check your inbox.
                            </motion.div>
                        )}
                        {verificationComplete && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                Email verified. You can now sign in.
                            </motion.div>
                        )}
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
                                <p className="text-[#EF4444] text-xs font-medium">{error}</p>
                                {emailNotVerified && email && (
                                    <button type="button" onClick={handleResendVerification}
                                        disabled={resendingVerification || resendCooldown > 0}
                                        className="mt-2 inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium disabled:opacity-50 transition-colors">
                                        <Mail className="w-3.5 h-3.5" />
                                        {resendingVerification ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {emailNotVerified && (
                            <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <div>
                                    <p className="text-sm font-semibold text-white/90">Verify your email</p>
                                    <p className="mt-0.5 text-xs text-white/50">Enter the 6-digit code sent to your email.</p>
                                </div>
                                <input
                                    type="text"
                                    value={verificationOtp}
                                    onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7A42A8]/40 focus:border-[#7A42A8] transition-all tracking-[0.3em] font-mono"
                                />
                                <button type="button" disabled={verifyingOtp} onClick={handleVerifyOtp}
                                    className="w-full flex items-center justify-center gap-2 bg-[#5B2A86]/10 border border-[#5B2A86]/20 hover:bg-[#5B2A86]/20 text-[#9D5BE0] py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                                    {verifyingOtp ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></> : 'Verify Email'}
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                            <div className="space-y-1.5">
                                <label htmlFor="diagnostic-email" className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail className="h-[17px] w-[17px] text-[#A1A1AA] group-focus-within:text-[#9D5BE0] transition-colors" />
                                    </div>
                                    <input
                                        id="diagnostic-email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setVerificationComplete(false); }}
                                        className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-2.5 pl-[40px] pr-4 text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7A42A8]/40 focus:border-[#7A42A8] transition-all hover:border-[rgba(255,255,255,0.18)]"
                                        placeholder="center@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="diagnostic-password" className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Password</label>
                                    <Link href="/forgot-password/diagnostic-center" className="text-[11px] text-[#9D5BE0] hover:text-[#B27AE8] transition-colors font-semibold">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-[17px] w-[17px] text-[#A1A1AA] group-focus-within:text-[#9D5BE0] transition-colors" />
                                    </div>
                                    <input
                                        id="diagnostic-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-2.5 pl-[40px] pr-10 text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#7A42A8]/40 focus:border-[#7A42A8] transition-all hover:border-[rgba(255,255,255,0.18)]"
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A1A1AA] hover:text-white transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center py-0.5">
                                <input
                                    id="diagnostic-remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-[#7A42A8] focus:ring-[#7A42A8] focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="diagnostic-remember-me" className="ml-2 block text-xs text-[#A1A1AA] cursor-pointer hover:text-white transition-colors">
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] text-white py-2.5 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_18px_rgba(122,66,168,0.22)] hover:shadow-[0_0_26px_rgba(122,66,168,0.38)] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                            >
                                {isLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in...</span></>
                                ) : (
                                    <span>Sign In</span>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="mt-4 text-center text-[13px] text-[#A1A1AA]">
                        Don't have a diagnostic account?{' '}
                        <Link href="/register/diagnostic-center" className="font-semibold text-white hover:text-[#9D5BE0] transition-colors inline-flex items-center gap-1 group">
                            Register Diagnostic Center
                            <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
