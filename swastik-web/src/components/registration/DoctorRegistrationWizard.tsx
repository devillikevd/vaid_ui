'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Stethoscope, Mail, Lock, User, Phone, CheckCircle,
    ArrowLeft, Eye, EyeOff, Upload, Camera, FileText, IndianRupee, MapPin, Edit3, Clock, Save
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { authApi, doctorApi } from '@/lib/api';
import { FileUpload } from '@/components/shared/FileUpload';
import { LiveSelfie } from './LiveSelfie';

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

const COUNCILS = [
    'Medical Council of India (MCI)',
    'Delhi Medical Council',
    'Maharashtra Medical Council',
    'Karnataka Medical Council',
    'Tamil Nadu Medical Council',
    'Uttar Pradesh Medical Council',
    'Andhra Pradesh Medical Council',
    'Kerala Medical Council',
    'Rajasthan Medical Council',
    'Other'
];

export default function DoctorRegistrationWizard() {
    const router = useRouter();
    
    // Core State
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    // Step 1: Basic & Verification
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [otpError, setOtpError] = useState('');

    // Step 2: Professional Details
    const [specialization, setSpecialization] = useState('');
    const [council, setCouncil] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [registrationDate, setRegistrationDate] = useState('');
    const [validTill, setValidTill] = useState('');
    const [experience, setExperience] = useState('');
    
    // Qualifications structure
    const [qualifications, setQualifications] = useState([{ degree: '', university: '', passingYear: '', college: '', specialization: '' }]);

    // Consultation Types & Fees
    const [consultationTypes, setConsultationTypes] = useState({ video: false, clinic: false, home: false, emergency: false });
    const [videoFee, setVideoFee] = useState('');
    const [clinicFee, setClinicFee] = useState('');
    const [homeFee, setHomeFee] = useState('');
    const [emergencyFee, setEmergencyFee] = useState('');

    // Clinic & Bank Details
    const [clinicName, setClinicName] = useState('');
    const [clinicAddress, setClinicAddress] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankUpi, setBankUpi] = useState('');

    // Step 3: Documents & Selfie
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [medicalDegree, setMedicalDegree] = useState<File | null>(null);
    const [registrationCert, setRegistrationCert] = useState<File | null>(null);
    const [govtIdType, setGovtIdType] = useState('Aadhaar');
    const [govtIdFile, setGovtIdFile] = useState<File | null>(null);
    const [panCard, setPanCard] = useState<File | null>(null);
    const [cancelledCheque, setCancelledCheque] = useState<File | null>(null);
    const [clinicLicense, setClinicLicense] = useState<File | null>(null);
    const [digitalSignature, setDigitalSignature] = useState<File | null>(null);
    const [selfieData, setSelfieData] = useState<string | null>(null);
    
    // Auto-save Status
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Legal Consent
    const [legalDocsGenuine, setLegalDocsGenuine] = useState(false);
    const [legalTermsConsent, setLegalTermsConsent] = useState(false);

    // Resend OTP Timer
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0 && otpSent) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer, otpSent]);

    // Password Strength
    const getPasswordStrength = () => {
        if (!password) return { text: '', color: 'bg-gray-700' };
        if (password.length < 8) return { text: 'Weak', color: 'bg-red-500' };
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
        const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
        if (score === 4) return { text: 'Strong', color: 'bg-emerald-500' };
        if (score >= 2) return { text: 'Medium', color: 'bg-yellow-500' };
        return { text: 'Weak', color: 'bg-red-500' };
    };

    const validateStep1 = () => {
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = 'Name is required';
        if (!email.trim()) errors.email = 'Email is required';
        else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errors.email = 'Invalid email';
        if (!phone.trim()) errors.phone = 'Phone number is required';
        if (!password) errors.password = 'Password is required';
        else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
        if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSendOtp = async () => {
        if (!validateStep1()) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await authApi.sendRegistrationOtp(email, name);
            if (res.success) {
                setOtpSent(true);
                setOtpError('');
                setResendTimer(60);
            } else {
                setError(res.error || 'Failed to send OTP');
            }
        } catch (err: any) {
            setError(err.message || 'Error sending OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndCreateDraft = async () => {
        if (!otp || otp.length !== 6) {
            setOtpError('Enter a valid 6-digit OTP');
            return;
        }
        setIsLoading(true);
        setOtpError('');
        try {
            const verifyRes = await authApi.verifyRegistrationOtp(email, otp);
            if (!verifyRes.success) {
                setOtpError(verifyRes.error || 'Invalid OTP');
                setIsLoading(false);
                return;
            }
            
            setIsEmailVerified(true);
            const registerRes = await authApi.register({
                name, email, phone, password, role: 'doctor', is_draft: true
            });
            
            if (registerRes.success) {
                setStep(2);
            } else {
                setError(registerRes.error || 'Failed to create draft account');
            }
        } catch (err: any) {
            setOtpError(err.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const autoSaveProfile = async (data: Record<string, any>) => {
        if (step === 1) return;
        setSaveStatus('saving');
        try {
            await doctorApi.updateProfile(data);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            console.error('Auto-save failed:', err);
            setSaveStatus('idle');
        }
    };

    const validateStep2 = () => {
        const errors: Record<string, string> = {};
        if (!specialization) errors.specialization = 'Required';
        if (!council) errors.council = 'Required';
        if (!registrationNumber) errors.registrationNumber = 'Required';
        if (!experience) errors.experience = 'Required';
        if (!consultationTypes.video && !consultationTypes.clinic && !consultationTypes.home && !consultationTypes.emergency) {
            errors.consultationTypes = 'Select at least one consultation type';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep2 = () => {
        if (!validateStep2()) return;
        autoSaveProfile({
            specialization,
            medical_council: council,
            registration_number: registrationNumber,
            registration_date: registrationDate || undefined,
            registration_valid_till: validTill || undefined,
            experience_months: Number(experience) * 12,
            qualification_details: qualifications,
            video_consultation_fee: consultationTypes.video ? Number(videoFee) : 0,
            consultation_fee: consultationTypes.clinic ? Number(clinicFee) : 0,
            home_visit_consultation_fee: consultationTypes.home ? Number(homeFee) : 0,
            emergency_consultation_fee: consultationTypes.emergency ? Number(emergencyFee) : 0,
            is_emergency_available: consultationTypes.emergency,
            clinic_name: clinicName,
            clinic_address: clinicAddress,
            bank_account_number: bankAccount,
            bank_ifsc: bankIfsc,
            bank_upi: bankUpi,
            consultation_types: Object.entries(consultationTypes).filter(([_, v]) => v).map(([k]) => k)
        });
        setStep(3);
    };

    const handleNextStep3 = () => {
        if (!medicalDegree || !registrationCert || !govtIdFile || !selfieData) {
            setError('Please upload all mandatory documents (Medical Degree, Registration Cert, Govt ID) and complete the Live Selfie.');
            return;
        }
        setError('');
        setStep(4);
    };

    const uploadFile = async (file: File | string | null, type: string) => {
        if (!file) return null;
        await new Promise(r => setTimeout(r, 1000));
        return `https://storage.vaididea.com/${type}/${Date.now()}`;
    };

    const handleFinalSubmit = async () => {
        if (!legalDocsGenuine || !legalTermsConsent) {
            setError('You must accept all legal agreements and terms before submitting.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const urls = {
                profile_image_url: await uploadFile(profilePhoto, 'profile'),
                degree_certificate_url: await uploadFile(medicalDegree, 'degree'),
                license_document_url: await uploadFile(registrationCert, 'registration'),
                government_id_type: govtIdType,
                government_id_url: await uploadFile(govtIdFile, 'govtid'),
                pan_card_url: await uploadFile(panCard, 'pan'),
                cancelled_cheque_url: await uploadFile(cancelledCheque, 'cheque'),
                clinic_license_url: await uploadFile(clinicLicense, 'clinic_license'),
                digital_signature_url: await uploadFile(digitalSignature, 'signature'),
                live_selfie_url: await uploadFile(selfieData, 'selfie')
            };

            await autoSaveProfile(urls);
            const res = await doctorApi.submitForApproval();
            
            if (res.success) {
                setIsSubmitted(true);
            } else {
                setError(res.error || 'Failed to submit profile');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during submission');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">🎉 Welcome to Vaididea</h1>
                    <p className="text-emerald-400 font-medium">Application Submitted Successfully!</p>
                    <div className="bg-white/5 rounded-xl p-4 text-sm text-white/70 space-y-2">
                        <p>Our admin team is currently reviewing your application and documents.</p>
                        <p className="font-semibold text-white">Verification usually takes 24–48 hours.</p>
                    </div>
                    <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4" 
                        onClick={() => router.push('/login/doctor')}
                    >
                        Track Status
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#050505] overflow-hidden font-sans text-slate-200 py-12 px-4">
            <div className="w-full max-w-4xl z-10 flex flex-col items-center">
                <Link href={`/login/doctor`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 self-start">
                    <ArrowLeft className="h-4 w-4" /> <span>Back to Login</span>
                </Link>

                <div className="w-full bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                    {/* Progress Bar Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">Doctor Registration</h1>
                                <p className="text-sm text-white/50 flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Estimated time: 10 mins
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-medium text-emerald-400 block mb-1">Step {step} of 4</span>
                                <span className="text-sm font-medium text-white/60">{Math.round((step / 4) * 100)}%</span>
                            </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-in-out" style={{ width: `${(step / 4) * 100}%` }} />
                        </div>
                        {step > 1 && (
                            <div className="flex justify-between items-center bg-white/5 rounded-lg p-2 px-4">
                                <div className="text-xs text-white/60 flex items-center gap-2">
                                    {saveStatus === 'saving' && <span className="animate-pulse flex items-center gap-1">Saving...</span>}
                                    {saveStatus === 'saved' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Auto-saved</span>}
                                </div>
                                <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs" onClick={() => router.push('/login/doctor')}>
                                    <Save className="h-3 w-3 mr-1" /> Save & Resume Later
                                </Button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-center gap-2">
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Basic & Verification */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} disabled={otpSent} error={fieldErrors.name} />
                            <Input label="Email *" value={email} onChange={e => setEmail(e.target.value)} disabled={otpSent} error={fieldErrors.email} />
                            <Input label="Phone Number *" value={phone} onChange={e => setPhone(e.target.value)} disabled={otpSent} error={fieldErrors.phone} />
                            
                            <div className="relative">
                                <Input label="Password *" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} disabled={otpSent} error={fieldErrors.password} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-10 text-white/40 hover:text-white/80">
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                                <div className="mt-2 flex gap-1 h-1.5">
                                    <div className={`flex-1 rounded-full ${getPasswordStrength().color}`} />
                                    <div className={`flex-1 rounded-full ${password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? getPasswordStrength().color : 'bg-gray-700'}`} />
                                    <div className={`flex-1 rounded-full ${getPasswordStrength().text === 'Strong' ? getPasswordStrength().color : 'bg-gray-700'}`} />
                                </div>
                            </div>
                            
                            <Input label="Confirm Password *" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={otpSent} error={fieldErrors.confirmPassword} />

                            {!otpSent ? (
                                <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSendOtp} isLoading={isLoading}>
                                    Verify Email & Continue
                                </Button>
                            ) : (
                                <div className="mt-6 p-6 border border-emerald-500/30 bg-emerald-500/5 rounded-xl space-y-4">
                                    <h3 className="text-lg font-medium text-emerald-400">Email Verification</h3>
                                    <p className="text-sm text-white/60">Enter the 6-digit code sent to {email}</p>
                                    <Input placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} error={otpError} className="text-center text-2xl tracking-[0.5em]" />
                                    <Button className="w-full bg-emerald-600" onClick={handleVerifyOtpAndCreateDraft} isLoading={isLoading}>
                                        Verify & Create Profile
                                    </Button>
                                    <div className="text-center mt-3">
                                        <button 
                                            type="button" 
                                            onClick={handleSendOtp} 
                                            disabled={resendTimer > 0 || isLoading}
                                            className={`text-sm font-medium transition-colors ${resendTimer > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-emerald-400 hover:text-emerald-300'}`}
                                        >
                                            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: Professional Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-white mb-2">Professional & Clinic Setup</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Specialization *</label>
                                    <select value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white">
                                        <option value="" className="text-black">Select Specialization</option>
                                        {SPECIALIZATIONS.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
                                    </select>
                                    {fieldErrors.specialization && <p className="text-red-400 text-xs mt-1">{fieldErrors.specialization}</p>}
                                </div>
                                <Input label="Years of Experience *" type="number" value={experience} onChange={e => setExperience(e.target.value)} error={fieldErrors.experience} />
                            </div>

                            <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
                                <h3 className="text-sm font-medium text-white/80 uppercase">Medical Registration *</h3>
                                <div>
                                    <select value={council} onChange={e => setCouncil(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white">
                                        <option value="" className="text-black">Select Medical Council</option>
                                        {COUNCILS.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                                    </select>
                                </div>
                                <Input label="Registration Number *" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} error={fieldErrors.registrationNumber} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Registration Date" type="date" value={registrationDate} onChange={e => setRegistrationDate(e.target.value)} />
                                    <Input label="Valid Till (Optional)" type="date" value={validTill} onChange={e => setValidTill(e.target.value)} />
                                </div>
                            </div>

                            <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
                                <h3 className="text-sm font-medium text-white/80 uppercase">Consultation Setup *</h3>
                                {fieldErrors.consultationTypes && <p className="text-red-400 text-xs">{fieldErrors.consultationTypes}</p>}
                                
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-[#0A0A0A]">
                                        <label className="flex items-center gap-2 text-white">
                                            <input type="checkbox" checked={consultationTypes.video} onChange={e => setConsultationTypes({...consultationTypes, video: e.target.checked})} />
                                            Video Consultation
                                        </label>
                                        {consultationTypes.video && <Input placeholder="Fee (₹)" className="w-24" value={videoFee} onChange={e => setVideoFee(e.target.value)} />}
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-[#0A0A0A]">
                                        <label className="flex items-center gap-2 text-white">
                                            <input type="checkbox" checked={consultationTypes.clinic} onChange={e => setConsultationTypes({...consultationTypes, clinic: e.target.checked})} />
                                            Clinic Visit
                                        </label>
                                        {consultationTypes.clinic && <Input placeholder="Fee (₹)" className="w-24" value={clinicFee} onChange={e => setClinicFee(e.target.value)} />}
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-[#0A0A0A]">
                                        <label className="flex items-center gap-2 text-white">
                                            <input type="checkbox" checked={consultationTypes.home} onChange={e => setConsultationTypes({...consultationTypes, home: e.target.checked})} />
                                            Home Visit
                                        </label>
                                        {consultationTypes.home && <Input placeholder="Fee (₹)" className="w-24" value={homeFee} onChange={e => setHomeFee(e.target.value)} />}
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-[#0A0A0A]">
                                        <label className="flex items-center gap-2 text-white">
                                            <input type="checkbox" checked={consultationTypes.emergency} onChange={e => setConsultationTypes({...consultationTypes, emergency: e.target.checked})} />
                                            Emergency Services
                                        </label>
                                        {consultationTypes.emergency && <Input placeholder="Fee (₹)" className="w-24" value={emergencyFee} onChange={e => setEmergencyFee(e.target.value)} />}
                                    </div>
                                </div>

                                {consultationTypes.clinic && (
                                    <div className="pl-6 space-y-3 pt-2">
                                        <Input label="Clinic Name" value={clinicName} onChange={e => setClinicName(e.target.value)} />
                                        <Input label="Clinic Address" value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
                                <h3 className="text-sm font-medium text-white/80 uppercase">Bank Details (Optional for now)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Account Number" value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
                                    <Input label="IFSC Code" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} />
                                    <Input label="UPI ID" value={bankUpi} onChange={e => setBankUpi(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                                <Button className="flex-1 bg-emerald-600 text-white" onClick={handleNextStep2}>Next: Documents</Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Documents & Selfie */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-white mb-2">Document Verification</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <FileUpload label="Profile Photo" accept="image/*" value={profilePhoto} onChange={setProfilePhoto} />
                                    <FileUpload label="Medical Degree *" value={medicalDegree} onChange={setMedicalDegree} />
                                    <FileUpload label="Registration Certificate *" value={registrationCert} onChange={setRegistrationCert} />
                                    <FileUpload label="Digital Signature (For e-Prescriptions)" accept="image/png,image/jpeg" value={digitalSignature} onChange={setDigitalSignature} />
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-3">
                                        <label className="block text-sm font-medium text-gray-300">Government ID *</label>
                                        <select value={govtIdType} onChange={e => setGovtIdType(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2 text-white">
                                            <option className="text-black">Aadhaar</option>
                                            <option className="text-black">Passport</option>
                                            <option className="text-black">Driving License</option>
                                        </select>
                                        <FileUpload label="Upload ID Document" value={govtIdFile} onChange={setGovtIdFile} />
                                    </div>
                                    <FileUpload label="PAN Card" value={panCard} onChange={setPanCard} />
                                    <FileUpload label="Cancelled Cheque (For payouts)" value={cancelledCheque} onChange={setCancelledCheque} />
                                    {consultationTypes.clinic && (
                                        <FileUpload label="Clinic License / Registration" value={clinicLicense} onChange={setClinicLicense} />
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-6 mt-6">
                                <LiveSelfie onCapture={setSelfieData} />
                            </div>

                            <div className="flex gap-4 mt-8">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                                <Button className="flex-1 bg-emerald-600 text-white" onClick={handleNextStep3}>Review Information</Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Review Screen */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-white mb-6">Review Your Information</h2>

                            <div className="space-y-4">
                                <Card className="bg-white/[0.02] border-white/10 p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-medium text-emerald-400">Personal & Contact</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-white/60 hover:text-white h-auto p-1"><Edit3 className="h-4 w-4"/></Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-white/50 block">Name</span>{name}</div>
                                        <div><span className="text-white/50 block">Email</span>{email}</div>
                                        <div><span className="text-white/50 block">Phone</span>{phone}</div>
                                    </div>
                                </Card>

                                <Card className="bg-white/[0.02] border-white/10 p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-medium text-emerald-400">Professional Profile</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-white/60 hover:text-white h-auto p-1"><Edit3 className="h-4 w-4"/></Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div><span className="text-white/50 block">Specialization</span>{specialization}</div>
                                        <div><span className="text-white/50 block">Experience</span>{experience} Years</div>
                                        <div><span className="text-white/50 block">Council</span>{council}</div>
                                        <div><span className="text-white/50 block">Reg. Number</span>{registrationNumber}</div>
                                    </div>
                                    <div className="border-t border-white/10 pt-3 text-sm">
                                        <span className="text-white/50 block mb-1">Consultation Fees</span>
                                        <div className="flex gap-4">
                                            {consultationTypes.video && <span>Video: ₹{videoFee}</span>}
                                            {consultationTypes.clinic && <span>Clinic: ₹{clinicFee}</span>}
                                            {consultationTypes.home && <span>Home: ₹{homeFee}</span>}
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-white/[0.02] border-white/10 p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-medium text-emerald-400">Documents Uploaded</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-white/60 hover:text-white h-auto p-1"><Edit3 className="h-4 w-4"/></Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
                                        <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> Live Selfie Captured</div>
                                        {medicalDegree && <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> Medical Degree</div>}
                                        {registrationCert && <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> Registration Cert</div>}
                                        {govtIdFile && <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> {govtIdType}</div>}
                                        {panCard && <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> PAN Card</div>}
                                        {cancelledCheque && <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500"/> Bank Cheque</div>}
                                    </div>
                                </Card>
                            </div>

                            {/* Legal Agreement */}
                            <div className="p-4 border border-white/10 rounded-xl bg-white/[0.02] space-y-4 mt-6">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input type="checkbox" className="sr-only" checked={legalDocsGenuine} onChange={(e) => setLegalDocsGenuine(e.target.checked)} />
                                        <div className={`w-5 h-5 rounded border ${legalDocsGenuine ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 group-hover:border-emerald-400'} flex items-center justify-center transition-colors`}>
                                            {legalDocsGenuine && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                    </div>
                                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                                        I confirm that all uploaded documents, including my Medical Degree and Registration Certificate, are genuine and accurate.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input type="checkbox" className="sr-only" checked={legalTermsConsent} onChange={(e) => setLegalTermsConsent(e.target.checked)} />
                                        <div className={`w-5 h-5 rounded border ${legalTermsConsent ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 group-hover:border-emerald-400'} flex items-center justify-center transition-colors`}>
                                            {legalTermsConsent && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                    </div>
                                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                                        I accept the Terms & Conditions, Privacy Policy, and give my consent for Vaididea to verify these details with respective medical councils.
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
                                <Button className="flex-1 bg-emerald-600 text-white font-bold" onClick={handleFinalSubmit} isLoading={isLoading}>
                                    Submit Application
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
