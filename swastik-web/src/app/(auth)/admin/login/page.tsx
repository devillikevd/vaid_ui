'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Shield,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore, ROLE_HOME_ROUTES } from '@/stores/authStore';
import { authApi } from '@/lib/api';

const ADMIN_CONFIG = {
    role: 'admin',
    title: 'Admin Portal',
    subtitle: 'Platform control center',
    icon: Shield,
} as const;

export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpiredRedirect = searchParams.get('expired') === '1';
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const [resendingVerification, setResendingVerification] = useState(false);
    const [verificationResent, setVerificationResent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verificationOtp, setVerificationOtp] = useState('');
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState(false);

    // Cooldown timer for resend verification
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const Icon = ADMIN_CONFIG.icon;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailNotVerified(false);
        setVerificationResent(false);
        setVerificationComplete(false);
        setIsLoading(true);

        try {
            const result = await login(email.trim(), password, ADMIN_CONFIG.role, rememberMe);

            if (result.success) {
                router.push(ROLE_HOME_ROUTES[ADMIN_CONFIG.role]);
            } else {
                if (result.code === 'EMAIL_NOT_VERIFIED') {
                    setEmailNotVerified(true);
                }
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (resendCooldown > 0) return;
        if (!email.trim()) {
            setError('Enter your email address first so we know where to resend the verification code.');
            return;
        }
        setResendingVerification(true);
        try {
            const result = await authApi.resendVerification(email.trim());
            if (result.success) {
                setVerificationResent(true);
                setError('');
                setVerificationComplete(false);
                setResendCooldown(60); // 60 second cooldown
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
        if (!email.trim()) {
            setError('Enter your email address first.');
            return;
        }
        if (!/^\d{6}$/.test(verificationOtp.trim())) {
            setError('Enter the 6-digit verification code from your email.');
            return;
        }

        setVerifyingOtp(true);
        try {
            const result = await authApi.verifyEmailOtp(email.trim(), verificationOtp.trim());
            if (result.success) {
                setVerificationComplete(true);
                setEmailNotVerified(false);
                setVerificationResent(false);
                setError('');
            } else {
                setError(result.message || 'Verification failed. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#050505] overflow-hidden font-sans text-slate-200 py-12 px-4">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
            </div>

            <div className="w-full max-w-lg z-10 flex flex-col items-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Homepage</span>
                </Link>

                <div className="flex justify-center transition-colors duration-500 relative group w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/30 to-indigo-800/30 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col gap-6 transition-all duration-500 [&_label]:!text-white/60 [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-white/[0.03] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/30 [&_input]:focus:!border-white/30 [&_input]:focus:!bg-white/[0.05] [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_.dark\:text-gray-500]:!text-white/40">
                        
                        <div className="text-center mb-6">
                            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm mb-4">
                                <Icon className="h-8 w-8" />
                            </div>
                            <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">{ADMIN_CONFIG.title}</h1>
                            <p className="text-white/50 text-sm font-light">{ADMIN_CONFIG.subtitle}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {verificationResent && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
                                    Verification code sent. Please check your inbox and enter the 6-digit code below.
                                </div>
                            )}

                            {verificationComplete && (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
                                    Email verified successfully. You can now sign in with your password.
                                </div>
                            )}

                            {isExpiredRedirect && !error && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-medium">
                                    Your session has expired. Please sign in again.
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                    <p>{error}</p>
                                    {emailNotVerified && email && (
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendingVerification || resendCooldown > 0}
                                            className="mt-3 inline-flex items-center gap-1.5 text-white/70 hover:text-white font-medium text-sm disabled:opacity-50 transition-colors"
                                        >
                                            <Mail className="h-4 w-4" />
                                            {resendingVerification ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {emailNotVerified && (
                                <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                                    <div>
                                        <p className="text-sm font-medium text-white/90">Verify your email</p>
                                        <p className="mt-1 text-xs text-white/50">
                                            Enter the 6-digit code we emailed to this address before signing in.
                                        </p>
                                    </div>
                                    <Input
                                        label="Verification Code"
                                        type="text"
                                        value={verificationOtp}
                                        onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        isLoading={verifyingOtp}
                                        onClick={handleVerifyOtp}
                                        className="w-full bg-white text-black hover:bg-gray-200 py-4 font-semibold rounded-xl transition-all"
                                    >
                                        Verify Email OTP
                                    </Button>
                                </div>
                            )}

                            <Input
                                label="Admin Email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setVerificationComplete(false);
                                }}
                                placeholder="Enter admin email"
                                leftIcon={<Mail className="h-5 w-5" />}
                                required
                                autoComplete="email"
                            />

                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                leftIcon={<Lock className="h-5 w-5" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="hover:text-white text-white/40 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                }
                                required
                                autoComplete="current-password"
                            />

                            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between py-2">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer appearance-none w-5 h-5 border border-white/20 rounded bg-white/[0.03] checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <svg className="absolute w-3 h-3 text-white left-1 top-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-white/60 font-medium">Remember me</span>
                                </label>
                                <Link href="/forgot-password/admin" className="text-white/60 hover:text-white transition-colors font-medium">
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 !text-white py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all"
                                >
                                    <span className="relative z-10">Sign In</span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/30 text-sm mt-8 font-light">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. Authorized Access Only.
                </p>
            </div>
        </div>
    );
}
