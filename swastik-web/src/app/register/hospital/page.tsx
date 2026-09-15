'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import VaidideaLogo from '@/components/shared/VaidideaLogo';
import {
    Building2,
    Bed,
    Users,
    Calendar,
    ShieldCheck,
    Activity,
    Mail,
    Lock,
    User,
    Phone,
    FileText,
    MapPin,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Globe,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi, hospitalApi, uploadApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import LocationPicker from '@/components/shared/LocationPickerDynamic';

// ── Step metadata ────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Admin Account', desc: 'Credentials & Contact' },
    { id: 2, label: 'Hospital Info', desc: 'Location & Facilities' },
    { id: 3, label: 'Verification',  desc: 'License & Email OTP' },
];

const BENEFITS = [
    { icon: Building2,   text: 'Multi-Department & Ward Management' },
    { icon: Bed,         text: 'Centralized Bed & ICU Allocation' },
    { icon: Users,       text: 'Doctor, Surgeon & Staff Scheduling' },
    { icon: Calendar,    text: 'Inpatient & Outpatient Scheduling' },
    { icon: ShieldCheck, text: 'Emergency & Ambulance Dispatch' },
    { icon: Activity,    text: 'OT, Lab & Radiology Workflow' },
];

const HOSPITAL_TYPES = [
    'Private Hospital',
    'Public / Government Hospital',
    'Multi-Specialty Hospital',
    'Super-Specialty Hospital',
    'General Hospital',
    'Community Health Center',
    'Teaching & Research Hospital',
];

function req(label: string) { return `${label} *`; }

