'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';

export default function DiagnosticForgotPasswordPage() {
    const backendRole = 'diagnostic_center_owner';

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendingOtp, setResendingOtp] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.forgotPassword(normalizedEmail, backendRole);
            if (result?.success) {
                setStep(2);
                setResendCooldown(30);
                setError('');
            } else {
                setError(result?.message || 'This email address is not registered as a Diagnostic Center.');
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to send reset code. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resendingOtp) return;
        setError('');
        setResendingOtp(true);
        try {
            const result = await authApi.forgotPassword(email.trim().toLowerCase(), backendRole);
            if (result?.success) {
                setResendCooldown(30);
            } else {
                setError(result?.message || 'Failed to resend code.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setResendingOtp(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanedOtp = otp.trim().replace(/\D/g, '');
        if (!/^\d{6}$/.test(cleanedOtp)) {
            setError('Please enter the 6-digit verification code.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.verifyResetOtp(email.trim().toLowerCase(), cleanedOtp, backendRole);
            if (result?.success) {
                setStep(3);
                setError('');
            } else {
                setError(result?.message || 'Invalid or expired OTP. Please check the code or request a new one.');
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to verify code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setError('Password must include uppercase, lowercase, and a number.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.resetPasswordWithOtp(
                email.trim().toLowerCase(),
                otp.trim().replace(/\D/g, ''),
                password,
                backendRole
            );
            if (result?.success) {
                setStep(4);
                setError('');
            } else {
                setError(result?.message || 'Unable to update password. Please try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to update password. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] relative flex flex-col items-center justify-center bg-[#09090B] overflow-hidden font-sans py-12 px-5 sm:px-0">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#7A42A8]/10 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#5B2A86]/10 blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
            </div>

            <div className="w-full max-w-[440px] z-10 flex flex-col items-center">
                {step === 1 && (
                    <Link
                        href="/login/diagnostic-center"
                        replace
                        className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-6 transition-colors font-medium text-[13px] mx-auto justify-center cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Diagnostic Center Login</span>
                    </Link>
                )}

                {step === 2 && (
                    <button
                        type="button"
                        onClick={() => { setStep(1); setError(''); }}
                        className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-6 transition-colors font-medium text-[13px] mx-auto justify-center cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Email Step</span>
                    </button>
                )}

                {step === 3 && (
                    <button
                        type="button"
                        onClick={() => { setStep(2); setError(''); }}
                        className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-6 transition-colors font-medium text-[13px] mx-auto justify-center cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to OTP Step</span>
                    </button>
                )}

                <div className="flex justify-center transition-colors duration-500 relative group w-full">
                    <div className="relative w-full bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-7 sm:p-9 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col gap-6 transition-all duration-500 [&_label]:!text-[#A1A1AA] [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-[#09090B]/50 [&_input]:!border-[rgba(255,255,255,0.1)] [&_input]:!text-white [&_input]:placeholder:!text-[#A1A1AA]/50 [&_input]:!rounded-xl [&_input]:!py-3.5 hover:[&_input]:!border-[rgba(255,255,255,0.2)] [&_input]:focus:!border-[#7A42A8] [&_input]:focus:!ring-[#7A42A8]/50">

                        {step === 1 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <VaidideaLogo className="w-10 h-10 mb-3" isLink href="/" />
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        Forgot Password?
                                    </h1>
                                    <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed px-1">
                                        Enter the email address associated with your Diagnostic Center account. We&apos;ll send a verification OTP to this email.
                                    </p>
                                </div>

                                <form onSubmit={handleSendOtp} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-[13px] font-medium text-center">
                                            {error}
                                        </div>
                                    )}

                                    <Input
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@diagnostic.com"
                                        leftIcon={<Mail className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                        required
                                        autoComplete="email"
                                        autoFocus
                                    />

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</>
                                            ) : (
                                                'Send OTP'
                                            )}
                                        </button>
                                    </div>

                                    <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] text-center">
                                        <p className="text-xs text-[#71717A]">
                                            Remember your password?{' '}
                                            <Link
                                                href="/login/diagnostic-center"
                                                replace
                                                className="text-purple-400 hover:underline font-semibold transition-colors"
                                            >
                                                Sign In
                                            </Link>
                                        </p>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-purple-400">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        Verify Your Email
                                    </h1>
                                    <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed px-1">
                                        Enter the 6-digit OTP sent to: <br />
                                        <strong className="text-white font-medium">{email}</strong>
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOtp} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-[13px] font-medium text-center">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2 text-center">
                                            Enter 6-Digit OTP
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            inputMode="numeric"
                                            placeholder="••••••"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full h-12 text-center tracking-[0.5em] text-2xl font-mono rounded-xl bg-[#09090B]/60 border border-white/[0.12] text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading || otp.length !== 6}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP...</>
                                            ) : (
                                                'Verify OTP'
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[#71717A] pt-2">
                                        <span>Didn&apos;t receive the OTP?</span>
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={resendCooldown > 0 || resendingOtp}
                                            className="text-purple-400 hover:underline transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-purple-400">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        Set New Password
                                    </h1>
                                    <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed px-1">
                                        Create a new secure password for your Diagnostic Center account.
                                    </p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    {error && (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-[13px] font-medium text-center">
                                            {error}
                                        </div>
                                    )}

                                    <div className="relative">
                                        <Input
                                            label="New Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 8 chars"
                                            leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                            required
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-[38px] text-[#71717A] hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Input
                                            label="Confirm New Password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-[38px] text-[#71717A] hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Resetting Password...</>
                                            ) : (
                                                'Reset Password'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {step === 4 && (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        Password Reset Successful
                                    </h1>
                                    <p className="text-[#A1A1AA] text-sm leading-relaxed px-2">
                                        Your Diagnostic Center account password has been updated successfully. You can now sign in with your new password.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                                    <Link href="/login/diagnostic-center" replace className="block w-full">
                                        <button className="w-full flex items-center justify-center bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all cursor-pointer">
                                            Sign In to Diagnostic Center &rarr;
                                        </button>
                                    </Link>
                                </div>
                            </div>
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
