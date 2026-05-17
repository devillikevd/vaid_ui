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

export default function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
    const { role } = use(params);
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
            const result = await authApi.forgotPassword(email.trim());
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
            const result = await authApi.resetPasswordWithOtp(email.trim(), otp.trim(), password);
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-12">
            <div className="w-full max-w-md">
                <Link
                    href={`/login/${role}`}
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to login</span>
                </Link>

                <Card className="shadow-xl">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Password Reset</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm leading-relaxed">
                                {successMessage || `Your password for ${email} has been reset.`}
                            </p>
                            <p className="text-gray-500 dark:text-gray-500 mt-4 text-xs">
                                You can now return to the sign-in page and use your new password.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="inline-flex p-3 rounded-xl bg-blue-600 text-white mb-4">
                                    {codeSent ? <Lock className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {codeSent ? 'Enter Reset Code' : 'Reset Password'}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                                    {codeSent
                                        ? 'Enter the 6-digit code from your email and choose a new password.'
                                        : 'Enter your email address and we’ll send you a 6-digit reset code.'}
                                </p>
                            </div>

                            <form onSubmit={codeSent ? handleResetPassword : handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {!error && successMessage && (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
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

                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {codeSent ? 'Reset Password' : 'Send Reset Code'}
                                </Button>

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
                                        className="w-full text-sm text-blue-600 hover:underline"
                                    >
                                        Use a different email or request a new code
                                    </button>
                                )}
                            </form>
                        </>
                    )}
                </Card>

                <p className="text-center text-gray-500 dark:text-gray-500 text-sm mt-6">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
