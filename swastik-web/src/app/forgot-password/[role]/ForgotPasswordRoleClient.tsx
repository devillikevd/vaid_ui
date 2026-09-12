'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Loader2, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';

const ROLE_MAP: Record<string, string> = {
    doctor: 'doctor',
    clinic: 'clinic_owner',
    pharmacy: 'pharmacy_owner',
    hospital: 'hospital_owner',
    'diagnostic-center': 'diagnostic_center_owner',
    wellness: 'wellness_coach',
    'wellness-coach': 'wellness_coach',
    'fitness-center': 'fitness_center_owner',
    gym: 'fitness_center_owner',
    ambulance: 'ambulance_operator',
    'ambulance-driver': 'ambulance_driver',
    admin: 'admin',
    patient: 'patient',
};

const getTheme = (role: string) => {
    switch (role) {
        case 'patient':
            return {
                bgPulse1: 'bg-teal-500/10',
                bgPulse2: 'bg-emerald-500/10',
                buttonGradient: 'from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 !text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                focusClass: '[&_input]:focus:!border-emerald-500 [&_input]:focus:!ring-emerald-500/50',
                accentText: 'text-emerald-400',
                title: 'Patient',
                heading: 'Forgot your password?',
                subtitle: 'Enter the email associated with your Vaididea account.',
                successDesc: 'Your Vaididea password has been updated successfully.',
                successButton: 'Sign In',
            };
        case 'wellness':
        case 'wellness-coach':
            return {
                bgPulse1: 'bg-blue-600/10',
                bgPulse2: 'bg-indigo-600/10',
                buttonGradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 !text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]',
                focusClass: '[&_input]:focus:!border-indigo-500 [&_input]:focus:!ring-indigo-500/50',
                accentText: 'text-indigo-400',
                title: 'Wellness Coach',
                heading: 'Forgot your password, Coach?',
                subtitle: 'Enter your registered email to receive a verification OTP.',
                successDesc: 'Your Coach Portal password has been updated successfully.',
                successButton: 'Sign In to Coach Portal',
            };
        case 'fitness-center':
        case 'gym':
            return {
                bgPulse1: 'bg-amber-500/10',
                bgPulse2: 'bg-orange-600/10',
                buttonGradient: 'from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 !text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]',
                focusClass: '[&_input]:focus:!border-orange-500 [&_input]:focus:!ring-orange-500/50',
                accentText: 'text-orange-400',
                title: 'Gym & Studio',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered studio account email to receive a verification OTP.',
                successDesc: 'Your Gym & Studio Portal password has been updated successfully.',
                successButton: 'Sign In to Gym & Studio Portal',
            };
        case 'doctor':
            return {
                bgPulse1: 'bg-green-500/10',
                bgPulse2: 'bg-emerald-500/10',
                buttonGradient: 'from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] !text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]',
                focusClass: '[&_input]:focus:!border-[#22C55E] [&_input]:focus:!ring-[#22C55E]/50',
                accentText: 'text-emerald-400',
                title: 'Doctor',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered doctor email to receive a verification OTP.',
                successDesc: 'Your Doctor Portal password has been updated successfully.',
                successButton: 'Sign In to Doctor Portal',
            };
        case 'clinic':
            return {
                bgPulse1: 'bg-pink-500/10',
                bgPulse2: 'bg-rose-500/10',
                buttonGradient: 'from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 !text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]',
                focusClass: '[&_input]:focus:!border-pink-500 [&_input]:focus:!ring-pink-500/50',
                accentText: 'text-pink-400',
                title: 'Clinic',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered clinic email to receive a verification OTP.',
                successDesc: 'Your Clinic Portal password has been updated successfully.',
                successButton: 'Sign In to Clinic Portal',
            };
        case 'pharmacy':
            return {
                bgPulse1: 'bg-orange-500/10',
                bgPulse2: 'bg-amber-500/10',
                buttonGradient: 'from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 !text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]',
                focusClass: '[&_input]:focus:!border-orange-500 [&_input]:focus:!ring-orange-500/50',
                accentText: 'text-orange-400',
                title: 'Pharmacy',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered pharmacy email to receive a verification OTP.',
                successDesc: 'Your Pharmacy Portal password has been updated successfully.',
                successButton: 'Sign In to Pharmacy Portal',
            };
        case 'hospital':
            return {
                bgPulse1: 'bg-cyan-500/10',
                bgPulse2: 'bg-blue-500/10',
                buttonGradient: 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 !text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]',
                focusClass: '[&_input]:focus:!border-cyan-500 [&_input]:focus:!ring-cyan-500/50',
                accentText: 'text-cyan-400',
                title: 'Hospital',
                heading: 'Forgot Password?',
                subtitle: "Enter the email address associated with your Hospital Portal account. We'll send a verification OTP to this email.",
                successDesc: 'Your Hospital Portal password has been updated successfully. You can now sign in with your new password.',
                successButton: 'Sign In to Hospital Portal',
            };
        case 'diagnostic-center':
            return {
                bgPulse1: 'bg-purple-500/10',
                bgPulse2: 'bg-indigo-500/10',
                buttonGradient: 'from-[#7A42A8] to-[#5B2A86] hover:from-[#5B2A86] hover:to-[#4A1E70] !text-white shadow-[0_0_20px_rgba(122,66,168,0.3)]',
                focusClass: '[&_input]:focus:!border-[#7A42A8] [&_input]:focus:!ring-[#7A42A8]/50',
                accentText: 'text-purple-400',
                title: 'Diagnostic Center',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered diagnostic center email to receive a verification OTP.',
                successDesc: 'Your Diagnostic Center password has been updated successfully.',
                successButton: 'Sign In to Diagnostic Center',
            };
        case 'ambulance':
        case 'ambulance-driver':
            return {
                bgPulse1: 'bg-red-500/10',
                bgPulse2: 'bg-rose-500/10',
                buttonGradient: 'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 !text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]',
                focusClass: '[&_input]:focus:!border-red-500 [&_input]:focus:!ring-red-500/50',
                accentText: 'text-red-400',
                title: 'Ambulance',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered ambulance email to receive a verification OTP.',
                successDesc: 'Your Ambulance Portal password has been updated successfully.',
                successButton: 'Sign In to Ambulance Portal',
            };
        default:
            return {
                bgPulse1: 'bg-emerald-500/10',
                bgPulse2: 'bg-teal-500/10',
                buttonGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 !text-white shadow-[0_0_20px_rgba(5,150,105,0.3)]',
                focusClass: '[&_input]:focus:!border-emerald-500 [&_input]:focus:!ring-emerald-500/50',
                accentText: 'text-emerald-400',
                title: 'Vaididea',
                heading: 'Forgot your password?',
                subtitle: 'Enter your registered email to receive a verification OTP.',
                successDesc: 'Your password has been updated successfully.',
                successButton: 'Sign In',
            };
    }
};

