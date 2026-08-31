'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    QrCode,
    Shield,
    ShieldCheck,
    CreditCard,
    Lock,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Calendar,
    User,
    Droplet,
    ExternalLink,
    Copy,
    Check,
    Sparkles,
    Eye,
    EyeOff,
    Info,
    Printer
} from 'lucide-react';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import { patientApi, healthCardApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import ProtectedPageGate from '@/components/auth/ProtectedPageGate';

interface HealthCardState {
    has_active_card: boolean;
    token: string | null;
    url: string | null;
    generated_at: string | null;
    expires_at: string | null;
}

export default function DigitalHealthCardPage() {
    const { user, isAuthenticated, _hasHydrated, isLoading: authLoading } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const [profile, setProfile] = useState<any>(null);
    const [cardState, setCardState] = useState<HealthCardState | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [profRes, cardRes] = await Promise.allSettled([
                patientApi.getProfile(),
                healthCardApi.getStatus(),
            ]);

            if (profRes.status === 'fulfilled' && profRes.value.success && profRes.value.data) {
                setProfile(profRes.value.data);
            }

            if (cardRes.status === 'fulfilled' && cardRes.value.success && cardRes.value.data) {
                setCardState(cardRes.value.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load Digital Health Card data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isPatient) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [isPatient, loadData]);


    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await healthCardApi.generate();
            if (res.success && res.data) {
                setCardState({
                    has_active_card: true,
                    token: res.data.token,
                    url: res.data.url,
                    generated_at: new Date().toISOString(),
                    expires_at: res.data.expires_at,
                });
            } else {
                setError(res.message || 'Unable to generate Digital Health Card.');
            }
        } catch (err: any) {
            setError(err.message || 'Error generating Digital Health Card.');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async () => {
        if (!window.confirm('Are you sure you want to deactivate your active health card? The current QR code will immediately become invalid.')) {
            return;
        }

        setRevoking(true);
        setError(null);
        try {
            const res = await healthCardApi.revoke();
            if (res.success) {
                setCardState({
                    has_active_card: false,
                    token: null,
                    url: null,
                    generated_at: null,
                    expires_at: null,
                });
            } else {
                setError(res.message || res.error || 'Failed to deactivate card.');
            }
        } catch (err: any) {
            setError(err.message || 'Error deactivating card.');
        } finally {
            setRevoking(false);
        }
    };

    const handleCopyUrl = () => {
        if (!cardState?.url) return;
        navigator.clipboard.writeText(cardState.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleCopyToken = () => {
        if (!cardState?.token) return;
        navigator.clipboard.writeText(cardState.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handlePrint = () => {
        window.print();
    };

    const patientName = profile?.name || 'Patient';
    const bloodGroup = profile?.blood_group || profile?.bloodGroup || 'O+';
    const age = profile?.date_of_birth || profile?.dateOfBirth
        ? `${Math.floor((Date.now() - new Date(profile.date_of_birth || profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
        : profile?.age ? `${profile.age} yrs` : '—';
    const gender = profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not specified';
    const emergencyContact = profile?.emergency_contact || profile?.emergencyContact || profile?.emergency_phone || '—';
    const allergies = profile?.allergies || (profile?.medical_history?.allergies ? profile.medical_history.allergies.join(', ') : 'None Reported');
    const chronicConditions = profile?.chronic_conditions || (profile?.medical_history?.chronic_conditions ? profile.medical_history.chronic_conditions.join(', ') : 'None');
    const weight = profile?.weight ? `${profile.weight} kg` : '—';
    const height = profile?.height ? `${profile.height} cm` : '—';

    // QR Image Source URL (points directly to public summary route)
    const qrDataUrl = cardState?.url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0F5F50&bgcolor=FFFFFF&data=${encodeURIComponent(cardState.url)}`
        : null;

    // Calculate time remaining
    const getValidityDisplay = () => {
        if (!cardState?.has_active_card || !cardState?.expires_at) {
            return 'Emergency Access QR • Valid 24 Hours';
        }
        try {
            const exp = new Date(cardState.expires_at);
            const now = new Date();
            const diffMs = exp.getTime() - now.getTime();
            if (diffMs <= 0) return 'Expired';
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `Valid for ${diffHours}h ${diffMins}m (Expires ${exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        } catch {
            return 'Valid for 24 hours';
        }
    };

    if (_hasHydrated && !authLoading && !isPatient) {
        return <ProtectedPageGate pageType="health_card" />;
    }


    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 text-xs font-semibold mb-2">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Vaididea Smart Health Identity</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                        Digital Health Card
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                        Your portable, 256-bit encrypted health card with instant QR check-in for clinics, hospitals, and emergency responders.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Refresh status"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    {cardState?.has_active_card && (
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-semibold transition-all cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Card</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="h-80 bg-white rounded-3xl border border-stone-200 animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-vd-forest" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Interactive Digital Health Card */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="relative overflow-hidden bg-gradient-to-br from-vd-forest via-[#116958] to-stone-900 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-emerald-500/20">
                            {/* Card Top Branding & EMV Chip */}
                            <div className="flex justify-between items-start mb-6">
                                <Link href="/" aria-label="Vaididea Home" className="flex items-center gap-3 group cursor-pointer">
                                    <VaidideaLogo className="w-9 h-9 text-emerald-300 transition-transform group-hover:scale-105" />
                                    <div>
                                        <h3 className="font-heading font-extrabold text-base tracking-widest uppercase">
                                            VAIDIDEA
                                        </h3>
                                        <p className="text-[9px] text-emerald-200/80 tracking-widest uppercase font-semibold">
                                            Digital Health Card
                                        </p>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-7 rounded-md bg-amber-300/90 border border-amber-400 shadow-inner flex items-center justify-center">
                                        <div className="w-7 h-4.5 border border-amber-700/40 rounded-xs" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                                        ACTIVE
                                    </span>
                                </div>
                            </div>

                            {/* Card Middle: Patient Basic Stats */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-[10px] text-emerald-200/70 uppercase tracking-widest font-mono">
                                        Cardholder Name
                                    </p>
                                    <p className="text-xl sm:text-2xl font-heading font-bold text-white tracking-wide truncate">
                                        {patientName}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs">
                                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-emerald-200/70 uppercase tracking-wider font-semibold">Blood Group</p>
                                        <p className="font-bold text-white text-sm mt-0.5">{bloodGroup}</p>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-emerald-200/70 uppercase tracking-wider font-semibold">Gender / Age</p>
                                        <p className="font-bold text-white text-sm mt-0.5 capitalize">{gender} • {age}</p>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-emerald-200/70 uppercase tracking-wider font-semibold">Height / Weight</p>
                                        <p className="font-bold text-white text-sm mt-0.5">{height} • {weight}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Bottom: Security Credentials & Link ID */}
                            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-200">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Lock className="w-3 h-3 text-emerald-300" />
                                    <span>256-Bit Encrypted Healthcare ID</span>
                                </span>
                                {cardState?.token ? (
                                    <span className="font-mono text-emerald-100 font-bold bg-white/10 px-2 py-0.5 rounded-md">
                                        ID: {cardState.token}
                                    </span>
                                ) : (
                                    <span className="font-mono text-emerald-300/80">
                                        Status: Ready to Generate
                                    </span>
                                )}
                            </div>

                            {/* Background Ambient Glow */}
                            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
                        </div>

                        {/* Security Explainer Capsule */}
                        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 text-vd-forest">
                                <ShieldCheck className="w-5 h-5 text-vd-forest" />
                                <h4 className="font-heading font-bold text-sm text-stone-900">
                                    Independent Patient Identity Standard
                                </h4>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed font-light">
                                Vaididea Digital Health Card works independently of third-party registries. When you generate a QR code, doctors or clinics can securely review your clinical summaries, active prescriptions, and emergency vitals in real time.
                            </p>
                        </div>
                    </div>

                    {/* Right: Real QR Code & Token Access Controller */}
                    <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-6">
                        <div className="text-center space-y-1">
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                Instant Scan & Check-in
                            </h3>
                            <p className="text-xs text-vd-forest font-medium">
                                {getValidityDisplay()}
                            </p>
                        </div>

                        {/* QR Box Container */}
                        <div className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-3xl border border-stone-200/80 space-y-4">
                            {cardState?.has_active_card && qrDataUrl ? (
                                <div className="space-y-4 text-center">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-200 inline-block">
                                        <img
                                            src={qrDataUrl}
                                            alt="Digital Health Card QR Code"
                                            className="w-48 h-48 object-contain rounded-lg mx-auto"
                                        />
                                    </div>

                                    {/* Link ID Badge */}
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-stone-300 rounded-xl shadow-xs">
                                            <span className="text-xs font-mono font-extrabold tracking-widest text-stone-900">
                                                {cardState.token}
                                            </span>
                                            <button
                                                onClick={handleCopyToken}
                                                className="p-1 text-stone-400 hover:text-vd-forest transition-colors cursor-pointer"
                                                title="Copy Link ID"
                                            >
                                                {copied ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-stone-400 font-light">
                                            Share this 16-character Link ID for manual provider check-in
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center space-y-3">
                                    <div className="w-16 h-16 rounded-2xl bg-stone-200/70 text-stone-400 flex items-center justify-center mx-auto">
                                        <QrCode className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-heading font-bold text-sm text-stone-800">
                                            No Active QR Generated
                                        </h4>
                                        <p className="text-xs text-stone-500 font-light max-w-xs mx-auto mt-1">
                                            Generate a fresh, time-limited 24-hour QR token for clinic check-ins or emergency visits.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2.5">
                            {cardState?.has_active_card ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {generating ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        <span>Regenerate 24-Hour QR</span>
                                    </button>

                                    {cardState.token && (
                                        <Link
                                            href={`/health-card/${cardState.token}`}
                                            target="_blank"
                                            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-semibold text-xs transition-all flex items-center justify-center gap-2 text-center"
                                        >
                                            <Eye className="w-3.5 h-3.5 text-stone-500" />
                                            <span>View Public Clinical Summary</span>
                                            <ExternalLink className="w-3 h-3 text-stone-400" />
                                        </Link>
                                    )}

                                    <button
                                        onClick={handleRevoke}
                                        disabled={revoking}
                                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {revoking ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <EyeOff className="w-3.5 h-3.5" />
                                        )}
                                        <span>Revoke Active QR Access</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full py-3.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {generating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    <span>Generate Digital Health Card QR</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* How It Works Explainer Section (Matches Android HealthCardHowItWorks) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
                <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-vd-forest" />
                    <h3 className="font-heading font-bold text-base text-stone-900">
                        How to Use Your Digital Health Card
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                        <div className="w-7 h-7 rounded-full bg-vd-forest text-white font-bold text-xs flex items-center justify-center">
                            1
                        </div>
                        <h4 className="font-bold text-xs text-stone-900">Generate QR Token</h4>
                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                            Tap generate to create a cryptographically secure 24-hour emergency medical access token.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                        <div className="w-7 h-7 rounded-full bg-vd-forest text-white font-bold text-xs flex items-center justify-center">
                            2
                        </div>
                        <h4 className="font-bold text-xs text-stone-900">Present at Hospital / Clinic</h4>
                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                            Show your QR code or 16-character Link ID at verified hospital check-in desks and clinics.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                        <div className="w-7 h-7 rounded-full bg-vd-forest text-white font-bold text-xs flex items-center justify-center">
                            3
                        </div>
                        <h4 className="font-bold text-xs text-stone-900">Instant Clinical Access</h4>
                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                            Doctors instantly access critical vitals, chronic conditions, and verified prescriptions without delays.
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                        <div className="w-7 h-7 rounded-full bg-vd-forest text-white font-bold text-xs flex items-center justify-center">
                            4
                        </div>
                        <h4 className="font-bold text-xs text-stone-900">Revoke Any Time</h4>
                        <p className="text-[11px] text-stone-500 font-light leading-relaxed">
                            You maintain 100% control over access. Revoke the token anytime or let it automatically expire in 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
