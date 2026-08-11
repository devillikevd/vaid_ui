'use client';

import { useEffect, useState } from 'react';
import { Phone, X, RefreshCw, Send, CheckCircle2, AlertTriangle, Loader2, TimerReset } from 'lucide-react';

interface EndCallRequestModalProps {
    open: boolean;
    role: 'doctor' | 'patient';
    otpRequired?: boolean;
    reason?: string | null;
    requestedByName?: string | null;
    requestSent?: boolean;
    isSubmitting?: boolean;
    error?: string | null;
    onClose: () => void;
    onDoctorRequest: (reason?: string) => void;
    onDoctorComplete: (otp?: string) => void;
    onDoctorResendOtp?: () => void;
    onPatientConfirm: (otp?: string) => void;
    onPatientDecline: () => void;
    resendCooldown?: number;
}

export function EndCallRequestModal({
    open,
    role,
    otpRequired = true,
    reason,
    requestedByName,
    requestSent,
    isSubmitting,
    error,
    onClose,
    onDoctorRequest,
    onDoctorComplete,
    onDoctorResendOtp,
    onPatientConfirm,
    onPatientDecline,
    resendCooldown = 0,
}: EndCallRequestModalProps) {
    const [view, setView] = useState<'request' | 'otp'>('request');
    const [reasonInput, setReasonInput] = useState('');
    const [otpInput, setOtpInput] = useState('');

    useEffect(() => {
        if (!open) return;
        setView('request');
        setReasonInput('');
        setOtpInput('');
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
        >
            <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                {role === 'doctor' ? (
                    <>
                        <div className="mb-5 text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                                <Phone className="h-7 w-7 text-red-400 rotate-[135deg]" />
                            </div>
                            <h2 className="text-lg font-bold text-white">End Consultation</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {view === 'request'
                                    ? 'Optionally ask the patient to confirm before ending.'
                                    : otpRequired
                                        ? 'Ask the patient for their 6-digit OTP shown on their screen'
                                        : 'Confirm to end this consultation.'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {view === 'request' ? (
                            <>
                                <textarea
                                    value={reasonInput}
                                    onChange={(e) => setReasonInput(e.target.value.slice(0, 500))}
                                    rows={3}
                                    placeholder="Reason for ending (optional)"
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-400 focus:border-red-400 focus:outline-none"
                                />
                                <div className="mt-4 flex flex-col gap-2">
                                    <button
                                        onClick={() => onDoctorRequest(reasonInput.trim() || undefined)}
                                        disabled={isSubmitting}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Send className="h-4 w-4" /> Send End Request to Patient</>
                                        )}
                                    </button>
                                    {otpRequired && (
                                        <button
                                            onClick={() => setView('otp')}
                                            disabled={isSubmitting}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                                        >
                                            End now with OTP
                                        </button>
                                    )}
                                    {!otpRequired && (
                                        <button
                                            onClick={() => onDoctorComplete()}
                                            disabled={isSubmitting}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                                        >
                                            End now
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {requestSent && (
                                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>End request sent to the patient. You can still complete it below.</span>
                                    </div>
                                )}
                                <div className="relative mb-4 flex justify-center gap-2">
                                    {Array.from({ length: 6 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`flex h-12 w-10 items-center justify-center rounded-xl border-2 text-xl font-bold text-white transition-all ${
                                                otpInput.length === i
                                                    ? 'border-red-500 bg-red-900/30 ring-4 ring-red-500/20'
                                                    : otpInput.length > i
                                                        ? 'border-red-600 bg-red-800/40 text-red-200'
                                                        : 'border-white/10 bg-white/5 text-slate-400'
                                            }`}
                                        >
                                            {otpInput[i] || ''}
                                        </div>
                                    ))}
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        autoFocus
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && otpInput.length === 6) onDoctorComplete(otpInput.trim()); }}
                                        className="absolute inset-0 h-full w-full cursor-text opacity-0"
                                    />
                                </div>
                                {onDoctorResendOtp && (
                                    <div className="mb-4 flex justify-center">
                                        <button
                                            onClick={onDoctorResendOtp}
                                            disabled={resendCooldown > 0 || isSubmitting}
                                            className="flex items-center gap-2 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${resendCooldown > 0 ? '' : 'hover:animate-spin'}`} />
                                            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP to Patient'}
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setView('request')}
                                        disabled={isSubmitting}
                                        className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => onDoctorComplete(otpInput.trim())}
                                        disabled={isSubmitting || otpInput.length !== 6}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Ending...</>
                                        ) : (
                                            'End Consultation'
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <div className="mb-5 text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                                <TimerReset className="h-7 w-7 text-amber-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Doctor wants to end</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                {requestedByName || 'Your doctor'} has requested to end this consultation.
                                {reason ? ` Reason: "${reason}"` : ''}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {otpRequired && (
                            <>
                                <p className="mb-2 text-center text-xs text-slate-400">
                                    Enter the verification code sent to your email, or your completion OTP.
                                </p>
                                <div className="relative mb-4 flex justify-center gap-2">
                                    {Array.from({ length: 6 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`flex h-12 w-10 items-center justify-center rounded-xl border-2 text-xl font-bold text-white transition-all ${
                                                otpInput.length === i
                                                    ? 'border-amber-500 bg-amber-900/30 ring-4 ring-amber-500/20'
                                                    : otpInput.length > i
                                                        ? 'border-amber-600 bg-amber-800/40 text-amber-200'
                                                        : 'border-white/10 bg-white/5 text-slate-400'
                                            }`}
                                        >
                                            {otpInput[i] || ''}
                                        </div>
                                    ))}
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        autoFocus
                                        value={otpInput}
                                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (!otpRequired || otpInput.length === 6)) onPatientConfirm(otpInput.trim()); }}
                                        className="absolute inset-0 h-full w-full cursor-text opacity-0"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onPatientDecline}
                                disabled={isSubmitting}
                                className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                            >
                                Keep Consulting
                            </button>
                            <button
                                onClick={() => onPatientConfirm(otpInput.trim())}
                                disabled={isSubmitting || (otpRequired && otpInput.length !== 6)}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Ending...</>
                                ) : (
                                    'Confirm & End'
                                )}
                            </button>
                        </div>
                    </>
                )}

                {!isSubmitting && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
