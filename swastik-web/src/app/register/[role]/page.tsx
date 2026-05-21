'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
    Stethoscope,
    Building2,
    Pill,
    Building,
    Microscope,
    Mail,
    Lock,
    User,
    Phone,
    FileText,
    MapPin,
    ArrowLeft,
    Eye,
    EyeOff,
    Briefcase,
    CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import LocationPicker from '@/components/shared/LocationPickerDynamic';

// Standardized specialization list — must match backend utils/specializations.js
const SPECIALIZATIONS = [
    'General Physician', 'Family Medicine', 'Gynecology', 'Obstetrics', 'Dermatology',
    'Pediatrics', 'Dentistry', 'Ophthalmology', 'ENT', 'Psychiatry', 'Psychology',
    'Orthopedics', 'Neurology', 'Neurosurgery', 'Urology', 'Nephrology', 'Pulmonology',
    'Cardiology', 'Cardiac Surgery', 'Gastroenterology', 'Endocrinology', 'Diabetology',
    'Oncology', 'General Surgery', 'Plastic Surgery', 'Vascular Surgery', 'Physiotherapy',
    'Radiology', 'Pathology', 'Anesthesiology', 'Emergency Medicine', 'Infectious Disease',
    'Rheumatology', 'Allergy & Immunology', 'Hematology', 'Geriatrics', 'Sports Medicine',
    'Pain Management', 'Nutrition & Dietetics', 'Ayurveda', 'Homeopathy', 'Other',
];

// Role configurations (Must match Login Page for consistency)
// Note: Admin is intentionally excluded — admins are created by existing admins only
const ROLE_CONFIG: Record<string, {
    role: UserRole;
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    bgColor: string;
    hoverColor: string;
}> = {
    doctor: {
        role: 'doctor',
        title: 'Doctor Registration',
        subtitle: 'Join our medical network',
        icon: Stethoscope,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-600',
        hoverColor: 'hover:bg-emerald-700',
    },
    hospital: {
        role: 'hospital_owner',
        title: 'Hospital Registration',
        subtitle: 'Register your medical facility',
        icon: Building2,
        color: 'text-teal-600',
        bgColor: 'bg-teal-600',
        hoverColor: 'hover:bg-teal-700',
    },
    clinic: {
        role: 'clinic_owner',
        title: 'Clinic Registration',
        subtitle: 'Register your clinic',
        icon: Building,
        color: 'text-pink-600',
        bgColor: 'bg-pink-600',
        hoverColor: 'hover:bg-pink-700',
    },
    pharmacy: {
        role: 'pharmacy_owner',
        title: 'Pharmacy Registration',
        subtitle: 'Register your pharmacy',
        icon: Pill,
        color: 'text-orange-600',
        bgColor: 'bg-orange-600',
        hoverColor: 'hover:bg-orange-700',
    },
    'diagnostic-center': {
        role: 'diagnostic_center_owner',
        title: 'Diagnostic Center Registration',
        subtitle: 'Register your diagnostic center',
        icon: Microscope,
        color: 'text-purple-600',
        bgColor: 'bg-purple-600',
        hoverColor: 'hover:bg-purple-700',
    },
};

interface RegisterPageProps {
    params: Promise<{
        role: string;
    }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
    const { role } = use(params);
    const { register } = useAuthStore();

    // Common State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Role Specific State
    const [facilityName, setFacilityName] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [address, setAddress] = useState('');
    const [experience, setExperience] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

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

    const config = ROLE_CONFIG[role];

