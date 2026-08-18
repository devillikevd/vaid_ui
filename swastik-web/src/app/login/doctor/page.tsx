'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Activity,
    ShieldCheck,
    Video,
    FileText,
    Eye,
    EyeOff,
    Loader2,
    Mail,
    Lock
} from 'lucide-react';
import { useAuthStore, ROLE_HOME_ROUTES } from '@/stores/authStore';

export default function DoctorLoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(email.trim(), password, 'doctor', rememberMe);
            if (result.success) {
                router.push(ROLE_HOME_ROUTES['doctor']);
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-[#09090B] flex flex-col md:flex-row overflow-hidden font-sans">
            {/* LEFT SIDE - 45% (Hidden on mobile) */}
            <div className="hidden md:flex w-[45%] relative flex-col justify-between p-10 lg:p-14 border-r border-[rgba(255,255,255,0.05)] bg-gradient-to-br from-[#09090B] via-[#0a110d] to-[#0d1f14]">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-green-500/10 blur-[120px]" />
                    <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <VaidideaLogo className="w-10 h-10" />
                        <span className="text-2xl font-bold text-white tracking-tight">Vaididea</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    >
                        <h1 className="text-4xl lg:text-[40px] font-bold text-white leading-[1.15] tracking-tight mb-4">
                            Welcome to Vaididea<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#16A34A]">Doctor Portal</span>
                        </h1>
                        <p className="text-[#A1A1AA] text-base lg:text-lg max-w-md leading-relaxed mb-10">
                            Manage appointments, video consultations, prescriptions and patient records securely in one unified platform.
                        </p>

                        <div className="space-y-4">
                            {[
                                { icon: ShieldCheck, text: "Secure End-to-End Login" },
                                { icon: FileText, text: "Smart Digital Prescriptions" },
                                { icon: Video, text: "HD Video Consultations" },
                                { icon: Activity, text: "Unified Patient Records" }
                            ].map((feature, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                                    className="flex items-center gap-4 text-[#A1A1AA] hover:text-white transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-[rgba(255,255,255,0.05)] flex items-center justify-center">
                                        <feature.icon className="w-4 h-4 text-[#22C55E]" />
                                    </div>
                                    <span className="font-medium text-sm lg:text-base">{feature.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <div className="relative z-10 mt-8">
                    <p className="text-xs text-[#A1A1AA]/60">
                        © 2026 Vaididea Healthcare Pvt. Ltd.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE - 55% */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
                {/* Mobile Background Elements */}
                <div className="md:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[20%] w-[80%] h-[50%] rounded-full bg-green-500/10 blur-[100px]" />
                </div>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[440px] relative z-10"
                >
                    {/* Mobile Logo */}
                    <div className="md:hidden flex items-center gap-3 mb-6 justify-center">
                        <VaidideaLogo className="w-10 h-10" />
                        <span className="text-2xl font-bold text-white tracking-tight">Vaididea</span>
                    </div>

                    <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-6 sm:p-8 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="mb-6">
                            <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight mb-1">Welcome Back</h2>
                            <p className="text-[#A1A1AA] text-sm">Sign in to continue to your portal</p>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-start gap-3"
                            >
                                <div className="text-[#EF4444] text-xs font-medium">{error}</div>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-[#A1A1AA]">Email or Mobile Number</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                        placeholder="doctor@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[13px] font-medium text-[#A1A1AA]">Password</label>
                                    <Link href="/forgot-password/doctor" className="text-xs text-[#22C55E] hover:text-[#16A34A] transition-colors font-medium">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-10 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A1A1AA] hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center py-1">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-[#22C55E] focus:ring-[#22C55E] focus:ring-offset-0 cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-xs text-[#A1A1AA] cursor-pointer hover:text-white transition-colors">
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white py-3 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <span>Sign In</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[rgba(255,255,255,0.05)]" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-transparent backdrop-blur-xl text-[#A1A1AA] font-medium rounded-full border border-[rgba(255,255,255,0.05)] shadow-sm">
                                    OR
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-2">
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-white/50 py-2.5 px-4 rounded-xl font-medium text-sm cursor-not-allowed transition-all"
                            >
                                Continue with Google
                                <span className="text-[9px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded-sm ml-auto">Soon</span>
                            </button>
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-white/50 py-2.5 px-4 rounded-xl font-medium text-sm cursor-not-allowed transition-all"
                            >
                                Continue with Phone
                                <span className="text-[9px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded-sm ml-auto">Soon</span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-[13px] text-[#A1A1AA]">
                        Don&apos;t have an account?{' '}
                        <Link href="/register/doctor" className="font-semibold text-white hover:text-[#22C55E] transition-colors inline-flex items-center gap-1 group">
                            Create Doctor Account
                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
