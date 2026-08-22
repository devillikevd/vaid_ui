'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Building2,
    Users,
    Calendar,
    ClipboardList,
    ShieldCheck,
    BarChart3,
    Mail,
    Lock,
    User,
    Phone,
    FileText,
    MapPin,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import LocationPicker from '@/components/shared/LocationPickerDynamic';

// ── Step metadata ────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Account',  desc: 'Basic credentials' },
    { id: 2, label: 'Details',  desc: 'Clinic information' },
    { id: 3, label: 'Verify',   desc: 'Confirm & submit' },
];

const BENEFITS = [
    { icon: Users,        text: 'Manage Doctors & Staff' },
    { icon: Calendar,     text: 'Centralize Appointments' },
    { icon: ClipboardList,text: 'Organize Patients' },
    { icon: Building2,    text: 'Run In-Person Consultations' },
    { icon: BarChart3,    text: 'Track Clinic Performance' },
    { icon: ShieldCheck,  text: 'Secure Healthcare Operations' },
];

// ── Tiny helpers ────────────────────────────────────
function req(label: string) { return `${label} *`; }

export default function ClinicRegisterPage() {
    const router = useRouter();
    const { register } = useAuthStore();

    // Step
    const [step, setStep] = useState(1);

    // Step 1 — Account
    const [name, setName] = useState('');
    const [facilityName, setFacilityName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 — Clinic Details
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [clinicState, setClinicState] = useState('');
    const [pincode, setPincode] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [licenseNumber, setLicenseNumber] = useState('');
    const [isEmergencyAvailable, setIsEmergencyAvailable] = useState(false);

    // Step 3 — OTP / Verify
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationOtp, setVerificationOtp] = useState('');
    const [verificationInfo, setVerificationInfo] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendingOtp, setResendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // General
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => window.clearTimeout(t);
    }, [resendCooldown]);

    // ── Validation ────────────────────────────────────
    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Contact person name is required';
        else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
        if (!facilityName.trim()) errs.facilityName = 'Clinic name is required';
        if (!email.trim()) errs.email = 'Email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errs.email = 'Invalid email address';
        if (!phone.trim()) errs.phone = 'Phone number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter a valid 10-15 digit number';
        if (!password) errs.password = 'Password is required';
        else if (password.length < 8) errs.password = 'At least 8 characters required';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errs.password = 'Must include uppercase, lowercase, and a digit';
        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!address.trim()) errs.address = 'Address is required';
        if (!city.trim()) errs.city = 'City is required';
        if (latitude == null || longitude == null) errs.location = 'Map location is required for approval';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep3 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!licenseNumber.trim()) errs.licenseNumber = 'Clinic license / registration number is required';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Handlers ────────────────────────────────────
    const goNext = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) setStep(3);
    };

    const goBack = () => {
        setStep((s) => Math.max(1, s - 1));
        setFieldErrors({});
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateStep3()) return;

        setIsLoading(true);
        try {
            const checkRes = await authApi.checkDuplicate(email.trim(), phone.trim());
            if (checkRes.isDuplicate) {
                setFieldErrors((prev) => ({ ...prev, [checkRes.field || 'email']: checkRes.message || 'Already registered' }));
                setIsLoading(false);
                return;
            }
            const otpRes = await authApi.sendRegistrationOtp(email.trim(), name.trim(), 'clinic_owner');
            if (otpRes.success) {
                setVerificationSent(true);
                setVerificationComplete(false);
                setVerificationError('');
                setVerificationInfo('We sent a 6-digit verification code to your email.');
            } else {
                setError(otpRes.message || otpRes.error || 'Failed to send verification code. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || !email.trim()) return;
        setResendingOtp(true);
        setVerificationError('');
        try {
            const result = await authApi.sendRegistrationOtp(email.trim(), name.trim(), 'clinic_owner');
            if (result.success) {
                setVerificationInfo(result.message || 'Verification code sent.');
                setResendCooldown(60);
            } else {
                setVerificationError(result.message || 'Failed to resend code.');
            }
        } catch { setVerificationError('Network error.'); }
        finally { setResendingOtp(false); }
    };

    const handleVerifyOtp = async () => {
        if (!/^\d{6}$/.test(verificationOtp.trim())) {
            setVerificationError('Enter the 6-digit code from your email.');
            return;
        }
        setVerifyingOtp(true);
        setVerificationError('');
        try {
            const verifyResult = await authApi.verifyRegistrationOtp(email.trim(), verificationOtp.trim());
            if (!verifyResult.success) {
                setVerificationError(verifyResult.message || verifyResult.error || 'Failed to verify email.');
                setVerifyingOtp(false);
                return;
            }
            setVerificationInfo('Email verified! Creating your account...');

            const result = await register({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                password,
                facility_name: facilityName.trim(),
                ...(licenseNumber.trim() ? { license_number: licenseNumber.trim() } : {}),
                address: address.trim(),
                city: city.trim(),
                ...(clinicState.trim() ? { state: clinicState.trim() } : {}),
                ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
                ...(latitude != null && longitude != null && !(latitude === 0 && longitude === 0)
                    ? { latitude, longitude } : {}),
                is_emergency_available: isEmergencyAvailable,
            }, 'clinic_owner');

            if (result.success) {
                setVerificationComplete(true);
                setVerificationInfo('Account created successfully. You can now sign in.');
            } else {
                if (result.fieldErrors?.length) {
                    const backendErrs = result.fieldErrors.reduce<Record<string, string>>((acc, item) => {
                        acc[item.field] = item.message;
                        return acc;
                    }, {});
                    setFieldErrors((prev) => ({ ...prev, ...backendErrs }));
                }
                setVerificationError(result.error || 'Registration failed');
                setVerificationSent(false);
            }
        } catch {
            setVerificationError('Network error. Please try again.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    // ── Render ────────────────────────────────────────
    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col md:flex-row overflow-x-hidden font-sans">

            {/* ── LEFT PANEL (desktop only) ── */}
            <div className="hidden md:flex w-[40%] lg:w-[42%] relative flex-col border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#0b0e15] to-[#0c1520]">
                {/* Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[65%] rounded-full bg-pink-500/[0.07] blur-[110px]" />
                    <div className="absolute bottom-0 -right-[20%] w-[55%] h-[55%] rounded-full bg-rose-500/[0.07] blur-[100px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="reg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#reg-grid)" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col h-full p-8 lg:p-11 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {/* Logo */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <VaidideaLogo className="w-9 h-9" />
                            <span className="text-xl font-bold text-white tracking-tight">Vaididea</span>
                        </div>
                        <Link href="/login/clinic" className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Login</span>
                        </Link>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/[0.06] mb-5">
                            <Building2 className="w-3 h-3 text-pink-400" />
                            <span className="text-[11px] font-bold text-pink-400 tracking-widest uppercase">Clinic Registration</span>
                        </div>

                        <h1 className="text-2xl lg:text-[28px] font-bold text-white leading-[1.2] tracking-tight mb-2.5">
                            Build a smarter clinic<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">with Vaididea</span>
                        </h1>
                        <p className="text-[#A1A1AA] text-sm leading-relaxed mb-6 max-w-xs">
                            Connect your doctors, appointments, patients and daily operations in one secure workspace.
                        </p>

                        {/* Benefits */}
                        <div className="space-y-2 mb-8">
                            {BENEFITS.map((b, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, x: -14 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.35, delay: 0.12 + i * 0.06 }}
                                    className="flex items-center gap-3 text-[#A1A1AA] group hover:text-white transition-colors"
                                >
                                    <div className="w-6 h-6 shrink-0 rounded-full bg-pink-500/[0.08] border border-pink-500/20 flex items-center justify-center">
                                        <b.icon className="w-3 h-3 text-pink-400" />
                                    </div>
                                    <span className="text-sm font-medium">{b.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Step progress tracker */}
                        <div className="border-t border-white/[0.06] pt-6">
                            <p className="text-[11px] font-bold text-[#A1A1AA]/50 tracking-widest uppercase mb-4">Registration Progress</p>
                            <div className="space-y-3">
                                {STEPS.map((s) => {
                                    const done = step > s.id;
                                    const active = step === s.id;
                                    return (
                                        <div key={s.id} className="flex items-center gap-3">
                                            {/* Node */}
                                            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                done ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                                                    : active ? 'bg-white text-black shadow-md'
                                                    : 'bg-white/5 border border-white/10 text-white/30'
                                            }`}>
                                                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                                            </div>
                                            {/* Text */}
                                            <div>
                                                <p className={`text-sm font-semibold leading-tight transition-colors ${active ? 'text-white' : done ? 'text-pink-400' : 'text-white/30'}`}>
                                                    {s.label}
                                                </p>
                                                <p className={`text-[11px] transition-colors ${active ? 'text-[#A1A1AA]' : 'text-white/20'}`}>{s.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    <p className="text-xs text-[#A1A1AA]/40 mt-auto pt-6 shrink-0">
                        &copy; {new Date().getFullYear()} Vaididea Healthcare Pvt. Ltd.
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex items-start justify-center p-5 sm:p-10 relative overflow-y-auto">
                {/* Mobile bg glow */}
                <div className="md:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[5%] left-[10%] w-[80%] h-[50%] rounded-full bg-pink-500/[0.07] blur-[100px]" />
                </div>

                <div className="w-full max-w-[480px] relative z-10 py-8 md:py-10">

                    {/* Mobile header */}
                    <div className="md:hidden flex flex-col items-center gap-3 mb-7">
                        <div className="flex items-center gap-2.5">
                            <VaidideaLogo className="w-8 h-8" />
                            <span className="text-lg font-bold text-white tracking-tight">Vaididea</span>
                        </div>
                        <Link href="/login/clinic" className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Login
                        </Link>
                        {/* Mobile step dots */}
                        <div className="flex items-center gap-2 mt-1">
                            {STEPS.map((s) => (
                                <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${step === s.id ? 'w-6 bg-pink-400' : step > s.id ? 'w-3 bg-pink-500/60' : 'w-3 bg-white/10'}`} />
                            ))}
                        </div>
                    </div>

                    {/* OTP / Completion screen */}
                    {verificationSent ? (
                        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-7 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
                            <div className="inline-flex p-3 rounded-full bg-pink-500/10 border border-pink-500/20 mb-4">
                                <CheckCircle className="h-9 w-9 text-pink-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {verificationComplete ? 'Account Created!' : 'Verify Your Email'}
                            </h2>
                            <p className="text-[#A1A1AA] text-sm leading-relaxed max-w-xs mx-auto mb-6">
                                {verificationComplete
                                    ? <>Your clinic account for <strong className="text-white">{email}</strong> is ready. Sign in to continue.</>
                                    : <>We sent a 6-digit code to <strong className="text-white">{email}</strong>. Enter it below to activate your account.</>
                                }
                            </p>
                            {verificationInfo && (
                                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-left">
                                    {verificationInfo}
                                </div>
                            )}
                            {verificationError && (
                                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-left">
                                    {verificationError}
                                </div>
                            )}
                            {!verificationComplete && (
                                <div className="space-y-4 text-left mb-6">
                                    <input
                                        type="text"
                                        value={verificationOtp}
                                        onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 px-4 text-white text-lg tracking-[0.5em] font-mono placeholder:text-[#A1A1AA]/40 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 transition-all text-center"
                                    />
                                    <button
                                        type="button"
                                        disabled={verifyingOtp}
                                        onClick={handleVerifyOtp}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white py-3 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_18px_rgba(236,72,153,0.22)] transition-all disabled:opacity-70"
                                    >
                                        {verifyingOtp ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : 'Verify & Create Account'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={resendingOtp || resendCooldown > 0}
                                        className="w-full text-sm font-semibold text-white/60 hover:text-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Mail className="h-4 w-4" />
                                        {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                                    </button>
                                </div>
                            )}
                            <Link href="/login/clinic">
                                <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-200 to-white text-black py-3 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_16px_rgba(255,255,255,0.12)] hover:shadow-[0_0_22px_rgba(255,255,255,0.2)] transition-all">
                                    Go to Login
                                </button>
                            </Link>
                            <p className="text-[#A1A1AA]/50 text-xs mt-4">
                                Didn&apos;t receive it? Check spam or confirm your email address above.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-7 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] [&_label]:!text-white/60 [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-white/[0.03] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/30 [&_input]:focus:!border-white/30 [&_input]:focus:!bg-white/[0.05] [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_select]:!bg-[#0A0A0A] [&_select]:!border-white/10 [&_select]:!text-white">

                            {/* Card header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20 flex items-center justify-center shrink-0">
                                    <Building2 className="text-pink-400" style={{ width: '18px', height: '18px' }} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">
                                        {step === 1 ? 'Account Setup' : step === 2 ? 'Clinic Details' : 'Verification'}
                                    </h2>
                                    <p className="text-[#A1A1AA] text-xs">
                                        Step {step} of {STEPS.length} &mdash; {STEPS[step - 1].desc}
                                    </p>
                                </div>
                                {/* Desktop step counter badge */}
                                <div className="ml-auto hidden md:flex items-center gap-1.5">
                                    {STEPS.map((s) => (
                                        <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${step === s.id ? 'w-5 bg-pink-400' : step > s.id ? 'w-2.5 bg-pink-500/60' : 'w-2.5 bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-medium">
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} noValidate>
                                <AnimatePresence mode="wait">
                                    {/* ── STEP 1: Account ── */}
                                    {step === 1 && (
                                        <motion.div key="step1"
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-3.5"
                                        >
                                            <Input
                                                label={req('Contact Person Name')}
                                                value={name}
                                                onChange={(e) => { setName(e.target.value); setFieldErrors(p => { const { name, ...r } = p; return r; }); }}
                                                placeholder="Admin or contact person"
                                                leftIcon={<User className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.name}
                                                required
                                            />
                                            <Input
                                                label={req('Clinic Name')}
                                                value={facilityName}
                                                onChange={(e) => { setFacilityName(e.target.value); setFieldErrors(p => { const { facilityName, ...r } = p; return r; }); }}
                                                placeholder="Your clinic's registered name"
                                                leftIcon={<Building2 className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.facilityName}
                                                required
                                            />
                                            <Input
                                                label={req('Email Address')}
                                                type="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => { const { email, ...r } = p; return r; }); }}
                                                placeholder="clinic@example.com"
                                                leftIcon={<Mail className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.email}
                                                required
                                            />
                                            <Input
                                                label={req('Phone Number')}
                                                value={phone}
                                                onChange={(e) => { setPhone(e.target.value); setFieldErrors(p => { const { phone, ...r } = p; return r; }); }}
                                                placeholder="10-digit mobile number"
                                                leftIcon={<Phone className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.phone}
                                                required
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    label={req('Password')}
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => { const { password, ...r } = p; return r; }); }}
                                                    placeholder="Min. 8 chars"
                                                    leftIcon={<Lock className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                    error={fieldErrors.password}
                                                    rightIcon={
                                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white transition-colors">
                                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    }
                                                    required
                                                />
                                                <Input
                                                    label={req('Confirm')}
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => { const { confirmPassword, ...r } = p; return r; }); }}
                                                    placeholder="Re-enter"
                                                    leftIcon={<Lock className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                    error={fieldErrors.confirmPassword}
                                                    required
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── STEP 2: Clinic Details ── */}
                                    {step === 2 && (
                                        <motion.div key="step2"
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-3.5"
                                        >
                                            <Input
                                                label={req('Clinic Address')}
                                                value={address}
                                                onChange={(e) => { setAddress(e.target.value); setFieldErrors(p => { const { address, ...r } = p; return r; }); }}
                                                placeholder="Full street address"
                                                leftIcon={<MapPin className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.address}
                                                required
                                            />
                                            <div className="grid grid-cols-3 gap-3">
                                                <Input
                                                    label={req('City')}
                                                    value={city}
                                                    onChange={(e) => { setCity(e.target.value); setFieldErrors(p => { const { city, ...r } = p; return r; }); }}
                                                    placeholder="Mumbai"
                                                    error={fieldErrors.city}
                                                    required
                                                />
                                                <Input
                                                    label="State"
                                                    value={clinicState}
                                                    onChange={(e) => setClinicState(e.target.value)}
                                                    placeholder="Maharashtra"
                                                />
                                                <Input
                                                    label="Pincode"
                                                    value={pincode}
                                                    onChange={(e) => setPincode(e.target.value)}
                                                    placeholder="400001"
                                                />
                                            </div>
                                            {/* Map picker */}
                                            <div className="rounded-xl overflow-hidden border border-white/10 mt-1">
                                                <LocationPicker
                                                    latitude={latitude}
                                                    longitude={longitude}
                                                    address={address}
                                                    onLocationChange={(lat, lng) => {
                                                        if (lat === 0 && lng === 0) { setLatitude(null); setLongitude(null); }
                                                        else { setLatitude(lat); setLongitude(lng); }
                                                        setFieldErrors((p) => { const { location, ...r } = p; return r; });
                                                    }}
                                                    accentColor="black"
                                                    label="Pin your clinic on the map *"
                                                    height="240px"
                                                />
                                            </div>
                                            {fieldErrors.location && (
                                                <p className="text-sm text-red-400 -mt-1">{fieldErrors.location}</p>
                                            )}
                                            {/* Emergency checkbox */}
                                            <div className="flex items-center gap-3 p-3.5 border border-white/10 rounded-xl bg-white/[0.02]">
                                                <div className="relative flex items-center shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        id="emergency_avail"
                                                        checked={isEmergencyAvailable}
                                                        onChange={(e) => setIsEmergencyAvailable(e.target.checked)}
                                                        className="peer appearance-none w-5 h-5 border border-white/20 rounded bg-white/[0.03] checked:bg-pink-500 checked:border-pink-500 transition-all cursor-pointer"
                                                    />
                                                    <svg className="absolute w-3 h-3 text-white left-1 top-1 opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <label htmlFor="emergency_avail" className="text-sm font-medium text-white/80 cursor-pointer">
                                                    24/7 Emergency Services Available
                                                </label>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* ── STEP 3: Verification ── */}
                                    {step === 3 && (
                                        <motion.div key="step3"
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -16 }}
                                            transition={{ duration: 0.22 }}
                                            className="space-y-4"
                                        >
                                            <p className="text-[#A1A1AA] text-sm leading-relaxed">
                                                Provide your clinic&apos;s license number for verification. Approved clinics gain full platform access.
                                            </p>
                                            <Input
                                                label={req('License / Registration Number')}
                                                value={licenseNumber}
                                                onChange={(e) => { setLicenseNumber(e.target.value); setFieldErrors(p => { const { licenseNumber, ...r } = p; return r; }); }}
                                                placeholder="Clinic license or registration number"
                                                leftIcon={<FileText className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />}
                                                error={fieldErrors.licenseNumber}
                                                required
                                            />
                                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-400 leading-relaxed font-medium">
                                                Fields marked * are required to complete registration and qualify for admin approval. Provide a reachable phone number, full address, and map location so patients can discover your clinic.
                                            </div>
                                            {/* Summary */}
                                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-2">
                                                <p className="text-xs font-bold text-[#A1A1AA]/60 uppercase tracking-wider mb-3">Registration Summary</p>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                                    <span className="text-[#A1A1AA]">Clinic</span>
                                                    <span className="text-white font-medium truncate">{facilityName || '—'}</span>
                                                    <span className="text-[#A1A1AA]">Contact</span>
                                                    <span className="text-white font-medium truncate">{name || '—'}</span>
                                                    <span className="text-[#A1A1AA]">Email</span>
                                                    <span className="text-white font-medium truncate">{email || '—'}</span>
                                                    <span className="text-[#A1A1AA]">City</span>
                                                    <span className="text-white font-medium">{city || '—'}</span>
                                                    <span className="text-[#A1A1AA]">Location</span>
                                                    <span className={`font-medium ${latitude ? 'text-pink-400' : 'text-white/40'}`}>
                                                        {latitude ? 'Pinned' : 'Not set'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* ── Navigation ── */}
                                <div className="flex gap-3 pt-5 mt-2 border-t border-white/[0.06]">
                                    {step > 1 && (
                                        <button
                                            type="button"
                                            onClick={goBack}
                                            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-white/20 text-white/70 hover:bg-white/[0.06] font-medium text-sm transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Back
                                        </button>
                                    )}
                                    {step < 3 ? (
                                        <button
                                            type="button"
                                            onClick={goNext}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold text-[15px] shadow-[0_0_16px_rgba(236,72,153,0.2)] hover:shadow-[0_0_22px_rgba(236,72,153,0.35)] transition-all"
                                        >
                                            Continue <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            isLoading={isLoading}
                                            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 !text-white py-2.5 rounded-xl font-semibold text-[15px] border-0 shadow-[0_0_16px_rgba(236,72,153,0.2)] hover:shadow-[0_0_22px_rgba(236,72,153,0.35)] transition-all"
                                        >
                                            <span>Complete Registration</span>
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Sign-in link */}
                    {!verificationSent && (
                        <p className="mt-4 text-center text-[13px] text-[#A1A1AA]">
                            Already have an account?{' '}
                            <Link href="/login/clinic" className="font-semibold text-white hover:text-pink-400 transition-colors inline-flex items-center gap-1 group">
                                Sign In <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
