'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Pill,
    ShieldCheck,
    ClipboardList,
    Package,
    Truck,
    Activity,
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
    { icon: Package, text: 'Manage Inventory' },
    { icon: ClipboardList, text: 'Process Prescriptions' },
    { icon: Truck, text: 'Order Fulfillment' },
    { icon: Activity, text: 'Connected Care Network' },
    { icon: ShieldCheck, text: 'Secure Healthcare Data' },
];

export default function PharmacyLoginPage() {
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
        if (_hasHydrated && isAuthenticated && user?.role &&
            ['pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff'].includes(user.role)) {
            router.replace(ROLE_HOME_ROUTES['pharmacy_owner']);
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
            // Try pharmacy_owner first (most common); if role mismatch, fall back to member roles.
            // The auth store's login() validates the returned role matches the expected role.
            // For pharmacy members, the backend returns 'pharmacy_manager' or 'pharmacy_staff',
            // but we must try each accepted role so the role check in login() passes.
            let result = await login(email.trim(), password, 'pharmacy_owner', rememberMe);

            if (!result.success && result.error?.includes('role')) {
                // Owner role mismatch — try manager
                result = await login(email.trim(), password, 'pharmacy_manager', rememberMe);
            }
            if (!result.success && result.error?.includes('role')) {
                // Manager role mismatch — try staff
                result = await login(email.trim(), password, 'pharmacy_staff', rememberMe);
            }

            if (result.success) {
                router.push(ROLE_HOME_ROUTES['pharmacy_owner']);
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
            <div className="hidden md:flex w-[42%] lg:w-[45%] relative flex-col border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#1a110a] to-[#26150a]">
                {/* Glow layers */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[65%] rounded-full bg-orange-500/[0.07] blur-[110px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[55%] h-[55%] rounded-full bg-amber-500/[0.07] blur-[100px]" />
                    <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-orange-500/[0.04] blur-[80px]" />
                    {/* Subtle grid pattern */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="pharmacy-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#pharmacy-grid)" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex-1 flex flex-col justify-center max-w-[420px] mx-auto w-full pt-12">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-6">
                                <Pill className="w-3.5 h-3.5" />
                                <span>Pharmacy Portal</span>
                            </div>
                            <h1 className="text-4xl lg:text-[44px] font-bold tracking-tight text-white leading-[1.1] mb-5">
                                Welcome to Vaididea<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                                    Pharmacy Network
                                </span>
                            </h1>
                            <p className="text-[#A1A1AA] text-base lg:text-lg leading-relaxed mb-10 max-w-[380px]">
                                Manage prescriptions, track inventory, and seamlessly connect with doctors and patients in one unified platform.
                            </p>
                            
                            <div className="grid grid-cols-1 gap-5">
                                {FEATURES.map((feature, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.3 + (idx * 0.08), ease: [0.16, 1, 0.3, 1] }}
                                        className="flex items-center gap-4 group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#A1A1AA] group-hover:text-orange-400 group-hover:bg-orange-500/10 group-hover:border-orange-500/20 transition-all duration-300 shadow-sm">
                                            <feature.icon className="w-4.5 h-4.5" />
                                        </div>
                                        <span className="text-[15px] font-medium text-gray-300 group-hover:text-white transition-colors duration-300">{feature.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <div className="mt-12 flex items-center gap-6 text-sm font-medium text-[#A1A1AA]">
                        <Link href="/" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </Link>
                        <span className="text-white/20">•</span>
                        <Link href="/contact" className="hover:text-white transition-colors">Support</Link>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL (Auth Form) ── */}
            <div className="flex-1 flex flex-col relative min-h-[100dvh] md:min-h-0 bg-[#09090B]">
                <div className="absolute inset-0 md:hidden overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[40%] rounded-full bg-orange-500/[0.06] blur-[100px]" />
                </div>

                <div className="p-6 flex justify-between items-center relative z-20 md:hidden">
                    <div className="flex items-center gap-2.5">
                        <VaidideaLogo className="w-8 h-8" />
                        <span className="text-xl font-bold text-white tracking-tight">Vaididea</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-semibold">
                        <Pill className="w-3 h-3" />
                        <span>Pharmacy</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-[400px]"
                    >
                        <div className="mb-8">
                            <h2 className="text-[28px] font-bold text-white tracking-tight mb-2">Welcome Back</h2>
                            <p className="text-[#A1A1AA] text-[15px]">Sign in to your Pharmacy account</p>
                        </div>

                        {/* EXPIRED SESSION ALERT */}
                        {isExpiredRedirect && !error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
                                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                                    <div className="p-1 rounded-full bg-orange-500/20 mt-0.5"><Lock className="w-3.5 h-3.5 text-orange-400" /></div>
                                    <div>
                                        <h4 className="text-[13px] font-semibold text-orange-400 mb-0.5">Session Expired</h4>
                                        <p className="text-[13px] text-orange-400/80 leading-relaxed">For your security, please sign in again.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ERROR ALERT */}
                        {error && !emailNotVerified && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
                                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                    <div className="text-red-400 text-[13px] font-medium leading-relaxed">{error}</div>
                                </div>
                            </motion.div>
                        )}

                        {/* EMAIL VERIFICATION FLOW */}
                        {emailNotVerified && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-5 rounded-2xl bg-[#121214] border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-orange-400" /> Verify your email
                                </h3>
                                <p className="text-[13px] text-[#A1A1AA] mb-4">
                                    Your email hasn't been verified yet. We need to verify it before you can log in.
                                </p>
                                
                                {!verificationResent ? (
                                    <button
                                        onClick={handleResendVerification}
                                        disabled={resendingVerification || resendCooldown > 0}
                                        className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {resendingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        {resendCooldown > 0 ? `Wait ${resendCooldown}s to resend` : 'Send verification code'}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[13px] text-orange-400">
                                            We've sent a 6-digit code to <strong>{email}</strong>
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="Enter 6-digit code"
                                                value={verificationOtp}
                                                onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                                className="w-full h-11 px-4 bg-black/40 border border-white/[0.08] rounded-xl text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-center tracking-widest"
                                            />
                                        </div>
                                        {error && <div className="text-red-400 text-xs font-medium text-center">{error}</div>}
                                        <button
                                            onClick={handleVerifyOtp}
                                            disabled={verifyingOtp || verificationOtp.length !== 6}
                                            className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-orange-600"
                                        >
                                            {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
                                        </button>
                                        
                                        <button
                                            onClick={handleResendVerification}
                                            disabled={resendingVerification || resendCooldown > 0}
                                            className="w-full h-9 text-[12px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
                                        >
                                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive it? Resend"}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {verificationComplete && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <div className="text-green-500 text-[13px] font-medium">Email verified successfully! You can now sign in.</div>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-gray-300 ml-1">Email address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-400 transition-colors">
                                        <Mail className="w-4.5 h-4.5" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-12 pl-11 pr-4 bg-[#121214] border border-white/[0.08] rounded-xl text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-gray-300 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-400 transition-colors">
                                        <Lock className="w-4.5 h-4.5" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-11 pr-12 bg-[#121214] border border-white/[0.08] rounded-xl text-white text-[15px] placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 rounded-[6px] border border-white/[0.15] bg-[#121214] peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40 group-hover:border-white/30" />
                                        <CheckCircle2 className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                                    </div>
                                    <span className="text-[13px] text-gray-400 group-hover:text-gray-300 transition-colors select-none">Remember me</span>
                                </label>
                                <Link 
                                    href="/forgot-password/pharmacy" 
                                    className="text-[13px] font-medium text-orange-400 hover:text-orange-300 transition-colors"
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || emailNotVerified}
                                className="w-full h-12 mt-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-orange-600 active:scale-[0.98] shadow-[0_4px_14px_rgba(234,88,12,0.2)]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <span>Sign in securely</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
                            <p className="text-[13.5px] text-[#A1A1AA]">
                                Don't have a Pharmacy account?{' '}
                                <Link href="/register/pharmacy" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                                    Create Pharmacy Account
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
