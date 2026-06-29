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
    { id: 'patient', role: 'patient', title: 'Patient', icon: User, color: 'text-indigo-600', bgColor: 'bg-indigo-600', hoverColor: 'hover:bg-indigo-700', lightBg: 'bg-indigo-50 dark:bg-indigo-50', borderLight: 'border-indigo-200 dark:border-indigo-200', textLight: 'text-indigo-700 dark:text-indigo-700' },
    { id: 'doctor', role: 'doctor', title: 'Doctor', icon: Stethoscope, color: 'text-emerald-600', bgColor: 'bg-emerald-600', hoverColor: 'hover:bg-emerald-700', lightBg: 'bg-emerald-50 dark:bg-emerald-50', borderLight: 'border-emerald-200 dark:border-emerald-200', textLight: 'text-emerald-700 dark:text-emerald-700' },
    { id: 'hospital', role: 'hospital_owner', title: 'Hospital', icon: Building2, color: 'text-teal-600', bgColor: 'bg-teal-600', hoverColor: 'hover:bg-teal-700', lightBg: 'bg-teal-50 dark:bg-teal-50', borderLight: 'border-teal-200 dark:border-teal-200', textLight: 'text-teal-700 dark:text-teal-700' },
    { id: 'clinic', role: 'clinic_owner', title: 'Clinic', icon: Building, color: 'text-pink-600', bgColor: 'bg-pink-600', hoverColor: 'hover:bg-pink-700', lightBg: 'bg-pink-50 dark:bg-pink-50', borderLight: 'border-pink-200 dark:border-pink-200', textLight: 'text-pink-700 dark:text-pink-700' },
    { id: 'pharmacy', role: 'pharmacy_owner', title: 'Pharmacy', icon: Pill, color: 'text-orange-600', bgColor: 'bg-orange-600', hoverColor: 'hover:bg-orange-700', lightBg: 'bg-orange-50 dark:bg-orange-50', borderLight: 'border-orange-200 dark:border-orange-200', textLight: 'text-orange-700 dark:text-orange-700' },
    { id: 'diagnostic-center', role: 'diagnostic_center_owner', title: 'Diagnostic Lab', icon: Microscope, color: 'text-purple-600', bgColor: 'bg-purple-600', hoverColor: 'hover:bg-purple-700', lightBg: 'bg-purple-50 dark:bg-purple-50', borderLight: 'border-purple-200 dark:border-purple-200', textLight: 'text-purple-700 dark:text-purple-700' },
    { id: 'ambulance', role: 'ambulance_driver', title: 'Ambulance Driver', icon: Ambulance, color: 'text-red-600', bgColor: 'bg-red-600', hoverColor: 'hover:bg-red-700', lightBg: 'bg-red-50 dark:bg-red-50', borderLight: 'border-red-200 dark:border-red-200', textLight: 'text-red-700 dark:text-red-700' },
] as const;

export default function UnifiedLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isExpiredRedirect = searchParams.get('expired') === '1';
    
    // Default to Doctor if no tab selected
    const [selectedTabId, setSelectedTabId] = useState<string>('doctor');
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#EFF6FF] px-4 py-12">
            <div className="w-full max-w-4xl">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-900 dark:text-gray-900 hover:text-black dark:hover:text-black mb-8 transition-colors font-semibold"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                </Link>

                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] dark:text-[#0F172A] mb-2">Sign in to your account</h1>
                    <p className="text-gray-900 dark:text-gray-900 font-semibold">Select Your Role</p>
                </div>

                {/* Role Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-3xl mx-auto">
                    {ROLES.map((r) => {
                        const Icon = r.icon;
                        const isSelected = selectedTabId === r.id;
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
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                                    isSelected
                                        ? `${r.bgColor} text-white shadow-md transform scale-105`
                                        : `${r.lightBg} ${r.textLight} hover:opacity-80 border ${r.borderLight}`
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {r.title}
                            </button>
                        );
                    })}
                </div>

                {/* Login Card */}
                <div className="flex justify-center transition-colors duration-500">
                    <Card className={`w-full max-w-md shadow-2xl ${selectedTab.lightBg} border-2 ${selectedTab.borderLight} p-6 md:p-8 rounded-3xl transition-colors duration-500`}>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {verificationResent && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                                    Verification code sent. Please check your inbox and enter the 6-digit code below.
                                </div>
                            )}

                            {verificationComplete && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
                                    Email verified successfully. You can now sign in with your password.
                                </div>
                            )}

                            {isExpiredRedirect && !error && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium">
                                    <p className="text-amber-700">Your session has expired. Please sign in again.</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium">
                                    <p className="text-red-700">{error}</p>
                                    {emailNotVerified && email && (
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendingVerification || resendCooldown > 0}
                                            className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-sm disabled:opacity-50"
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            {resendingVerification ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {emailNotVerified && (
                                <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
                                    <div>
                                        <p className="text-sm font-bold text-purple-900">Verify your email</p>
                                        <p className="mt-1 text-xs text-purple-700 font-medium">
                                            Enter the 6-digit code we emailed to this address before signing in.
                                        </p>
                                    </div>
                                    <Input
                                className="bg-[#EFF6FF] dark:bg-[#EFF6FF] border-[#DBEAFE] dark:border-[#DBEAFE] text-gray-900 dark:text-gray-900 focus:bg-white dark:focus:bg-white transition-colors"
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
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Verify Email OTP
                                    </Button>
                                </div>
                            )}

                            <Input
                                className="bg-[#EFF6FF] dark:bg-[#EFF6FF] border-[#DBEAFE] dark:border-[#DBEAFE] text-gray-900 dark:text-gray-900 focus:bg-white dark:focus:bg-white transition-colors"
                                label="Email address or Mobile"
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
                                className="bg-[#EFF6FF] dark:bg-[#EFF6FF] border-[#DBEAFE] dark:border-[#DBEAFE] text-gray-900 dark:text-gray-900 focus:bg-white dark:focus:bg-white transition-colors"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="•••••••••••••"
                                leftIcon={<Lock className="h-5 w-5" />}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="hover:text-gray-600 text-gray-400"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                }
                                required
                                autoComplete="current-password"
                            />

                            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between font-medium">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <span className="text-gray-900 dark:text-gray-900 font-semibold group-hover:text-black transition-colors">Remember me</span>
                                </label>
                                <Link href={`/forgot-password/${selectedTab.id}`} className={`${selectedTab.color} hover:underline transition-colors`}>
                                    Forgot password?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                isLoading={isLoading}
                                className={`w-full ${selectedTab.bgColor} ${selectedTab.hoverColor} text-white py-6 text-lg font-bold rounded-xl transition-all shadow-md hover:shadow-lg`}
                            >
                                Sign in to Portal
                            </Button>
                        </form>

                        {/* Register Link */}
                        {selectedTab.role !== 'admin' && (
                            <p className="text-center text-gray-900 dark:text-gray-900 mt-8 text-sm font-semibold border-t border-gray-200 dark:border-gray-200 pt-6">
                                New to Vaididea?{' '}
                                <Link href={`/register/${selectedTab.id}`} className={`${selectedTab.color} hover:underline font-bold ml-1 transition-colors`}>
                                    Register as {selectedTab.title}
                                </Link>
                            </p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
