'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { authApi } from '@/lib/api';

interface ForgotPasswordPageProps {
    params: Promise<{ role: string }>;
}

const ROLE_MAP: Record<string, string> = {
    hospital: 'hospital_owner',
    clinic: 'clinic_owner',
    pharmacy: 'pharmacy_owner',
    'diagnostic-center': 'diagnostic_center_owner',
    wellness: 'wellness_coach',
    admin: 'admin',
    doctor: 'doctor',
    patient: 'patient'
};

export default function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
    const { role } = use(params);
    const backendRole = ROLE_MAP[role] || role;
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
                setSuccessMessage(result.message || 'If an account exists with this email, a reset code has been sent.');
            } else {
                setError(result.error || result.message || 'Failed to send reset code. Please try again.');
            }
        } catch {
            setError('Network error. Please check your connection.');
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
                setSuccessMessage(result.message || 'Password reset successfully.');
            } else {
                setError(result.error || result.message || 'Failed to reset password. Please try again.');
            }
        } catch {
            setError('Network error. Please check your connection.');
        } finally {
            setIsLoading(false);
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
                    href={`/login/${role}`}
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to login</span>
                </Link>

                <div className="flex justify-center transition-colors duration-500 relative group w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-gray-500/30 to-gray-800/30 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col gap-6 transition-all duration-500 [&_label]:!text-white/60 [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-white/[0.03] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/30 [&_input]:focus:!border-white/30 [&_input]:focus:!bg-white/[0.05] [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_.dark\:text-gray-500]:!text-white/40">
                        {success ? (
                            <div className="text-center py-4">
                                <div className="inline-flex p-3 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                                    <CheckCircle className="h-10 w-10 text-green-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Password Reset</h1>
                                <p className="text-white/60 mt-3 text-sm leading-relaxed">
                                    {successMessage || `Your password for ${email} has been reset.`}
                                </p>
                                <p className="text-white/40 mt-4 text-xs">
                                    You can now return to the sign-in page and use your new password.
                                </p>
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <Link href={`/login/${role}`}>
                                        <Button className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all">
                                            <span className="relative z-10">Go to Login</span>
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-gray-200 to-white text-black shadow-sm mb-4">
                                        {codeSent ? <Lock className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
                                    </div>
                                    <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
                                        {codeSent ? 'Enter Reset Code' : 'Reset Password'}
                                    </h1>
                                    <p className="text-white/50 text-sm font-light">
                                        {codeSent
                                            ? 'Enter the 6-digit code from your email and choose a new password.'
                                            : 'Enter your email address and we’ll send you a 6-digit reset code.'}
                                    </p>
                                </div>

                                <form onSubmit={codeSent ? handleResetPassword : handleSubmit} className="space-y-5">
                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                            {error}
                                        </div>
                                    )}

                                    {!error && successMessage && (
                                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
                                            {successMessage}
                                        </div>
                                    )}

                                    <Input
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        leftIcon={<Mail className="h-5 w-5" />}
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
                                                placeholder="At least 8 chars with upper, lower, number"
                                                leftIcon={<Lock className="h-5 w-5" />}
                                                required
                                                autoComplete="new-password"
                                            />

                                            <Input
                                                label="Confirm Password"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repeat your new password"
                                                leftIcon={<Lock className="h-5 w-5" />}
                                                required
                                                autoComplete="new-password"
                                            />
                                        </>
                                    )}

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            isLoading={isLoading}
                                            className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all"
                                        >
                                            <span className="relative z-10">{codeSent ? 'Reset Password' : 'Send Reset Code'}</span>
                                        </Button>
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
                                            className="w-full text-sm text-white/50 hover:text-white transition-colors mt-2"
                                        >
                                            Use a different email or request a new code
                                        </button>
                                    )}
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-center text-white/30 text-sm mt-8 font-light">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
