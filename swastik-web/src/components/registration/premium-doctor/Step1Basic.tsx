import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Lock, Eye, EyeOff, User, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export function Step1Basic({ data, updateData, nextStep, errors }: any) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, label: '', color: 'bg-white/10' };
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        
        if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
        return { score, label: 'Strong', color: 'bg-[#22C55E]' };
    };

    const strength = getPasswordStrength(data.password);
    
    // Password rules evaluation
    const pass = data.password || '';
    const rules = [
        { label: '8+ characters', met: pass.length >= 8 },
        { label: 'Uppercase', met: /[A-Z]/.test(pass) },
        { label: 'Lowercase', met: /[a-z]/.test(pass) },
        { label: 'Number', met: /[0-9]/.test(pass) },
        { label: 'Special character', met: /[^A-Za-z0-9]/.test(pass) },
    ];

    const handleContinue = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    return (
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-5 sm:p-8 rounded-2xl sm:rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="mb-5">
                <span className="text-[#22C55E] text-[11px] sm:text-xs font-semibold tracking-wide uppercase mb-1.5 block">Step 1 of 6</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Basic Information</h2>
                <p className="text-[#A1A1AA] text-sm">Let&apos;s create your doctor account.</p>
            </div>

            <form onSubmit={handleContinue} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                    <label className="text-[13px] font-medium text-[#A1A1AA]">Full Name</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                        </div>
                        <input
                            type="text"
                            required
                            value={data.name}
                            onChange={(e) => updateData({ name: e.target.value })}
                            className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                            placeholder="Dr. John Doe"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#A1A1AA]">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="email"
                                required
                                value={data.email}
                                onChange={(e) => updateData({ email: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-9 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="doctor@example.com"
                            />
                            {data.email.includes('@') && data.email.includes('.') && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#A1A1AA]">Phone Number</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Phone className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="tel"
                                required
                                value={data.phone}
                                onChange={(e) => updateData({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="9876543210"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Password */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#A1A1AA]">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={data.password}
                                onChange={(e) => updateData({ password: e.target.value })}
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
                        
                        {/* Password Strength Indicator & Requirements */}
                        {data.password && (
                            <div className="mt-2 bg-[#09090B]/30 p-2.5 rounded-lg border border-[rgba(255,255,255,0.03)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 h-1 flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div 
                                                key={i} 
                                                className={`h-full flex-1 rounded-full transition-colors duration-500 ${i <= Math.max(1, strength.score) ? strength.color : 'bg-white/10'}`} 
                                            />
                                        ))}
                                    </div>
                                    <span className={`text-[11px] font-semibold w-10 text-right ${strength.score <= 1 ? 'text-red-500' : strength.score <= 3 ? 'text-yellow-500' : 'text-[#22C55E]'}`}>
                                        {strength.label}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                            {rule.met ? <CheckCircle2 className="w-3 h-3 text-[#22C55E]" /> : <Circle className="w-3 h-3 text-[#A1A1AA]/50" />}
                                            <span className={rule.met ? 'text-[#A1A1AA]' : 'text-[#A1A1AA]/50'}>{rule.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                        <label className="text-[13px] font-medium text-[#A1A1AA]">Confirm Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Lock className="h-[18px] w-[18px] text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={data.confirmPassword}
                                onChange={(e) => updateData({ confirmPassword: e.target.value })}
                                className={`w-full bg-[#09090B]/50 border rounded-xl py-3 sm:py-2.5 pl-[42px] pr-10 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 transition-all hover:border-[rgba(255,255,255,0.2)] ${
                                    data.confirmPassword && data.password !== data.confirmPassword
                                    ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                                    : 'border-[rgba(255,255,255,0.1)] focus:ring-[#22C55E]/50 focus:border-[#22C55E]'
                                }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A1A1AA] hover:text-white transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-5">
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white py-3 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all group"
                    >
                        Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <p className="text-center text-[#A1A1AA] text-[11px] mt-4">
                        By continuing you agree to{' '}
                        <Link href="/terms" className="text-white hover:text-[#22C55E] transition-colors underline underline-offset-2">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-white hover:text-[#22C55E] transition-colors underline underline-offset-2">Privacy Policy</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}