export default function ForgotPasswordRoleClient({ role }: { role: string }) {
    const backendRole = ROLE_MAP[role] || role;
    const theme = getTheme(role);

    // Step state: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
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

    // Resend countdown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // ── STEP 1: Send OTP ─────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setError('Please enter your email address.');
            return;
        }
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)) {
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
                setError(result?.message || `No registered ${theme.title} account was found with this email.`);
            }
        } catch (err: any) {
            setError(err?.message || `Unable to send reset code. Please check your connection.`);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resend OTP ───────────────────────────────────
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resendingOtp) return;
        setError('');
        setResendingOtp(true);
        try {
            const result = await authApi.forgotPassword(email.trim().toLowerCase(), backendRole);
            if (result?.success) {
                setResendCooldown(30);
            } else {
                setError(result?.message || 'Failed to resend reset code.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setResendingOtp(false);
        }
    };

    // ── STEP 2: Verify OTP ───────────────────────────
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

    // ── STEP 3: Reset Password ───────────────────────
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
                setError(result?.message || 'Unable to update password. Please verify the code or try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to update password. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] relative flex flex-col items-center justify-center bg-[#09090B] overflow-hidden font-sans py-12 px-5 sm:px-0">
            {/* Dynamic Ambient Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full ${theme.bgPulse1} blur-[120px] mix-blend-screen animate-pulse duration-10000`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full ${theme.bgPulse2} blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000`} />
            </div>

            <div className="w-full max-w-[440px] z-10 flex flex-col items-center">
                {/* Top Nav Back Link */}
                {step === 1 && (
                    <Link
                        href={`/login/${role}`}
                        replace
                        className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-6 transition-colors font-medium text-[13px] mx-auto justify-center cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to {theme.title} Login</span>
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
                    <div className={`relative w-full bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-7 sm:p-9 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col gap-6 transition-all duration-500 [&_label]:!text-[#A1A1AA] [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-[#09090B]/50 [&_input]:!border-[rgba(255,255,255,0.1)] [&_input]:!text-white [&_input]:placeholder:!text-[#A1A1AA]/50 [&_input]:!rounded-xl [&_input]:!py-3.5 hover:[&_input]:!border-[rgba(255,255,255,0.2)] ${theme.focusClass}`}>

                        {/* ── STEP 1: Enter Registered Email ── */}
                        {step === 1 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <VaidideaLogo className="w-10 h-10 mb-3" isLink href="/" />
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        {theme.heading}
                                    </h1>
                                    <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed px-1">
                                        {theme.subtitle}
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
                                        placeholder="your-email@example.com"
                                        leftIcon={<Mail className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                        required
                                        autoComplete="email"
                                        autoFocus
                                    />

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${theme.buttonGradient} py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer`}
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
                                                href={`/login/${role}`}
                                                replace
                                                className={`${theme.accentText} hover:underline font-semibold transition-colors`}
                                            >
                                                Sign In
                                            </Link>
                                        </p>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* ── STEP 2: Verify OTP ── */}
                        {step === 2 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-cyan-400">
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
                                            className="w-full h-12 text-center tracking-[0.5em] text-2xl font-mono rounded-xl bg-[#09090B]/60 border border-white/[0.12] text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading || otp.length !== 6}
                                            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${theme.buttonGradient} py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer`}
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
                                            className={`${theme.accentText} hover:underline transition-colors disabled:opacity-50 cursor-pointer`}
                                        >
                                            {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* ── STEP 3: Set New Password ── */}
                        {step === 3 && (
                            <>
                                <div className="text-center flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-cyan-400">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-[26px] font-bold text-white tracking-tight mb-2 font-heading">
                                        Set New Password
                                    </h1>
                                    <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed px-1">
                                        Create a new secure password for your {theme.title} account.
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
                                            className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${theme.buttonGradient} py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-60 cursor-pointer`}
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

                        {/* ── STEP 4: Success ── */}
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
                                        {theme.successDesc}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                                    <Link href={`/login/${role}`} replace className="block w-full">
                                        <button className={`w-full flex items-center justify-center bg-gradient-to-r ${theme.buttonGradient} py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all cursor-pointer`}>
                                            {theme.successButton} &rarr;
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
