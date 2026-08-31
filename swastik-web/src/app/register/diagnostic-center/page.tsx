'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Microscope,
    Mail,
    Lock,
    User,
    Phone,
    MapPin,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Building2,
    Loader2,
    Calendar,
    ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import VaidideaLogo from '@/components/shared/VaidideaLogo';

const FEATURES = [
    { icon: Microscope, text: 'Manage your diagnostic test catalog' },
    { icon: Calendar, text: 'Handle bookings and home collection' },
    { icon: ClipboardList, text: 'Upload and share patient reports' },
];

export default function DiagnosticRegisterPage() {
    const { register } = useAuthStore();
    const role = 'diagnostic_center_owner';

    // State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [facilityName, setFacilityName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationOtp, setVerificationOtp] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [verificationInfo, setVerificationInfo] = useState('');
    const [verificationComplete, setVerificationComplete] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendingOtp, setResendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setTimeout(() => setResendCooldown((current) => current - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendCooldown]);

    const validateStep1 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = 'Name is required';
        else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
        if (!email.trim()) errors.email = 'Email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errors.email = 'Invalid email address';
        if (!phone.trim()) errors.phone = 'Phone number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a valid phone number (10–15 digits)';
        if (!password) errors.password = 'Password is required';
        else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errors.password = 'Must include uppercase, lowercase, and a number';
        if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
        if (!facilityName.trim()) errors.facilityName = 'Diagnostic center name is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errors: Record<string, string> = {};
        if (!address.trim()) errors.address = 'Address is required';
        if (!city.trim()) errors.city = 'City is required';
        if (!licenseNumber.trim()) errors.licenseNumber = 'License/Registration number is required';
        if (latitude == null || longitude == null) errors.location = 'Map location is required for approval';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 1) {
            if (validateStep1()) setStep(2);
            return;
        }

        if (!validateStep2()) return;

        setIsLoading(true);
        try {
            const checkRes = await authApi.checkDuplicate(email.trim(), phone.trim());
            if (checkRes.isDuplicate) {
                setFieldErrors((prev) => ({
                    ...prev,
                    [checkRes.field || 'email']: checkRes.message || 'Already registered',
                }));
                setIsLoading(false);
                return;
            }

            const otpRes = await authApi.sendRegistrationOtp(email.trim(), name.trim());
            if (otpRes.success) {
                setVerificationSent(true);
                setVerificationComplete(false);
                setVerificationError('');
                setVerificationInfo('We sent a 6-digit verification code to your email.');
            } else {
                setError(otpRes.error || 'Failed to send verification code. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (resendCooldown > 0 || !email.trim()) return;
        setResendingOtp(true);
        setVerificationError('');
        try {
            const result = await authApi.resendVerification(email.trim());
            if (result.success) {
                setVerificationInfo(result.message || 'Verification code sent. Please check your inbox.');
                setResendCooldown(60);
            } else {
                setVerificationError(result.message || 'Failed to resend verification code.');
            }
        } catch {
            setVerificationError('Network error. Please try again.');
        } finally {
            setResendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!/^\d{6}$/.test(verificationOtp.trim())) {
            setVerificationError('Enter the 6-digit verification code from your email.');
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

            const payload = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                password,
                facility_name: facilityName.trim(),
                ...(licenseNumber.trim() ? { license_number: licenseNumber.trim() } : {}),
                address: address.trim(),
                city: city.trim(),
                ...(state.trim() ? { state: state.trim() } : {}),
                ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
                ...(latitude != null && longitude != null && !(latitude === 0 && longitude === 0) ? { latitude, longitude } : {}),
            };

            const result = await register(payload, role);

            if (result.success) {
                setVerificationComplete(true);
                setVerificationInfo('Your Diagnostic Center account is awaiting approval.');
            } else {
                if (result.fieldErrors?.length) {
                    const backendFieldErrors = result.fieldErrors.reduce<Record<string, string>>((acc, item) => {
                        acc[item.field] = item.message;
                        return acc;
                    }, {});
                    setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
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

    return (
        <div className="min-h-screen w-full bg-[#09090B] flex flex-col md:flex-row overflow-x-hidden font-sans">
            {/* ── LEFT PANEL (desktop only) ── */}
            <div className="hidden md:flex w-[42%] lg:w-[45%] relative flex-col border-r border-white/[0.05] bg-gradient-to-br from-[#09090B] via-[#0D0B12] to-[#160B21]">
                {/* Glow layers */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[65%] h-[65%] rounded-full bg-[#7A42A8]/[0.07] blur-[110px]" />
                    <div className="absolute bottom-[5%] -right-[20%] w-[55%] h-[55%] rounded-full bg-[#5B2A86]/[0.07] blur-[100px]" />
                    <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-[#7A42A8]/[0.04] blur-[80px]" />
                    {/* Subtle grid pattern */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="diagnostic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diagnostic-grid)" />
                    </svg>
                </div>

                {/* Scrollable inner */}
                <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    <div>
                        <div className="flex items-center justify-between mb-8 lg:mb-10">
                            <Link href="/" aria-label="Vaididea Home" className="flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl">
                                <VaidideaLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
                                <span className="text-xl font-bold text-white tracking-tight">Vaididea</span>
                            </Link>
                            <Link href="/" className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Portal Selection</span>
                            </Link>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#7A42A8]/20 bg-[#5B2A86]/[0.06] mb-5">
                                <Microscope className="w-3 h-3 text-[#9D5BE0]" />
                                <span className="text-[11px] font-semibold text-[#9D5BE0] tracking-widest uppercase">Diagnostic Center Portal</span>
                            </div>

                            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-[1.2] tracking-tight mb-3">
                                Join Vaididea's<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D5BE0] to-[#7A42A8]">Diagnostic Network</span>
                            </h1>

                            <p className="text-[#A1A1AA] text-sm lg:text-base leading-relaxed mb-6 lg:mb-8 max-w-xs">
                                Set up your diagnostic center and manage tests, bookings, home collection, and patient reports from one connected platform.
                            </p>

                            <div className="space-y-2 lg:space-y-2.5">
                                {FEATURES.map((feature, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.15 + idx * 0.07 }}
                                        className="flex items-center gap-3 text-[#A1A1AA] hover:text-white transition-colors group"
                                    >
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center group-hover:bg-[#5B2A86]/10 group-hover:border-[#7A42A8]/20 transition-colors">
                                            <feature.icon className="w-3.5 h-3.5 text-[#9D5BE0]" />
                                        </div>
                                        <span className="font-medium text-sm">{feature.text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <p className="text-xs text-[#A1A1AA]/40 mt-6 shrink-0">
                        &copy; {new Date().getFullYear()} Vaididea Healthcare Pvt. Ltd.
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex items-center justify-center p-5 sm:p-10 relative overflow-y-auto">
                <div className="md:hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[10%] w-[80%] h-[50%] rounded-full bg-[#5B2A86]/[0.07] blur-[100px]" />
                </div>

                <div className="w-full max-w-2xl relative z-10 py-8 md:py-0 mx-auto">
                    {/* Mobile branding block */}
                    <div className="md:hidden flex flex-col items-center gap-3 mb-7">
                        <Link href="/" aria-label="Vaididea Home" className="flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl">
                            <VaidideaLogo className="w-8 h-8 transition-transform group-hover:scale-105" />
                            <span className="text-lg font-bold text-white tracking-tight">Vaididea</span>
                        </Link>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#7A42A8]/20 bg-[#5B2A86]/[0.06] mb-1">
                            <Microscope className="w-3 h-3 text-[#9D5BE0]" />
                            <span className="text-[10px] font-semibold text-[#9D5BE0] tracking-widest uppercase">Diagnostic Center Portal</span>
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight text-center">Join Vaididea's Diagnostic Network</h1>
                    </div>

                    {verificationSent ? (
                        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center">
                            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                                <CheckCircle className="h-10 w-10 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-3">
                                {verificationComplete ? 'Registration submitted' : 'Enter Verification Code'}
                            </h1>
                            <p className="text-[#A1A1AA] text-sm leading-relaxed max-w-xs mx-auto">
                                {verificationComplete ? (
                                    <>Your Diagnostic Center account is awaiting approval.</>
                                ) : (
                                    <>We've sent a 6-digit verification code to <strong className="text-white">{email}</strong>. Enter it below to complete registration.</>
                                )}
                            </p>

                            {verificationInfo && (
                                <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium">
                                    {verificationInfo}
                                </div>
                            )}
                            {verificationError && (
                                <div className="mt-5 p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-sm font-medium">
                                    {verificationError}
                                </div>
                            )}

                            {!verificationComplete && (
                                <div className="mt-8 space-y-4 max-w-sm mx-auto text-left">
                                    <Input
                                        label="Verification Code"
                                        type="text"
                                        value={verificationOtp}
                                        onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        required
                                    />
                                    <button
                                        type="button"
                                        disabled={verifyingOtp}
                                        onClick={handleVerifyOtp}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-70 mt-2"
                                    >
                                        {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Create Account'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={resendingOtp || resendCooldown > 0}
                                        className="w-full text-sm font-semibold text-[#A1A1AA] hover:text-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Mail className="h-4 w-4" />
                                        {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                    </button>
                                </div>
                            )}

                            {verificationComplete && (
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <Link href="/login/diagnostic-center">
                                        <button className="w-full max-w-sm mx-auto flex items-center justify-center bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-3 px-4 rounded-xl font-semibold text-[15px] transition-all">
                                            Back to Login
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6 sm:p-9 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                            <div className="mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">Create your Diagnostic Center account</h2>
                                <p className="text-[#A1A1AA] text-sm mt-1">Complete your center details to get started.</p>
                            </div>

                            {/* Step Indicator */}
                            <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-all ${step === 1 ? 'bg-[#5B2A86] text-white shadow-[0_0_15px_rgba(91,42,134,0.5)] border border-[#7A42A8]' : 'bg-emerald-500 text-white border-transparent'}`}>
                                        {step > 1 ? <CheckCircle className="w-5 h-5" /> : 1}
                                    </div>
                                    <span className="text-[10px] font-semibold tracking-wider uppercase text-white/80">Account</span>
                                </div>
                                <div className={`h-[2px] flex-[2] mx-2 rounded-full transition-all ${step >= 2 ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-all ${step === 2 ? 'bg-[#5B2A86] text-white shadow-[0_0_15px_rgba(91,42,134,0.5)] border border-[#7A42A8]' : 'bg-[#09090B] text-[#A1A1AA] border border-white/10'}`}>
                                        2
                                    </div>
                                    <span className={`text-[10px] font-semibold tracking-wider uppercase ${step >= 2 ? 'text-white/80' : 'text-[#A1A1AA]'}`}>Center Details</span>
                                </div>
                            </div>

                            <div className="[&_label]:!text-[#A1A1AA] [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-[#09090B]/50 [&_input]:!border-[rgba(255,255,255,0.1)] [&_input]:!text-white [&_input]:placeholder:!text-[#A1A1AA]/50 [&_input]:!rounded-xl [&_input]:!py-3.5 [&_input]:focus:!border-[#7A42A8] [&_input]:focus:!ring-[#7A42A8]/50">
                                {error && (
                                    <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-[#EF4444] text-sm font-medium mb-6">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                                    {/* STEP 1 */}
                                    <div className={step === 1 ? 'space-y-5 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Input
                                                label="Contact Person Name *"
                                                value={name}
                                                onChange={(e) => { setName(e.target.value); setFieldErrors(p => { const { name, ...rest } = p; return rest; }); }}
                                                placeholder="Enter contact person name"
                                                leftIcon={<User className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.name}
                                                required
                                            />
                                            <Input
                                                label="Diagnostic Center Name *"
                                                value={facilityName}
                                                onChange={(e) => { setFacilityName(e.target.value); setFieldErrors(p => { const { facilityName, ...rest } = p; return rest; }); }}
                                                placeholder="Enter center name"
                                                leftIcon={<Building2 className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.facilityName}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Input
                                                label="Email Address *"
                                                type="email"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => { const { email, ...rest } = p; return rest; }); }}
                                                placeholder="center@example.com"
                                                leftIcon={<Mail className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.email}
                                                required
                                            />
                                            <Input
                                                label="Phone Number *"
                                                value={phone}
                                                onChange={(e) => { setPhone(e.target.value); setFieldErrors(p => { const { phone, ...rest } = p; return rest; }); }}
                                                placeholder="Enter 10-digit number"
                                                leftIcon={<Phone className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.phone}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Input
                                                label="Password *"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => { const { password, ...rest } = p; return rest; }); }}
                                                placeholder="Min. 8 characters"
                                                leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.password}
                                                rightIcon={
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-white text-[#A1A1AA] transition-colors">
                                                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                                    </button>
                                                }
                                                required
                                            />
                                            <Input
                                                label="Confirm Password *"
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => { const { confirmPassword, ...rest } = p; return rest; }); }}
                                                placeholder="Re-enter password"
                                                leftIcon={<Lock className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                                error={fieldErrors.confirmPassword}
                                                required
                                            />
                                        </div>

                                        <div className="pt-2 flex justify-between items-center">
                                            <div className="text-xs text-[#A1A1AA]">
                                                Already have an account? <Link href="/login/diagnostic-center" className="text-[#9D5BE0] hover:text-white transition-colors">Sign in</Link>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { if (validateStep1()) setStep(2); }}
                                                className="flex items-center justify-center gap-2 bg-[#5B2A86] hover:bg-[#6A3298] border border-[#7A42A8]/50 text-white py-2.5 px-6 rounded-xl font-semibold text-[14px] transition-all group"
                                            >
                                                Next Step <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* STEP 2 */}
                                    <div className={step === 2 ? 'space-y-5 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                                        <Input
                                            label="License / Registration Number *"
                                            value={licenseNumber}
                                            onChange={(e) => { setLicenseNumber(e.target.value); setFieldErrors(p => { const { licenseNumber, ...rest } = p; return rest; }); }}
                                            placeholder="Enter center license number"
                                            error={fieldErrors.licenseNumber}
                                            required
                                        />
                                        <Input
                                            label="Full Address *"
                                            value={address}
                                            onChange={(e) => { setAddress(e.target.value); setFieldErrors(p => { const { address, ...rest } = p; return rest; }); }}
                                            placeholder="Street, Building, Landmark"
                                            leftIcon={<MapPin className="h-[18px] w-[18px] text-[#A1A1AA]" />}
                                            error={fieldErrors.address}
                                            required
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                            <Input
                                                label="City *"
                                                value={city}
                                                onChange={(e) => { setCity(e.target.value); setFieldErrors(p => { const { city, ...rest } = p; return rest; }); }}
                                                placeholder="City"
                                                error={fieldErrors.city}
                                                required
                                            />
                                            <Input
                                                label="State"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                placeholder="State"
                                            />
                                            <Input
                                                label="Pincode"
                                                value={pincode}
                                                onChange={(e) => setPincode(e.target.value)}
                                                placeholder="Pincode"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Location Map *</label>
                                            <div className={`rounded-xl overflow-hidden border ${fieldErrors.location ? 'border-[#EF4444]' : 'border-white/10'}`}>
                                                <LocationPicker
                                                    onLocationChange={(lat, lng) => {
                                                        setLatitude(lat);
                                                        setLongitude(lng);
                                                        setFieldErrors(p => { const { location, ...rest } = p; return rest; });
                                                    }}
                                                    address={`${address}, ${city}`}
                                                />
                                            </div>
                                            {fieldErrors.location && (
                                                <p className="text-[#EF4444] text-[13px] mt-1.5 font-medium">{fieldErrors.location}</p>
                                            )}
                                        </div>

                                        <div className="pt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.05)]">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="flex items-center gap-2 text-[#A1A1AA] hover:text-white font-medium text-[14px] transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#7A42A8] to-[#5B2A86] hover:from-[#6A3298] hover:to-[#4A216D] shadow-[0_0_20px_rgba(122,66,168,0.3)] !text-white py-2.5 px-6 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-70"
                                            >
                                                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Complete Registration'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
