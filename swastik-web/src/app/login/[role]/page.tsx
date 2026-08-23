'use client';

import React, { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
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
                router.push(ROLE_HOME_ROUTES[config.role]);
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

            <div className="w-full max-w-lg z-10 flex flex-col items-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to portal selection</span>
                </Link>

                <div className="flex justify-center transition-colors duration-500 relative group w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-gray-500/30 to-gray-800/30 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col gap-6 transition-all duration-500 [&_label]:!text-white/60 [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-white/[0.03] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/30 [&_input]:focus:!border-white/30 [&_input]:focus:!bg-white/[0.05] [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_.dark\:text-gray-500]:!text-white/40 [&_select]:!bg-[#0A0A0A] [&_select]:!border-white/10 [&_select]:!text-white [&_textarea]:!bg-white/[0.03] [&_textarea]:!border-white/10 [&_textarea]:!text-white [&_textarea]:placeholder:!text-white/30">
                        
                        <div className="text-center mb-6">
                            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-gray-200 to-white text-black shadow-sm mb-4">
                                <Icon className="h-8 w-8" />
                            </div>
                            <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">{config.title}</h1>
                            <p className="text-white/50 text-sm font-light">{config.subtitle}</p>
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
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setVerificationComplete(false);
                                }}
                                placeholder="Enter your email"
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
                                            className="peer appearance-none w-5 h-5 border border-white/20 rounded bg-white/[0.03] checked:bg-white checked:border-white transition-all cursor-pointer"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <svg className="absolute w-3 h-3 text-black left-1 top-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-white/60 font-medium">Remember me</span>
                                </label>
                                <Link href={`/forgot-password/${role}`} className="text-white/60 hover:text-white transition-colors font-medium">
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all"
                                >
                                    <span className="relative z-10">Sign In</span>
                                </Button>
                            </div>
                        </form>

                        {/* Register Link */}
                        {role !== 'admin' && (
                            <div className="mt-6 pt-6 border-t border-white/10 text-center">
                                <p className="text-white/50 text-sm">
                                    Don&apos;t have an account?{' '}
                                    <Link href={`/register/${role}`} className="text-white font-medium hover:underline decoration-white/30 ml-1 transition-colors">
                                        Register as {config.title.replace(' Portal', '')}
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/30 text-sm mt-8 font-light">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
