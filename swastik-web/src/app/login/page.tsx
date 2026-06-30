'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Stethoscope,
    Building2,
    Pill,
    Shield,
    Building,
    Microscope,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    Ambulance,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore, type UserRole, ROLE_HOME_ROUTES } from '@/stores/authStore';
import { authApi } from '@/lib/api';

const ROLES = [
    { id: 'admin', role: 'admin', title: 'Admin', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-600', hoverColor: 'hover:bg-blue-700', lightBg: 'bg-blue-50 dark:bg-blue-50', borderLight: 'border-blue-200 dark:border-blue-200', textLight: 'text-blue-700 dark:text-blue-700' },
    { id: 'doctor', role: 'doctor', title: 'Doctor', icon: Stethoscope, color: 'text-emerald-600', bgColor: 'bg-emerald-600', hoverColor: 'hover:bg-emerald-700', lightBg: 'bg-emerald-50 dark:bg-emerald-50', borderLight: 'border-emerald-200 dark:border-emerald-200', textLight: 'text-emerald-700 dark:text-emerald-700' },
    { id: 'hospital', role: 'hospital_owner', title: 'Hospital', icon: Building2, color: 'text-teal-600', bgColor: 'bg-teal-600', hoverColor: 'hover:bg-teal-700', lightBg: 'bg-teal-50 dark:bg-teal-50', borderLight: 'border-teal-200 dark:border-teal-200', textLight: 'text-teal-700 dark:text-teal-700' },
    { id: 'clinic', role: 'clinic_owner', title: 'Clinic', icon: Building, color: 'text-pink-600', bgColor: 'bg-pink-600', hoverColor: 'hover:bg-pink-700', lightBg: 'bg-pink-50 dark:bg-pink-50', borderLight: 'border-pink-200 dark:border-pink-200', textLight: 'text-pink-700 dark:text-pink-700' },
    { id: 'pharmacy', role: 'pharmacy_owner', title: 'Pharmacy', icon: Pill, color: 'text-orange-600', bgColor: 'bg-orange-600', hoverColor: 'hover:bg-orange-700', lightBg: 'bg-orange-50 dark:bg-orange-50', borderLight: 'border-orange-200 dark:border-orange-200', textLight: 'text-orange-700 dark:text-orange-700' },
    { id: 'diagnostic-center', role: 'diagnostic_center_owner', title: 'Diagnostic Lab', icon: Microscope, color: 'text-purple-600', bgColor: 'bg-purple-600', hoverColor: 'hover:bg-purple-700', lightBg: 'bg-purple-50 dark:bg-purple-50', borderLight: 'border-purple-200 dark:border-purple-200', textLight: 'text-purple-700 dark:text-purple-700' },
] as const;

export default function UnifiedLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpiredRedirect = searchParams.get('expired') === '1';
    
    type RoleId = typeof ROLES[number]['id'];
    
    // Default to role from query param, or Doctor if not provided
    const [selectedTabId, setSelectedTabId] = useState<RoleId>(() => {
        const role = searchParams.get('role');
        const validRoles = ROLES.map(r => r.id) as string[];
        return validRoles.includes(role as string) ? (role as RoleId) : 'doctor';
    });
    
    const selectedTab = ROLES.find(r => r.id === selectedTabId) || ROLES[2];

    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Verification state
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailNotVerified(false);
        setVerificationResent(false);
        setVerificationComplete(false);
        setIsLoading(true);

        try {
            const result = await login(email.trim(), password, selectedTab.role as UserRole, rememberMe);

            if (result.success) {
                router.push(ROLE_HOME_ROUTES[selectedTab.role as UserRole] || '/');
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
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-vd-forest/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
            </div>

            <div className="w-full max-w-4xl z-10">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Return to Ecosystem</span>
                </Link>

                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">Sign in to your account</h1>
                    <p className="text-white/50 text-sm md:text-base font-light">Select Your Role</p>
                </div>

                {/* Role Tabs */}
                <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-3xl mx-auto">
                    {ROLES.map((r) => {
                        const Icon = r.icon;
                        const isSelected = selectedTabId === r.id;
                        // Map old colors to premium colors
                        const themeGlow = isSelected ? 'shadow-white/20' : '';
                        
                        return (
                            <button
                                key={r.id}
                                onClick={() => {
                                    setSelectedTabId(r.id);
                                    setError('');
                                    setEmailNotVerified(false);
                                    setVerificationComplete(false);
                                    setVerificationResent(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 border ${
                                    isSelected
                                        ? `bg-white/10 border-white/20 shadow-lg ${themeGlow}`
                                        : `bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-white/60 hover:text-white/80`
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-all duration-300 ${isSelected ? `bg-gradient-to-br from-gray-200 to-white text-black shadow-sm` : 'bg-white/5 text-white/50'}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span className={`text-sm font-medium tracking-wide ${isSelected ? 'text-white' : ''}`}>{r.title}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Login Card */}
                <div className="flex justify-center transition-colors duration-500 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-gray-500/30 to-gray-800/30 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative w-full max-w-md bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col gap-6 transition-all duration-500">
                        
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
                                            className="mt-3 inline-flex items-center gap-1.5 text-white/70 hover:text-white hover:underline decoration-white/30 font-semibold text-sm disabled:opacity-50 transition-colors"
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
                                        <p className="text-sm font-semibold text-white">Verify your email</p>
                                        <p className="mt-1 text-xs text-white/60">
                                            Enter the 6-digit code we emailed to this address before signing in.
                                        </p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                                            type="text"
                                            value={verificationOtp}
                                            onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="123456"
                                            inputMode="numeric"
                                            maxLength={6}
                                            autoComplete="one-time-code"
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        isLoading={verifyingOtp}
                                        onClick={handleVerifyOtp}
                                        className="w-full bg-white text-black hover:bg-gray-200 py-4 font-semibold rounded-xl"
                                    >
                                        Verify Email OTP
                                    </Button>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider pl-1">Email address or Mobile</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-white/40" />
                                    </div>
                                    <input
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setVerificationComplete(false);
                                        }}
                                        placeholder="Enter your email"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider pl-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-white/40" />
                                    </div>
                                    <input
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="•••••••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between font-medium pt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer appearance-none w-5 h-5 border border-white/20 rounded bg-white/[0.03] checked:bg-white checked:border-white transition-all cursor-pointer"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <svg className="absolute w-3 h-3 text-black left-1 top-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-white/60 group-hover:text-white transition-colors">Remember me</span>
                                </label>
                                <Link href={`/forgot-password/${selectedTab.id}`} className="text-white/60 hover:text-white hover:underline decoration-white/30 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all"
                                >
                                    <span className="relative z-10">Sign in to Portal</span>
                                </Button>
                            </div>
                        </form>

                        {/* Register Link */}
                        {selectedTab.role !== 'admin' && (
                            <div className="mt-4 pt-6 border-t border-white/10 text-center">
                                <p className="text-sm text-white/50">
                                    New to Vaididea?{' '}
                                    <Link href={`/register/${selectedTab.id}`} className="text-white font-medium hover:underline decoration-white/30 ml-1 transition-colors">
                                        Register as {selectedTab.title}
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