    if (!config) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Card className="max-w-md w-full text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Invalid Registration Portal</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">This portal does not exist.</p>
                    <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
                        Go back home
                    </Link>
                </Card>
            </div>
        );
    }

    const Icon = config.icon;
    const isFacilityRole = ['hospital_owner', 'clinic_owner', 'pharmacy_owner', 'diagnostic_center_owner'].includes(config.role);
    const nameLabel = isFacilityRole ? 'Contact Person Name' : 'Full Name';
    const namePlaceholder = isFacilityRole ? 'Enter admin or contact person name' : 'Enter full name';
    const facilityLabel = config.role === 'diagnostic_center_owner' ? 'Diagnostic Center Name' : config.title.replace(' Registration', ' Name');
    const withRequiredMark = (label: string, required = false) => (required ? `${label} *` : label);
    const approvalHint = isFacilityRole
        ? 'Fields marked * are required to complete registration and qualify for admin approval. Facility roles must provide a reachable phone number, full address, and map location so patients can discover them.'
        : 'Fields marked * are required to complete registration and qualify for admin approval. Doctor approval requires a reachable phone number and valid professional credentials.';

    // ── Form Validation ────────────────────────────────────────────
    const validate = (): boolean => {
        const errors: Record<string, string> = {};

        // Name
        if (!name.trim()) errors.name = 'Name is required';
        else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

        // Email
        if (!email.trim()) errors.email = 'Email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errors.email = 'Invalid email address';

        // Phone
        if (!phone.trim()) errors.phone = 'Phone number is required';
        else if (!/^[+]?\d{10,15}$/.test(phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a valid phone number (10–15 digits)';

        // Password
        if (!password) errors.password = 'Password is required';
        else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) errors.password = 'Must include uppercase, lowercase, and a number';

        // Confirm password
        if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

        // Role-specific
        if (config.role === 'doctor') {
            if (!licenseNumber.trim()) errors.licenseNumber = 'License number is required';
            if (!specialization.trim()) errors.specialization = 'Specialization is required';
            if (!experience.trim()) errors.experience = 'Years of experience is required';
        } else {
            if (!facilityName.trim()) errors.facilityName = 'Facility name is required';
            if (!licenseNumber.trim()) errors.licenseNumber = 'License/Registration number is required';
            if (!address.trim()) errors.address = 'Address is required';
            if (latitude == null || longitude == null) errors.location = 'Map location is required for approval';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setIsLoading(true);

        try {
            // Construct data payload based on role
            const baseData = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                password,
            };

            let roleData = {};

            switch (config.role) {
                case 'doctor':
                    roleData = {
                        specialization,
                        license_number: licenseNumber,
                        experience_years: experience
                    };
                    break;
                case 'pharmacy_owner':
                case 'hospital_owner':
                case 'clinic_owner':
                case 'diagnostic_center_owner':
                    roleData = {
                        facility_name: facilityName.trim(),
                        license_number: licenseNumber,
                        address: address.trim(),
                        ...(latitude != null && longitude != null && !(latitude === 0 && longitude === 0) ? { latitude, longitude } : {}),
                    };
                    break;
            }

            const result = await register({ ...baseData, ...roleData }, config.role);

            if (result.success) {
                // Show email verification success screen
                setVerificationSent(true);
                setVerificationComplete(false);
                setVerificationError('');
                setVerificationInfo('We sent a 6-digit verification code to your email.');
            } else {
                if (result.fieldErrors?.length) {
                    const backendFieldErrors = result.fieldErrors.reduce<Record<string, string>>((acc, item) => {
                        acc[item.field] = item.message;
                        return acc;
                    }, {});
                    setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }));
                }
                setError(result.error || 'Registration failed');
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
            const result = await authApi.verifyEmailOtp(email.trim(), verificationOtp.trim());
            if (result.success) {
                setVerificationComplete(true);
                setVerificationInfo(result.message || 'Email verified successfully. You can now sign in.');
            } else {
                setVerificationError(result.message || 'Failed to verify email.');
            }
        } catch {
            setVerificationError('Network error. Please try again.');
        } finally {
            setVerifyingOtp(false);
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
                    <span>Back to Login</span>
                </Link>

                <Card className="shadow-xl">
                    {verificationSent ? (
                        <div className="text-center py-6">
                            <div className="inline-flex p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {verificationComplete ? 'Email Verified' : 'Enter Verification Code'}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm leading-relaxed max-w-xs mx-auto">
                                {verificationComplete ? (
                                    <>Your email for <strong>{email}</strong> is verified. You can now sign in and continue to approval review.</>
                                ) : (
                                    <>We&apos;ve sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to activate your account.</>
                                )}
                            </p>
                            {verificationInfo && (
                                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
                                    {verificationInfo}
                                </div>
                            )}
                            {verificationError && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                    {verificationError}
                                </div>
                            )}
                            {!verificationComplete && (
                                <div className="mt-5 space-y-4 text-left">
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
                                    <Button
                                        type="button"
                                        isLoading={verifyingOtp}
                                        onClick={handleVerifyOtp}
                                        className={`w-full ${config.bgColor} ${config.hoverColor} text-white`}
                                    >
                                        Verify Email OTP
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={handleResendVerification}
                                        disabled={resendingOtp || resendCooldown > 0}
                                        className={`w-full text-sm font-medium ${config.color} disabled:opacity-50`}
                                    >
                                        {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                    </button>
                                </div>
                            )}
                            <div className="mt-6 space-y-3">
                                <Link href={`/login/${role}`}>
                                    <Button className={`w-full ${config.bgColor} ${config.hoverColor} text-white`}>
                                        Go to Login
                                    </Button>
                                </Link>
                                <p className="text-gray-500 dark:text-gray-500 text-xs">
                                    Didn&apos;t receive it? Check your spam folder and confirm the email address above before requesting another code.
                                </p>
                            </div>
                        </div>
                    ) : (
                    <>
                    <div className="text-center mb-8">
                        <div className={`inline-flex p-3 rounded-xl ${config.bgColor} text-white mb-4`}>
                            <Icon className="h-8 w-8" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{config.title}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{config.subtitle}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <Input
                            label={withRequiredMark(nameLabel, true)}
                            value={name}
                            onChange={(e) => { setName(e.target.value); setFieldErrors(p => { const { name, ...rest } = p; return rest; }); }}
                            placeholder={namePlaceholder}
                            leftIcon={<User className="h-5 w-5" />}
                            error={fieldErrors.name}
                            required
                        />

                        {isFacilityRole && (
                            <Input
                                label={withRequiredMark(facilityLabel, true)}
                                value={facilityName}
                                onChange={(e) => { setFacilityName(e.target.value); setFieldErrors(p => { const { facilityName, ...rest } = p; return rest; }); }}
                                placeholder={`Enter ${facilityLabel.toLowerCase()}`}
                                leftIcon={<Building2 className="h-5 w-5" />}
                                error={fieldErrors.facilityName}
                                required
                            />
                        )}

                        <Input
                            label={withRequiredMark('Email Address', true)}
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => { const { email, ...rest } = p; return rest; }); }}
                            placeholder="Enter email"
                            leftIcon={<Mail className="h-5 w-5" />}
                            error={fieldErrors.email}
                            required
                        />

                        <Input
                            label={withRequiredMark('Phone Number', true)}
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setFieldErrors(p => { const { phone, ...rest } = p; return rest; }); }}
                            placeholder="Enter approval contact number"
                            leftIcon={<Phone className="h-5 w-5" />}
                            error={fieldErrors.phone}
                            required
                        />

                        {/* Role Specific Fields */}
                        {config.role === 'doctor' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {withRequiredMark('Specialization', true)}
                                    </label>
                                    <select
                                        value={specialization}
                                        onChange={(e) => { setSpecialization(e.target.value); setFieldErrors(p => { const { specialization, ...rest } = p; return rest; }); }}
                                        className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${fieldErrors.specialization ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                                        required
                                    >
                                        <option value="">Select specialization</option>
                                        {SPECIALIZATIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {fieldErrors.specialization && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.specialization}</p>
                                    )}
                                </div>
                                <Input
                                    label={withRequiredMark('Medical License Number', true)}
                                    value={licenseNumber}
                                    onChange={(e) => { setLicenseNumber(e.target.value); setFieldErrors(p => { const { licenseNumber, ...rest } = p; return rest; }); }}
                                    placeholder="Enter medical license number"
                                    leftIcon={<FileText className="h-5 w-5" />}
                                    error={fieldErrors.licenseNumber}
                                    required
                                />
                                <Input
                                    label={withRequiredMark('Years of Experience', true)}
                                    type="number"
                                    value={experience}
                                    onChange={(e) => { setExperience(e.target.value); setFieldErrors(p => { const { experience, ...rest } = p; return rest; }); }}
                                    placeholder="Enter years of experience"
                                    error={fieldErrors.experience}
                                    required
                                />
                            </>
                        )}

                        {(config.role === 'pharmacy_owner' || config.role === 'hospital_owner' || config.role === 'clinic_owner' || config.role === 'diagnostic_center_owner') && (
                            <>
                                <Input
                                    label={withRequiredMark('License / Registration Number', true)}
                                    value={licenseNumber}
                                    onChange={(e) => { setLicenseNumber(e.target.value); setFieldErrors(p => { const { licenseNumber, ...rest } = p; return rest; }); }}
                                    placeholder="Enter facility license or registration number"
                                    leftIcon={<FileText className="h-5 w-5" />}
                                    error={fieldErrors.licenseNumber}
                                    required
                                />
                                <Input
                                    label={withRequiredMark('Address', true)}
                                    value={address}
                                    onChange={(e) => { setAddress(e.target.value); setFieldErrors(p => { const { address, ...rest } = p; return rest; }); }}
                                    placeholder="Full Address"
                                    leftIcon={<MapPin className="h-5 w-5" />}
                                    error={fieldErrors.address}
                                    required
                                />
                                <LocationPicker
                                    latitude={latitude}
                                    longitude={longitude}
                                    address={address}
                                    onLocationChange={(lat, lng) => {
                                        if (lat === 0 && lng === 0) {
                                            setLatitude(null);
                                            setLongitude(null);
                                        } else {
                                            setLatitude(lat);
                                            setLongitude(lng);
                                        }
                                        setFieldErrors((p) => {
                                            const { location, ...rest } = p;
                                            return rest;
                                        });
                                    }}
                                    accentColor={config.bgColor.replace('bg-', '').replace('-600', '')}
                                    label={withRequiredMark('Pin your facility on the map', true)}
                                    height="250px"
                                />
                                {fieldErrors.location && (
                                    <p className="text-sm text-red-600 dark:text-red-400 -mt-2">{fieldErrors.location}</p>
                                )}
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={withRequiredMark('Password', true)}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => { const { password, ...rest } = p; return rest; }); }}
                                placeholder="******"
                                leftIcon={<Lock className="h-5 w-5" />}
                                error={fieldErrors.password}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="hover:text-gray-600 dark:text-gray-400"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                }
                                required
                            />
                            <Input
                                label={withRequiredMark('Confirm Password', true)}
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => { const { confirmPassword, ...rest } = p; return rest; }); }}
                                placeholder="******"
                                leftIcon={<Lock className="h-5 w-5" />}
                                error={fieldErrors.confirmPassword}
                                required
                            />
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                            {approvalHint}
                        </div>

                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className={`w-full ${config.bgColor} ${config.hoverColor} text-white mt-6`}
                        >
                            Complete Registration
                        </Button>
                    </form>

                    <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm">
                        Already have an account?{' '}
                        <Link href={`/login/${role}`} className={`${config.color} hover:underline font-medium`}>
                            Sign In
                        </Link>
                    </p>
                    </>
                    )}
                </Card>
            </div>
        </div>
    );
}
