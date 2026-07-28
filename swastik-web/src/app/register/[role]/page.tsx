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
    CheckCircle,
    GraduationCap,
    IndianRupee,
    Languages
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
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [experience, setExperience] = useState('');
    const [qualification, setQualification] = useState('');
    const [consultationFee, setConsultationFee] = useState('');
    const [languages, setLanguages] = useState('');
    const [bio, setBio] = useState('');
    const [isEmergencyAvailable, setIsEmergencyAvailable] = useState(false);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [hospitalType, setHospitalType] = useState('Private');

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
            if (!registrationNumber.trim()) errors.registrationNumber = 'Medical registration number is required';
            if (!licenseNumber.trim()) errors.licenseNumber = 'License number is required';
            if (!specialization.trim()) errors.specialization = 'Specialization is required';
            if (!qualification.trim()) errors.qualification = 'Medical qualification or degree is required';
            if (!experience.trim()) errors.experience = 'Years of experience is required';
            else if (!Number.isFinite(Number(experience)) || Number(experience) < 0) errors.experience = 'Experience must be a non-negative number';
            if (!consultationFee.trim()) errors.consultationFee = 'Consultation fee is required';
            else if (!Number.isFinite(Number(consultationFee)) || Number(consultationFee) < 0) errors.consultationFee = 'Consultation fee must be a non-negative number';
        } else {
            if (!facilityName.trim()) errors.facilityName = 'Facility name is required';
            if (!licenseNumber.trim()) errors.licenseNumber = 'License/Registration number is required';
            if (!address.trim()) errors.address = 'Address is required';
            if (!city.trim()) errors.city = 'City is required';
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
                        registration_number: registrationNumber.trim(),
                        license_number: licenseNumber,
                        qualifications: [qualification.trim()],
                        experience_years: Number.parseInt(experience, 10),
                        consultation_fee: Number.parseFloat(consultationFee),
                        languages: languages.split(',').map((item) => item.trim()).filter(Boolean),
                        bio: bio.trim() || undefined,
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
                        city: city.trim(),
                        ...(state.trim() ? { state: state.trim() } : {}),
                        ...(pincode.trim() ? { pincode: pincode.trim() } : {}),
                        ...(latitude != null && longitude != null && !(latitude === 0 && longitude === 0) ? { latitude, longitude } : {}),
                        ...(config.role === 'hospital_owner' ? { is_emergency_available: isEmergencyAvailable, type: hospitalType } : {}),
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
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#050505] overflow-hidden font-sans text-slate-200 py-12 px-4">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-vd-forest/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
            </div>

            <div className="w-full max-w-4xl z-10 flex flex-col items-center">
                <Link
                    href={`/login/${role}`}
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Login</span>
                </Link>

                <div className="flex justify-center transition-colors duration-500 relative group w-full max-w-2xl">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-gray-500/30 to-gray-800/30 rounded-[2rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col gap-6 transition-all duration-500 [&_label]:!text-white/60 [&_label]:!text-xs [&_label]:!font-medium [&_label]:uppercase [&_label]:tracking-wider [&_input]:!bg-white/[0.03] [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/30 [&_input]:focus:!border-white/30 [&_input]:focus:!bg-white/[0.05] [&_input]:!rounded-xl [&_input]:!py-3.5 [&_.text-gray-600]:!text-white/40 [&_.dark\:text-gray-500]:!text-white/40 [&_select]:!bg-[#0A0A0A] [&_select]:!border-white/10 [&_select]:!text-white [&_textarea]:!bg-white/[0.03] [&_textarea]:!border-white/10 [&_textarea]:!text-white [&_textarea]:placeholder:!text-white/30">
                        {verificationSent ? (
                            <div className="text-center py-6">
                                <div className="inline-flex p-3 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                                    <CheckCircle className="h-10 w-10 text-green-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">
                                    {verificationComplete ? 'Email Verified' : 'Enter Verification Code'}
                                </h1>
                                <p className="text-white/60 mt-3 text-sm leading-relaxed max-w-xs mx-auto">
                                    {verificationComplete ? (
                                        <>Your email for <strong className="text-white">{email}</strong> is verified. You can now sign in and continue to approval review.</>
                                    ) : (
                                        <>We&apos;ve sent a 6-digit verification code to <strong className="text-white">{email}</strong>. Enter it below to activate your account.</>
                                    )}
                                </p>
                                {verificationInfo && (
                                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium">
                                        {verificationInfo}
                                    </div>
                                )}
                                {verificationError && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                        {verificationError}
                                    </div>
                                )}
                                {!verificationComplete && (
                                    <div className="mt-6 space-y-5 text-left">
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
                                            className="w-full bg-white text-black hover:bg-gray-200 py-4 font-semibold rounded-xl"
                                        >
                                            Verify Email OTP
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendingOtp || resendCooldown > 0}
                                            className="w-full text-sm font-semibold text-white/70 hover:text-white disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5 mt-2"
                                        >
                                            <Mail className="h-4 w-4" />
                                            {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification code'}
                                        </button>
                                    </div>
                                )}
                                <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
                                    <Link href={`/login/${role}`}>
                                        <Button className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all">
                                            <span className="relative z-10">Go to Login</span>
                                        </Button>
                                    </Link>
                                    <p className="text-white/40 text-xs mt-4">
                                        Didn&apos;t receive it? Check your spam folder and confirm the email address above before requesting another code.
                                    </p>
                                </div>
                            </div>
                        ) : (
                        <>
                        <div className="text-center mb-6">
                            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-gray-200 to-white text-black shadow-sm mb-4">
                                <Icon className="h-8 w-8" />
                            </div>
                            <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">{config.title}</h1>
                            <p className="text-white/50 text-sm font-light">{config.subtitle}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
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
                                        <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider pl-1">
                                            {withRequiredMark('Specialization', true)}
                                        </label>
                                        <select
                                            value={specialization}
                                            onChange={(e) => { setSpecialization(e.target.value); setFieldErrors(p => { const { specialization, ...rest } = p; return rest; }); }}
                                            className={`w-full px-4 py-3.5 border rounded-xl text-white focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all appearance-none ${fieldErrors.specialization ? '!border-red-400' : 'border-white/10 bg-white/[0.03]'}`}
                                            required
                                        >
                                            <option value="" className="text-black">Select specialization</option>
                                            {SPECIALIZATIONS.map(s => (
                                                <option key={s} value={s} className="text-black">{s}</option>
                                            ))}
                                        </select>
                                        {fieldErrors.specialization && (
                                            <p className="text-sm text-red-400 mt-1.5">{fieldErrors.specialization}</p>
                                        )}
                                    </div>
                                    <Input
                                        label={withRequiredMark('Medical Registration Number', true)}
                                        value={registrationNumber}
                                        onChange={(e) => { setRegistrationNumber(e.target.value); setFieldErrors(p => { const { registrationNumber, ...rest } = p; return rest; }); }}
                                        placeholder="Enter medical registration number"
                                        leftIcon={<FileText className="h-5 w-5" />}
                                        error={fieldErrors.registrationNumber}
                                        required
                                    />
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
                                        label={withRequiredMark('Medical Degree / Qualification', true)}
                                        value={qualification}
                                        onChange={(e) => { setQualification(e.target.value); setFieldErrors(p => { const { qualification, ...rest } = p; return rest; }); }}
                                        placeholder="Example: MBBS, MD Internal Medicine"
                                        leftIcon={<GraduationCap className="h-5 w-5" />}
                                        error={fieldErrors.qualification}
                                        required
                                    />
                                    <Input
                                        label={withRequiredMark('Years of Experience', true)}
                                        type="number"
                                        value={experience}
                                        onChange={(e) => { setExperience(e.target.value); setFieldErrors(p => { const { experience, ...rest } = p; return rest; }); }}
                                        placeholder="Enter years of experience"
                                        leftIcon={<Briefcase className="h-5 w-5" />}
                                        error={fieldErrors.experience}
                                        min="0"
                                        required
                                    />
                                    <Input
                                        label={withRequiredMark('Consultation Fee', true)}
                                        type="number"
                                        value={consultationFee}
                                        onChange={(e) => { setConsultationFee(e.target.value); setFieldErrors(p => { const { consultationFee, ...rest } = p; return rest; }); }}
                                        placeholder="Enter consultation fee in INR"
                                        leftIcon={<IndianRupee className="h-5 w-5" />}
                                        error={fieldErrors.consultationFee}
                                        min="0"
                                        required
                                    />
                                    <Input
                                        label="Languages"
                                        value={languages}
                                        onChange={(e) => setLanguages(e.target.value)}
                                        placeholder="Example: Hindi, English, Marathi"
                                        leftIcon={<Languages className="h-5 w-5" />}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider pl-1">
                                            Profile Summary
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Short clinical background, areas of focus, and patient-care approach"
                                            rows={3}
                                            className="w-full px-4 py-3.5 border border-white/10 rounded-xl text-white bg-white/[0.03] placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all"
                                        />
                                    </div>
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
                                    {config.role === 'hospital_owner' && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-white/60 mb-2 uppercase tracking-wider pl-1">
                                                {withRequiredMark('Hospital Type', true)}
                                            </label>
                                            <select
                                                value={hospitalType}
                                                onChange={(e) => setHospitalType(e.target.value)}
                                                className="w-full px-4 py-3.5 border rounded-xl text-white border-white/10 bg-white/[0.03] focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all appearance-none"
                                                required
                                            >
                                                <option value="Private" className="text-black">Private</option>
                                                <option value="Government" className="text-black">Government</option>
                                            </select>
                                        </div>
                                    )}
                                    <Input
                                        label={withRequiredMark('Address', true)}
                                        value={address}
                                        onChange={(e) => { setAddress(e.target.value); setFieldErrors(p => { const { address, ...rest } = p; return rest; }); }}
                                        placeholder="Full Address"
                                        leftIcon={<MapPin className="h-5 w-5" />}
                                        error={fieldErrors.address}
                                        required
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label={withRequiredMark('City', true)}
                                            value={city}
                                            onChange={(e) => { setCity(e.target.value); setFieldErrors(p => { const { city, ...rest } = p; return rest; }); }}
                                            placeholder="e.g. Mumbai"
                                            error={fieldErrors.city}
                                            required
                                        />
                                        <Input
                                            label="State"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="e.g. Maharashtra"
                                        />
                                        <Input
                                            label="Pincode"
                                            value={pincode}
                                            onChange={(e) => setPincode(e.target.value)}
                                            placeholder="e.g. 400001"
                                        />
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-white/10 relative mt-2 mb-4 bg-white/[0.02]">
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
                                            accentColor="black"
                                            label={withRequiredMark('Pin your facility on the map', true)}
                                            height="300px"
                                        />
                                    </div>
                                    {fieldErrors.location && (
                                        <p className="text-sm text-red-400 mt-1">{fieldErrors.location}</p>
                                    )}
                                    {(config.role === 'hospital_owner' || config.role === 'clinic_owner') && (
                                        <div className="flex items-center space-x-3 mt-4 mb-2 p-4 border border-white/10 rounded-xl bg-white/[0.02]">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="emergency_available"
                                                    checked={isEmergencyAvailable}
                                                    onChange={(e) => setIsEmergencyAvailable(e.target.checked)}
                                                    className="peer appearance-none w-5 h-5 border border-white/20 rounded bg-white/[0.03] checked:bg-white checked:border-white transition-all cursor-pointer"
                                                />
                                                <svg className="absolute w-3 h-3 text-black left-1 top-1 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <label htmlFor="emergency_available" className="text-sm font-medium text-white/80 cursor-pointer">
                                                24/7 Emergency Services Available
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
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
                                            className="hover:text-white text-white/40 transition-colors"
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

                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-400 mt-4 leading-relaxed font-medium">
                                {approvalHint}
                            </div>

                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    isLoading={isLoading}
                                    className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-gray-200 to-white !text-black py-6 rounded-xl font-semibold tracking-wide border-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all"
                                >
                                    <span className="relative z-10">Complete Registration</span>
                                </Button>
                            </div>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/10 text-center">
                            <p className="text-white/50 text-sm">
                                Already have an account?{' '}
                                <Link href={`/login/${role}`} className="text-white font-medium hover:underline decoration-white/30 ml-1 transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                        </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
