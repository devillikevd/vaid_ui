'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    Stethoscope,
    Building2,
    Pill,
    Shield,
    Building,
    Microscope,
    Dumbbell,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore, type UserRole, ROLE_HOME_ROUTES } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { getSafeRedirectUrl } from '@/lib/roles';


// Role configurations
const ROLE_CONFIG: Record<string, {
    role: UserRole;
    title: string;
    subtitle: string;
    icon: typeof Stethoscope;
    color: string;
    bgColor: string;
    hoverColor: string;
}> = {
    patient: {
        role: 'patient',
        title: 'Patient Portal',
        subtitle: 'Access your health journey',
        icon: User as any,
        color: 'text-vd-forest',
        bgColor: 'bg-vd-forest',
        hoverColor: 'hover:bg-vd-forest-deep',
    },
    doctor: {
        role: 'doctor',
        title: 'Doctor Portal',
        subtitle: 'Manage your practice',
        icon: Stethoscope,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-600',
        hoverColor: 'hover:bg-emerald-700',
    },
    hospital: {
        role: 'hospital_owner',
        title: 'Hospital Portal',
        subtitle: 'Operations management',
        icon: Building2,
        color: 'text-teal-600',
        bgColor: 'bg-teal-600',
        hoverColor: 'hover:bg-teal-700',
    },
    clinic: {
        role: 'clinic_owner',
        title: 'Clinic Portal',
        subtitle: 'Scheduling & appointments',
        icon: Building,
        color: 'text-pink-600',
        bgColor: 'bg-pink-600',
        hoverColor: 'hover:bg-pink-700',
    },
    pharmacy: {
        role: 'pharmacy_owner',
        title: 'Pharmacy Portal',
        subtitle: 'Prescriptions & inventory',
        icon: Pill,
        color: 'text-orange-600',
        bgColor: 'bg-orange-600',
        hoverColor: 'hover:bg-orange-700',
    },
    'diagnostic-center': {
        role: 'diagnostic_center_owner',
        title: 'Diagnostic Center Portal',
        subtitle: 'Tests, results & reports',
        icon: Microscope,
        color: 'text-purple-600',
        bgColor: 'bg-purple-600',
        hoverColor: 'hover:bg-purple-700',
    },
    wellness: {
        role: 'wellness_coach',
        title: 'Wellness Coach Portal',
        subtitle: 'Training, yoga & nutrition coaching',
        icon: Dumbbell,
        color: 'text-lime-600',
        bgColor: 'bg-lime-600',
        hoverColor: 'hover:bg-lime-700',
    },
    'fitness-center': {
        role: 'fitness_center_owner',
        title: 'Gym & Studio Portal',
        subtitle: 'Manage classes, trainers & memberships',
        icon: Building2,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-600',
        hoverColor: 'hover:bg-cyan-700',
    },
};

interface LoginPageProps {
    params: Promise<{
        role: string;
    }>;
}

export default function LoginPage({ params }: LoginPageProps) {
    // Unwrap params using React.use() for Next.js 15 compatibility
    const { role } = use(params);
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

    const config = ROLE_CONFIG[role];

    useEffect(() => {
        if (role === 'admin') {
            router.replace('/admin/login');
        }
    }, [role, router]);

    if (role === 'admin') {
        return null;
    }

    if (!config) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Card className="max-w-md w-full text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Invalid Portal</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">This portal does not exist.</p>
                    <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
                        Go back home
                    </Link>
                </Card>
            </div>
        );
    }

    const Icon = config.icon;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailNotVerified(false);
        setVerificationResent(false);
        setVerificationComplete(false);
        setIsLoading(true);

        try {
            const result = await login(email.trim(), password, config.role, rememberMe);

            if (result.success) {
                const redirectParam = searchParams.get('redirect') || searchParams.get('returnUrl');
                const target = getSafeRedirectUrl(redirectParam, ROLE_HOME_ROUTES[config.role]);
                router.replace(target);
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
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#FAF8F4] overflow-hidden font-sans text-stone-800 py-10 px-4 sm:px-6">
            {/* Subtle Warm Background Accent */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-vd-forest/5 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
            </div>

            <div className="w-full max-w-md z-10 flex flex-col items-center">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-vd-forest mb-6 transition-colors font-medium text-xs sm:text-sm group cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>Back to role selection</span>
                </Link>

                <div className="w-full bg-white border border-stone-200/80 p-7 sm:p-8 rounded-3xl shadow-2xs">
                    <div className="text-center mb-6">
                        <div className="inline-flex p-3 rounded-2xl bg-stone-100 text-vd-forest mb-3">
                            <Icon className="h-7 w-7" />
                        </div>
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight mb-1">
                            {config.title}
                        </h1>
                        <p className="text-stone-500 text-xs sm:text-sm font-normal">{config.subtitle}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {verificationResent && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                                Verification code sent. Please check your inbox and enter the 6-digit code below.
                            </div>
                        )}

                        {verificationComplete && (
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                                Email verified successfully. You can now sign in with your password.
                            </div>
                        )}

                        {isExpiredRedirect && !error && (
                            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                                Your session has expired. Please sign in again.
                            </div>
                        )}

                        {error && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                                <p>{error}</p>
                                {emailNotVerified && email && (
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={resendingVerification || resendCooldown > 0}
                                        className="mt-2.5 inline-flex items-center gap-1.5 text-vd-forest hover:underline font-semibold text-xs disabled:opacity-50 transition-colors"
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        {resendingVerification ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                    </button>
                                )}
                            </div>
                        )}

                        {emailNotVerified && (
                            <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                                <div>
                                    <p className="text-xs font-semibold text-stone-800">Verify your email</p>
                                    <p className="mt-0.5 text-[11px] text-stone-500">
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
                                    className="w-full bg-vd-forest hover:bg-vd-forest-deep text-white py-2.5 font-semibold text-xs rounded-xl transition-all shadow-xs"
                                >
                                    Verify Email OTP
                                </Button>
                            </div>
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setVerificationComplete(false);
                            }}
                            placeholder="Enter your email"
                            leftIcon={<Mail className="h-4 w-4 text-stone-400" />}
                            required
                            autoComplete="email"
                        />

                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            leftIcon={<Lock className="h-4 w-4 text-stone-400" />}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-stone-400 hover:text-stone-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                            required
                            autoComplete="current-password"
                        />

                        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between py-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-stone-300 text-vd-forest focus:ring-vd-forest cursor-pointer"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="text-stone-600 font-medium">Remember me</span>
                            </label>
                            <Link href={`/forgot-password/${role}`} className="text-vd-forest hover:underline transition-colors font-medium">
                                Forgot password?
                            </Link>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                isLoading={isLoading}
                                className="w-full bg-vd-forest hover:bg-vd-forest-deep text-white py-3 rounded-xl font-semibold text-xs sm:text-sm tracking-wide shadow-xs transition-all cursor-pointer"
                            >
                                Sign In
                            </Button>
                        </div>
                    </form>

                    {/* Register Link */}
                    {role !== 'admin' && (
                        <div className="mt-5 pt-4 border-t border-stone-100 text-center">
                            <p className="text-stone-500 text-xs">
                                Don&apos;t have an account?{' '}
                                <Link
                                    href={`/register/${role}${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                                    className="text-vd-forest font-semibold hover:underline ml-0.5 transition-colors"
                                >
                                    Register as {config.title.replace(' Portal', '')}
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-stone-400 text-xs mt-6 font-normal">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
