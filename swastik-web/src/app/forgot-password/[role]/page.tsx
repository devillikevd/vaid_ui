'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';

interface ForgotPasswordPageProps {
    params: Promise<{ role: string }>;
}

const ROLE_MAP: Record<string, string> = {
    doctor: 'doctor',
    clinic: 'clinic_owner',
    pharmacy: 'pharmacy_owner',
    // We only support these three roles right now as per user constraints
};

const getTheme = (role: string) => {
    switch (role) {
        case 'doctor':
            return {
                bgPulse1: 'bg-green-500/10',
                bgPulse2: 'bg-emerald-500/10',
                buttonGradient: 'from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] !text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]',
                focusClass: '[&_input]:focus:!border-[#22C55E] [&_input]:focus:!ring-[#22C55E]/50',
                title: 'Doctor',
                heading: 'Forgot your password?',
                subtitle: 'Reset your Doctor account password and get back to your dashboard.',
                successDesc: 'Password updated successfully. You can now return to the sign-in page and use your new password.',
            };
        case 'clinic':
            return {
                bgPulse1: 'bg-pink-500/10',
                bgPulse2: 'bg-rose-500/10',
                buttonGradient: 'from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 !text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]',
                focusClass: '[&_input]:focus:!border-pink-500 [&_input]:focus:!ring-pink-500/50',
                title: 'Clinic',
                heading: 'Forgot your password?',
                subtitle: 'Reset your Clinic account password and securely return to your clinic dashboard.',
                successDesc: 'Password updated successfully. You can now return to the sign-in page and use your new password.',
            };
        case 'pharmacy':
            return {
                bgPulse1: 'bg-orange-500/10',
                bgPulse2: 'bg-amber-500/10',
                buttonGradient: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 !text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]',
                focusClass: '[&_input]:focus:!border-orange-500 [&_input]:focus:!ring-orange-500/50',
                title: 'Pharmacy',
                heading: 'Forgot your password?',
                subtitle: 'Reset your Pharmacy account password and securely return to your pharmacy dashboard.',
                successDesc: 'Password updated successfully. You can now return to the sign-in page and use your new password.',
            };
        default:
            return null; // Will trigger notFound()
    }
};

export default function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
    const { role } = use(params);
    const backendRole = ROLE_MAP[role];
    const theme = getTheme(role);
    
    if (!backendRole || !theme) {
        notFound();
    }

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await authApi.forgotPassword(email.trim(), backendRole);
            if (result.success) {
                setCodeSent(true);
                setSuccessMessage('If an account exists for this email, we’ve sent instructions to reset your password.');
            } else {
                setError('Unable to send reset instructions. Please try again.');
            }
        } catch {
            setError('Unable to send reset instructions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^\d{6}$/.test(otp.trim())) {
            setError('Enter the 6-digit reset code from your email.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setError('Password must include an uppercase letter, a lowercase letter, and a number.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.resetPasswordWithOtp(email.trim(), otp.trim(), password, backendRole);
            if (result.success) {
                setSuccess(true);
                setSuccessMessage(theme.successDesc);
            } else {
                setError('Unable to reset password. Please try again or request a new code.');
            }
        } catch {
            setError('Network error. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] relative flex flex-col items-center justify-center bg-[#09090B] overflow-hidden font-sans py-12 px-5 sm:px-0">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${theme.bgPulse1} blur-[120px] mix-blend-screen animate-pulse duration-10000`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ${theme.bgPulse2} blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000`} />
            </div>

            <div className="w-full max-w-[440px] z-10 flex flex-col items-center">
                <Link
                    href={`/login/${role}`}
                    replace
                    className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-8 transition-colors font-medium text-[13px] mx-auto justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to {theme.title} Login</span>
                </Link>

                <div className="flex justify-center transition-colors duration-500 relative group w-full">
                    <div className="relative w-full bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-7 sm:p-9 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col gap-6 transition-all duration-500 [&_label]:!text-[#A1A1AA] [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-[#09090B]/50 [&_input]:!border-[rgba(255,255,255,0.1)] [&_input]:!text-white [&_input]:placeholder:!text-[#A1A1AA]/50 [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_.dark\:text-gray-500]:!text-[#A1A1AA] hover:[&_input]:!border-[rgba(255,255,255,0.2)] ${theme.focusClass}">
                        {success ? (
                            <div className="text-center py-4">
                                <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                                </div>
                                <h1 className="text-[28px] font-bold text-white tracking-tight mb-2">Password Reset</h1>
                                <p className="text-[#A1A1AA] mt-3 text-[14px] leading-relaxed mb-6">
                                    {successMessage}
                                </p>
                                <div className="pt-6 border-t border-[rgba(255,255,255,0.05)]">
                                    <Link href={`/login/${role}`} replace className="block w-full">
                                        <button className={`w-full flex items-center justify-center bg-gradient-to-r ${theme.buttonGradient} py-3 px-4 rounded-xl font-semibold text-[15px] transition-all`}>
                                            Continue to {theme.title} Login
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-2">
                                    <h1 className="text-[28px] font-bold text-white tracking-tight mb-2">
                                        {theme.heading}
                                    </h1>
                                    <p className="text-[#A1A1AA] text-sm leading-relaxed px-2">
                                        {codeSent ? 'Enter the 6-digit code from your email and choose a new password.' : theme.subtitle}
                                    </p>
                                </div>

                                <form onSubmit={codeSent ? handleResetPassword : handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-[13px] font-medium text-center">
                                            {error}
                                        </div>
                                    )}

                                    {!error && successMessage && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[13px] font-medium text-center">
                                            {successMessage}
                                        </div>
                                    )}

                                    <Input
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        leftIcon={<Mail className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                        required
                                        autoComplete="email"
                                        autoFocus
                                        disabled={codeSent}
                                    />

                                    {codeSent && (
                                        <>
                                            <Input
                                                label="Reset Code"
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="123456"
                                                inputMode="numeric"
                                                maxLength={6}
                                                autoComplete="one-time-code"
                                                required
                                            />

                                            <Input
                                                label="New Password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="At least 8 chars"
                                                leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                required
                                                autoComplete="new-password"
                                            />

                                            <Input
                                                label="Confirm Password"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repeat your new password"
                                                leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                required
                                                autoComplete="new-password"
                                            />
                                        </>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${theme.buttonGradient} py-3 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-70`}
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                            ) : (
                                                <>{codeSent ? 'Reset Password' : 'Send Reset Link'}</>
                                            )}
                                        </button>
                                    </div>

                                    {codeSent && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCodeSent(false);
                                                setOtp('');
                                                setPassword('');
                                                setConfirmPassword('');
                                                setError('');
                                                setSuccessMessage('');
                                            }}
                                            className="w-full text-[13px] text-[#A1A1AA] hover:text-white transition-colors mt-2"
                                        >
                                            Use a different email or request a new code
                                        </button>
                                    )}
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-center text-[#A1A1AA]/50 text-xs mt-8">
                    © {new Date().getFullYear()} Vaididea Healthcare Pvt. Ltd.
                </p>
            </div>
        </div>
    );
}