export default function HospitalRegisterPage() {
    const router = useRouter();
    const { register } = useAuthStore();

    // Step
    const [step, setStep] = useState(1);

    // Step 1 — Admin Account
    const [name, setName] = useState('');
    const [facilityName, setFacilityName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Step 2 — Hospital Details & Location
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [hospitalState, setHospitalState] = useState('');
    const [pincode, setPincode] = useState('');
    const [hospitalType, setHospitalType] = useState('Multi-Specialty Hospital');
    const [totalBeds, setTotalBeds] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isEmergencyAvailable, setIsEmergencyAvailable] = useState(true);

    // Step 3 — License & Verification
    const [licenseNumber, setLicenseNumber] = useState('');
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [website, setWebsite] = useState('');
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
        if (!name.trim()) errs.name = 'Administrator contact name is required';
        else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

        if (!facilityName.trim()) errs.facilityName = 'Hospital name is required';

        if (!email.trim()) errs.email = 'Official email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errs.email = 'Invalid email address';

        if (!phone.trim()) errs.phone = 'Contact phone number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errs.phone = 'Enter a valid 10-15 digit phone number';

        if (!password) errs.password = 'Password is required';
        else if (password.length < 8) errs.password = 'At least 8 characters required';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errs.password = 'Must include uppercase, lowercase, and a number';

        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!address.trim()) errs.address = 'Hospital address is required';
        if (!city.trim()) errs.city = 'City is required';
        if (!hospitalState.trim()) errs.hospitalState = 'State is required';
        if (!pincode.trim()) errs.pincode = 'Pincode is required';
        if (latitude == null || longitude == null) errs.location = 'Please select your hospital location on the map';

        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep3 = (): boolean => {
        const errs: Record<string, string> = {};
        if (!licenseNumber.trim()) errs.licenseNumber = 'Hospital license or registration number is required';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Handlers ────────────────────────────────────
    const goNext = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setStep((s) => s + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setStep((s) => Math.max(1, s - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSendVerification = async () => {
        if (!validateStep3()) return;
        setVerificationError('');
        setVerificationInfo('');
        setResendingOtp(true);
        try {
            const checkRes = await authApi.checkDuplicate(email.trim().toLowerCase(), phone.trim());
            if (checkRes.isDuplicate) {
                setFieldErrors((prev) => ({ ...prev, [checkRes.field || 'email']: checkRes.message || 'Already registered' }));
                setVerificationError(checkRes.message || 'Email or phone already registered.');
                setResendingOtp(false);
                return;
            }

            const res = await authApi.sendRegistrationOtp(email.trim().toLowerCase(), name.trim(), 'hospital_owner');
            if (res.success) {
                setVerificationSent(true);
                setVerificationInfo('A 6-digit verification code has been sent to your email.');
                setResendCooldown(60);
            } else {
                setVerificationError(res.message || 'Failed to dispatch verification code.');
            }
        } catch {
            setVerificationError('Network error. Please try again.');
        } finally {
            setResendingOtp(false);
        }
    };

    const handleVerifyOtpAndRegister = async () => {
        if (!/^\d{6}$/.test(verificationOtp.trim())) {
            setVerificationError('Please enter the 6-digit verification code.');
            return;
        }

        setVerifyingOtp(true);
        setVerificationError('');
        try {
            const verifyRes = await authApi.verifyRegistrationOtp(email.trim().toLowerCase(), verificationOtp.trim());
            if (!verifyRes.success) {
                setVerificationError(verifyRes.message || verifyRes.error || 'Invalid or expired code. Please try again.');
                setVerifyingOtp(false);
                return;
            }

            // OTP verified — proceed with registration
            setIsLoading(true);
            const payload = {
                name: name.trim(),
                facilityName: facilityName.trim(),
                facility_name: facilityName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password,
                address: address.trim(),
                city: city.trim(),
                state: hospitalState.trim(),
                hospitalState: hospitalState.trim(),
                pincode: pincode.trim(),
                type: hospitalType,
                hospitalType,
                totalBeds: totalBeds ? parseInt(totalBeds, 10) : null,
                isEmergencyAvailable,
                is_emergency_available: isEmergencyAvailable,
                licenseNumber: licenseNumber.trim(),
                license_number: licenseNumber.trim(),
                website: website.trim() || null,
                latitude,
                longitude,
            };

            const regRes = await register(payload, 'hospital_owner');
            if (regRes.success) {
                if (licenseFile) {
                    try {
                        const uploadRes = await uploadApi.uploadFile(licenseFile, 'license', { providerType: 'hospital' });
                        if (uploadRes.success && (uploadRes.data as any)?.url) {
                            await hospitalApi.updateRegistrationProfile({
                                license_document_url: (uploadRes.data as any).url,
                                license_number: licenseNumber.trim(),
                            });
                        }
                    } catch (uploadErr) {
                        console.error('Hospital license upload failed:', uploadErr);
                    }
                }
                await hospitalApi.submitForApproval();
                setVerificationComplete(true);
            } else {
                setError(regRes.error || 'Registration failed. Please review your details.');
                if (regRes.fieldErrors?.length) {
                    const mapped: Record<string, string> = {};
                    regRes.fieldErrors.forEach((fe) => { mapped[fe.field] = fe.message; });
                    setFieldErrors(mapped);
                }
            }
        } catch {
            setVerificationError('Network error during registration. Please try again.');
        } finally {
            setVerifyingOtp(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col lg:flex-row overflow-x-hidden font-sans text-white">
            {/* ── LEFT PANEL (Branding & Value Props) ── */}
            <div className="hidden lg:flex lg:w-[38%] relative flex-col justify-between p-10 xl:p-14 border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#0b101b] to-[#0c192c] shrink-0">
                {/* Glow & grid */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-cyan-500/[0.08] blur-[120px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/[0.08] blur-[110px]" />
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="hosp-reg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#hosp-reg-grid)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <Link
                        href="/"
                        aria-label="Vaididea Home"
                        className="inline-flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl"
                    >
                        <VaidideaLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
                        <span className="text-xl font-bold tracking-tight text-white font-heading">
                            VAIDIDEA
                        </span>
                    </Link>

                    <div className="mt-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
                            <Building2 className="w-3.5 h-3.5" />
                            Hospital Enterprise Suite
                        </div>

                        <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 font-heading">
                            Register Your Hospital on Vaididea
                        </h1>

                        <p className="text-sm text-[#A1A1AA] leading-relaxed mb-8 max-w-sm">
                            Connect your hospital network to digital admissions, bed tracking, OT queues, referral channels, and patient care workflows.
                        </p>

                        <div className="space-y-4 max-w-sm">
                            {BENEFITS.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-[#D4D4D8]">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-cyan-400">
                                        <item.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progress Indicators on Left */}
                <div className="relative z-10 pt-8 border-t border-white/[0.06]">
                    <div className="space-y-3">
                        {STEPS.map((s) => (
                            <div key={s.id} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    step > s.id
                                        ? 'bg-cyan-500 text-black'
                                        : step === s.id
                                        ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                                        : 'bg-white/[0.04] border border-white/[0.1] text-[#71717A]'
                                }`}>
                                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold ${step >= s.id ? 'text-white' : 'text-[#71717A]'}`}>{s.label}</p>
                                    <p className="text-[11px] text-[#71717A]">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL (Multi-Step Form) ── */}
            <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-14 max-w-2xl mx-auto w-full">
                {/* Top Nav */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/login/hospital"
                        className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Sign In</span>
                    </Link>

                    <div className="text-xs text-[#71717A]">
                        Step <span className="text-cyan-400 font-semibold">{step}</span> of 3
                    </div>
                </div>

                {/* Success View */}
                {verificationComplete ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center space-y-5"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-heading">Application Submitted Successfully</h2>
                            <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
                                Your hospital application for <strong>{facilityName}</strong> has been submitted. Our compliance team is currently reviewing your registration and license details.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Verification Status: Under Review</span>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={() => router.push('/login/hospital')}
                                className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                            >
                                Track Status / Sign In
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {/* Step Title Header */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-semibold uppercase tracking-wider mb-2">
                                Step {step}: {STEPS[step - 1].label}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-heading">
                                {step === 1 && 'Create Hospital Administrator Account'}
                                {step === 2 && 'Hospital Profile & Location'}
                                {step === 3 && 'License Verification & Email OTP'}
                            </h2>
                            <p className="text-sm text-[#A1A1AA] mt-1">
                                {step === 1 && 'Provide your administrator contact details and credentials.'}
                                {step === 2 && 'Set your hospital location, bed capacity, and emergency services.'}
                                {step === 3 && 'Enter your healthcare license and complete one-time email verification.'}
                            </p>
                        </div>

                        {/* General Error Banner */}
                        {error && (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                                {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {/* ── STEP 1: Account Credentials ── */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Administrator Full Name')}</label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="e.g. Dr. Rajesh Sharma / Director"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                        </div>
                                        {fieldErrors.name && <p className="text-xs text-rose-400 mt-1">{fieldErrors.name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Hospital / Healthcare Facility Name')}</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="e.g. City Multi-Specialty Hospital"
                                                value={facilityName}
                                                onChange={(e) => setFacilityName(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                        </div>
                                        {fieldErrors.facilityName && <p className="text-xs text-rose-400 mt-1">{fieldErrors.facilityName}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Official Email Address')}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="email"
                                                    placeholder="admin@hospital.org"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                                />
                                            </div>
                                            {fieldErrors.email && <p className="text-xs text-rose-400 mt-1">{fieldErrors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Official Contact Phone')}</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="tel"
                                                    placeholder="+91 98765 43210"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                                />
                                            </div>
                                            {fieldErrors.phone && <p className="text-xs text-rose-400 mt-1">{fieldErrors.phone}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Password')}</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="At least 8 chars"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {fieldErrors.password && <p className="text-xs text-rose-400 mt-1">{fieldErrors.password}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Confirm Password')}</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Re-enter password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                                />
                                            </div>
                                            {fieldErrors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{fieldErrors.confirmPassword}</p>}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 2: Hospital Info & Location ── */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Hospital Type')}</label>
                                            <select
                                                value={hospitalType}
                                                onChange={(e) => setHospitalType(e.target.value)}
                                                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            >
                                                {HOSPITAL_TYPES.map((t) => (
                                                    <option key={t} value={t} className="bg-[#09090B] text-white">{t}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Total Bed Capacity</label>
                                            <div className="relative">
                                                <Bed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 150"
                                                    value={totalBeds}
                                                    onChange={(e) => setTotalBeds(e.target.value)}
                                                    className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Physical Address')}</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="Street / Sector / Campus address"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                        </div>
                                        {fieldErrors.address && <p className="text-xs text-rose-400 mt-1">{fieldErrors.address}</p>}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('City')}</label>
                                            <Input
                                                placeholder="e.g. Lucknow"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                            {fieldErrors.city && <p className="text-xs text-rose-400 mt-1">{fieldErrors.city}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('State')}</label>
                                            <Input
                                                placeholder="e.g. Uttar Pradesh"
                                                value={hospitalState}
                                                onChange={(e) => setHospitalState(e.target.value)}
                                                className="h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                            {fieldErrors.hospitalState && <p className="text-xs text-rose-400 mt-1">{fieldErrors.hospitalState}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Pincode')}</label>
                                            <Input
                                                placeholder="e.g. 226014"
                                                value={pincode}
                                                onChange={(e) => setPincode(e.target.value)}
                                                className="h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                            {fieldErrors.pincode && <p className="text-xs text-rose-400 mt-1">{fieldErrors.pincode}</p>}
                                        </div>
                                    </div>

                                    {/* 24/7 Emergency Toggle */}
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-white">24/7 Emergency &amp; Trauma Care</p>
                                                <p className="text-[11px] text-[#A1A1AA]">Equipped with round-the-clock casualty and ambulance dispatch</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isEmergencyAvailable}
                                                onChange={(e) => setIsEmergencyAvailable(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-white/[0.1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                        </label>
                                    </div>

                                    {/* Map Location Picker */}
                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">
                                            {req('Hospital Map Coordinates')}
                                        </label>
                                        <div className="rounded-xl overflow-hidden border border-white/[0.1]">
                                            <LocationPicker
                                                latitude={latitude}
                                                longitude={longitude}
                                                address={address}
                                                onLocationChange={(lat: number, lng: number) => {
                                                    if (lat === 0 && lng === 0) {
                                                        setLatitude(null);
                                                        setLongitude(null);
                                                    } else {
                                                        setLatitude(lat);
                                                        setLongitude(lng);
                                                    }
                                                    setFieldErrors((p) => {
                                                        const { location, ...r } = p;
                                                        return r;
                                                    });
                                                }}
                                                label="Pin your hospital on the map *"
                                                height="240px"
                                            />
                                        </div>
                                        {fieldErrors.location && <p className="text-xs text-rose-400 mt-1">{fieldErrors.location}</p>}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 3: License & Email OTP ── */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">{req('Hospital Registration / Clinical Establishment License Number')}</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="e.g. HOSP-UP-2024-8849"
                                                value={licenseNumber}
                                                onChange={(e) => setLicenseNumber(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500 uppercase"
                                            />
                                        </div>
                                        {fieldErrors.licenseNumber && <p className="text-xs text-rose-400 mt-1">{fieldErrors.licenseNumber}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Hospital License / Registration Certificate</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                            className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                                        />
                                        {licenseFile && (
                                            <p className="text-xs text-cyan-400 mt-1">Selected: {licenseFile.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Hospital Website URL (Optional)</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                            <Input
                                                placeholder="https://www.cityhospital.org"
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                                className="pl-10 h-11 bg-white/[0.04] border-white/[0.1] text-white rounded-xl focus:border-cyan-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Verification Box */}
                                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 mt-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white">Email OTP Verification</h3>
                                                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                                                        We will send a 6-digit code to <strong>{email}</strong> to verify authorization.
                                                    </p>
                                                </div>
                                            </div>

                                            {!verificationSent && (
                                                <button
                                                    type="button"
                                                    onClick={handleSendVerification}
                                                    disabled={resendingOtp}
                                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all shrink-0 cursor-pointer"
                                                >
                                                    {resendingOtp ? 'Sending...' : 'Send OTP'}
                                                </button>
                                            )}
                                        </div>

                                        {verificationInfo && (
                                            <p className="text-xs text-emerald-400">{verificationInfo}</p>
                                        )}
                                        {verificationError && (
                                            <p className="text-xs text-rose-400">{verificationError}</p>
                                        )}

                                        {verificationSent && (
                                            <div className="space-y-3 pt-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">Enter 6-Digit Code</label>
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        placeholder="••••••"
                                                        value={verificationOtp}
                                                        onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                                        className="w-full h-11 px-4 text-center tracking-widest text-lg font-mono rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-[#52525B] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-[#71717A]">
                                                    <span>Didn&apos;t receive code?</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleSendVerification}
                                                        disabled={resendingOtp || resendCooldown > 0}
                                                        className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Wizard Action Controls */}
                        <div className="pt-4 flex items-center justify-between gap-3">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="px-5 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-sm font-semibold text-[#D4D4D8] transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="px-6 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleVerifyOtpAndRegister}
                                    disabled={!verificationSent || verificationOtp.length !== 6 || verifyingOtp || isLoading}
                                    className="flex-1 max-w-xs h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {verifyingOtp || isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Registration...</>
                                    ) : (
                                        'Complete Registration'
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Sign in footer */}
                        <div className="pt-6 border-t border-white/[0.06] text-center">
                            <p className="text-xs text-[#71717A]">
                                Already have a registered hospital?{' '}
                                <Link
                                    href="/login/hospital"
                                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                                >
                                    Sign In here &rarr;
                                </Link>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
