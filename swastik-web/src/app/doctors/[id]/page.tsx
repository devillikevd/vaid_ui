/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Star,
    CheckCircle2,
    MapPin,
    Clock,
    Languages,
    Award,
    BookOpen,
    ShieldCheck,
    Video,
    Building2,
    CalendarCheck,
    ChevronRight,
    ArrowLeft,
    Phone,
    FileText,
    ChevronDown,
    ChevronUp,
    Sparkles,
    AlertCircle,
    User,
    Check,
    X,
    ExternalLink
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { PatientBookingWidget } from '@/components/patient/PatientBookingWidget';
import { doctorApi } from '@/lib/api';

function PublicDoctorProfileContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const rawMode = searchParams.get('mode') || searchParams.get('type');
    const mode: 'in_person' | 'video' = rawMode === 'video' ? 'video' : 'in_person';
    const categoryParam = searchParams.get('specialization') || searchParams.get('category');

    const doctorId = params.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);
    const [isBioExpanded, setIsBioExpanded] = useState(false);
    const [allReviewsOpen, setAllReviewsOpen] = useState(false);

    const loadDoctor = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await doctorApi.getPublicDoctorById(doctorId);
            if (res.success && res.data) {
                setData(res.data);
            } else {
                setError('Doctor not found');
            }
        } catch (err: any) {
            console.error('Failed to load doctor profile:', err);
            setError(err?.message || 'Unable to load doctor profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (doctorId) {
            loadDoctor();
        }
    }, [doctorId]);

    // Loading Skeleton State
    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                    {/* Skeleton Breadcrumb */}
                    <div className="h-4 w-48 bg-stone-200 rounded-md animate-pulse mb-6" />

                    {/* Skeleton Hero */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs mb-8">
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-stone-200 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-3 w-full">
                                <div className="h-8 w-64 bg-stone-200 rounded-lg animate-pulse" />
                                <div className="h-4 w-40 bg-stone-200 rounded-md animate-pulse" />
                                <div className="flex gap-2 pt-2">
                                    <div className="h-6 w-24 bg-stone-200 rounded-full animate-pulse" />
                                    <div className="h-6 w-32 bg-stone-200 rounded-full animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skeleton Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="h-48 bg-white rounded-3xl border border-stone-200/80 animate-pulse" />
                            <div className="h-48 bg-white rounded-3xl border border-stone-200/80 animate-pulse" />
                        </div>
                        <div className="h-96 bg-white rounded-3xl border border-stone-200/80 animate-pulse" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const doctor = data?.doctor || (data?.id ? data : null);

    // Error or Not Found State
    if (!doctor || error) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 mb-2">
                        Doctor Profile Not Found
                    </h1>
                    <p className="text-stone-500 text-sm max-w-md mb-6 font-light">
                        {error || "The doctor profile you are looking for is currently unavailable or doesn't exist."}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadDoctor}
                            className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                            Try Again
                        </button>
                        <Link
                            href="/doctors"
                            className="px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            Browse All Doctors
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const rawName = doctor.name || 'Specialist Doctor';
    const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
    const initials = rawName.replace(/^(Dr\.|Dr)\s+/i, '').charAt(0) || 'D';

    const rawClinicFee = doctor.consultation_fee ?? doctor.consultationFee;
    const hasClinicFee = rawClinicFee !== null && rawClinicFee !== undefined && !isNaN(Number(rawClinicFee));
    const clinicFee = hasClinicFee ? Number(rawClinicFee) : null;

    const rawVideoFee = doctor.video_consultation_fee ?? doctor.videoConsultationFee;
    const hasVideoFee = rawVideoFee !== null && rawVideoFee !== undefined && !isNaN(Number(rawVideoFee));
    const videoFee = hasVideoFee ? Number(rawVideoFee) : null;

    const consultationTypes = doctor.consultation_types || doctor.consultationTypes || [];
    const supportsVideo = hasVideoFee || consultationTypes.includes('Video') || consultationTypes.includes('video');
    const supportsClinic = hasClinicFee || consultationTypes.includes('In-Person') || consultationTypes.includes('in_person') || consultationTypes.includes('Clinic') || consultationTypes.includes('clinic');

    const expYears = doctor.experience_years ?? doctor.experienceYears ?? doctor.experience;
    const rawRating = doctor.rating ? Number(doctor.rating) : null;
    const rating = rawRating && rawRating > 0 ? rawRating : null;
    const rawReviewsCount = doctor.total_reviews ?? doctor.totalReviews;
    const totalReviews = rawReviewsCount !== null && rawReviewsCount !== undefined ? Number(rawReviewsCount) : 0;

    const languages = Array.isArray(doctor.languages) ? doctor.languages.filter(Boolean) : [];
    const qualifications = Array.isArray(doctor.qualifications)
        ? doctor.qualifications.filter(Boolean)
        : (typeof doctor.qualifications === 'string' && doctor.qualifications.trim() ? [doctor.qualifications] : []);

    const educationList = Array.isArray(doctor.education) ? doctor.education.filter(Boolean) : [];
    const awardsList = Array.isArray(doctor.awards) ? doctor.awards.filter(Boolean) : [];

    // Affiliations
    const rawClinics = data?.clinics || data?.affiliatedClinics || doctor.affiliatedClinics || [];
    const rawHospitals = data?.hospitals || data?.affiliatedHospitals || doctor.affiliatedHospitals || (doctor.hospital ? [doctor.hospital] : []);

    // Filter out invalid/empty affiliations
    const validClinics = rawClinics.filter((c: any) => c && (c.name || c.clinic?.name));
    const validHospitals = rawHospitals.filter((h: any) => h && (h.name || h.hospital?.name));

    // Reviews and Distribution
    const reviewsList: any[] = data?.reviews || doctor.reviews || [];
    const reviewDistribution = data?.reviewDistribution || doctor.reviewDistribution || {};

    const checklist = {
        degree_verified: doctor.degree_verified !== false,
        registration_verified: Boolean(doctor.registration_number || doctor.medical_registration_number || doctor.registration_verified),
        email_verified: Boolean(doctor.email_verified ?? true),
        clinic_verified: Boolean(doctor.clinic_address || doctor.hospital_name || doctor.clinic_verified),
    };

    const trustBadges = [
        { label: 'Degree Verified', show: checklist.degree_verified, icon: BookOpen },
        { label: 'Medical Council Verified', show: checklist.registration_verified, icon: Award },
        { label: 'Email Verified', show: checklist.email_verified, icon: CheckCircle2 },
        { label: 'Clinic Facility Verified', show: checklist.clinic_verified, icon: Building2 },
    ].filter(b => b.show);

    const backUrl = categoryParam
        ? `/doctors?mode=${mode}&specialization=${encodeURIComponent(categoryParam)}`
        : `/doctors?mode=${mode}`;

    const bioText = doctor.bio?.trim();
    const isLongBio = bioText && bioText.length > 280;

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full space-y-6 sm:space-y-8">
                {/* Top Breadcrumbs & Back Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-stone-500 font-medium overflow-hidden">
                        <Link href="/" className="hover:text-vd-forest transition-colors">
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <Link href={`/doctors?mode=${mode}`} className="hover:text-vd-forest transition-colors">
                            Find Doctors
                        </Link>
                        {categoryParam && (
                            <>
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <Link
                                    href={`/doctors?mode=${mode}&specialization=${encodeURIComponent(categoryParam)}`}
                                    className="hover:text-vd-forest transition-colors truncate max-w-[120px]"
                                >
                                    {categoryParam}
                                </Link>
                            </>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-stone-900 font-bold truncate max-w-[160px] sm:max-w-xs">
                            {displayName}
                        </span>
                    </div>

                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-vd-forest hover:text-vd-forest-deep transition-colors bg-white px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Doctors</span>
                    </Link>
                </div>

                {/* Hero Header Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-50/60 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />

                    <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start relative z-1">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {doctor.profile_image_url && !imgError ? (
                                <img
                                    src={doctor.profile_image_url}
                                    alt={displayName}
                                    onError={() => setImgError(true)}
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-2 border-stone-200/80 shadow-sm"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-emerald-100/90 text-vd-forest font-heading font-bold text-3xl sm:text-4xl flex items-center justify-center border-2 border-emerald-200/60 shadow-sm">
                                    {initials}
                                </div>
                            )}
                            {doctor.is_approved && (
                                <div
                                    title="Verified Medical Practitioner"
                                    className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-2xl shadow-md border-2 border-white flex items-center justify-center"
                                >
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                            )}
                        </div>

                        {/* Core Details */}
                        <div className="flex-1 space-y-3 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h1 className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 leading-tight">
                                    {displayName}
                                </h1>
                                {doctor.is_approved && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Verified</span>
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-vd-forest">
                                <span>{doctor.specialization}</span>
                                {qualifications.length > 0 && (
                                    <>
                                        <span className="text-stone-300">•</span>
                                        <span className="text-stone-500 font-normal text-xs sm:text-sm">
                                            {qualifications.join(', ')}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Meta Tags Row */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {rating !== null ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span>{rating.toFixed(1)}</span>
                                        {totalReviews > 0 && (
                                            <span className="text-amber-700/80 font-medium text-[11px]">
                                                ({totalReviews} reviews)
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-xl border border-stone-200">
                                        New Specialist
                                    </span>
                                )}

                                {expYears !== null && expYears !== undefined && Number(expYears) > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium">
                                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                                        <span>{Number(expYears)} Years Experience</span>
                                    </span>
                                )}

                                {languages.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium">
                                        <Languages className="w-3.5 h-3.5 text-stone-500" />
                                        <span>{languages.join(', ')}</span>
                                    </span>
                                )}

                                {doctor.registration_number && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 text-xs font-mono">
                                        <span>Reg: {doctor.registration_number}</span>
                                    </span>
                                )}
                            </div>

                            {/* Consultation Capabilities Strip */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
                                {supportsClinic && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold">
                                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>
                                            In-Clinic Visit: {clinicFee !== null ? `₹${clinicFee}` : 'Fee at booking'}
                                        </span>
                                    </div>
                                )}

                                {supportsVideo && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
                                        <Video className="w-3.5 h-3.5 text-blue-600" />
                                        <span>
                                            {videoFee !== null ? `Video Consult: ₹${videoFee}` : 'Video Consultation Available'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Trust Badges Bar */}
                    {trustBadges.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-stone-100">
                            <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2.5">
                                Verification & Credentials
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {trustBadges.map((b, idx) => (
                                    <div
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-50 border border-stone-200/80 text-stone-700 text-xs font-medium"
                                    >
                                        <b.icon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>{b.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main 2-Column Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column (2 Cols): Doctor Details, Credentials, Locations, Reviews */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                        {/* 1. About Section */}
                        {bioText && (
                            <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-3">
                                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                                    <FileText className="w-5 h-5 text-vd-forest" />
                                    <h2>About {displayName}</h2>
                                </div>

                                <div className="text-stone-600 text-xs sm:text-sm leading-relaxed font-light">
                                    <p className={!isBioExpanded && isLongBio ? 'line-clamp-4' : ''}>
                                        {bioText}
                                    </p>
                                </div>

                                {isLongBio && (
                                    <button
                                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-vd-forest hover:text-vd-forest-deep transition-colors cursor-pointer pt-1"
                                    >
                                        <span>{isBioExpanded ? 'Read Less' : 'Read More'}</span>
                                        {isBioExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </section>
                        )}

                        {/* 2. Credentials & Achievements */}
                        {(qualifications.length > 0 || educationList.length > 0 || awardsList.length > 0) && (
                            <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-5">
                                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                                    <Award className="w-5 h-5 text-vd-forest" />
                                    <h2>Credentials & Qualifications</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {qualifications.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                                            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                                                Medical Degrees
                                            </h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {qualifications.map((q: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs"
                                                    >
                                                        {q}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {educationList.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                                            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                                                Education & Training
                                            </h3>
                                            <ul className="space-y-1.5 text-xs text-stone-600 font-medium">
                                                {educationList.map((edu: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-vd-forest mt-1.5 shrink-0" />
                                                        <span>{edu}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {awardsList.length > 0 && (
                                        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2 sm:col-span-2">
                                            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                                                Awards & Recognitions
                                            </h3>
                                            <ul className="space-y-1.5 text-xs text-stone-600 font-medium">
                                                {awardsList.map((award: string, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                                                        <span>{award}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* 3. Practice Locations (Only if real affiliations exist) */}
                        {(validClinics.length > 0 || validHospitals.length > 0) && (
                            <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                                        <Building2 className="w-5 h-5 text-vd-forest" />
                                        <h2>Practice Locations & Affiliations</h2>
                                    </div>
                                    <span className="text-xs font-semibold text-stone-500">
                                        {validClinics.length + validHospitals.length} Verified Facilities
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {validClinics.map((c: any, idx: number) => {
                                        const clinicObj = c.clinic || c;
                                        const fee = c.consultation_fee || clinicObj.consultation_fee;

                                        return (
                                            <div
                                                key={clinicObj.id || idx}
                                                className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-2 flex flex-col justify-between"
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-vd-forest flex items-center justify-center shrink-0">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                                                                {clinicObj.name}
                                                            </h4>
                                                            <span className="text-[10px] font-semibold text-vd-forest uppercase tracking-wider">
                                                                Partner Clinic
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {(clinicObj.address || clinicObj.city) && (
                                                        <p className="text-xs text-stone-600 flex items-start gap-1.5 pl-0.5">
                                                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                                                            <span>
                                                                {[clinicObj.address, clinicObj.city].filter(Boolean).join(', ')}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>

                                                {fee && (
                                                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                                                        <span className="text-stone-500 font-light">Consultation Fee</span>
                                                        <span className="font-bold text-vd-forest font-mono">₹{fee}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {validHospitals.map((h: any, idx: number) => {
                                        const hospitalObj = h.hospital || h;

                                        return (
                                            <div
                                                key={hospitalObj.id || idx}
                                                className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-2 flex flex-col justify-between"
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                                                                {hospitalObj.name}
                                                            </h4>
                                                            <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                                                                {h.department || h.designation || 'Hospital Care'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {(hospitalObj.address || hospitalObj.city) && (
                                                        <p className="text-xs text-stone-600 flex items-start gap-1.5 pl-0.5">
                                                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                                                            <span>
                                                                {[hospitalObj.address, hospitalObj.city].filter(Boolean).join(', ')}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* 4. Patient Reviews */}
                        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    <h2>Patient Reviews & Experiences</h2>
                                </div>

                                {rating !== null && (
                                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`w-4 h-4 ${
                                                        s <= Math.round(rating)
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-stone-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span>{rating.toFixed(1)} out of 5</span>
                                        <span className="text-stone-400 font-normal">({totalReviews} reviews)</span>
                                    </div>
                                )}
                            </div>

                            {reviewsList.length === 0 ? (
                                <div className="py-8 text-center bg-stone-50/60 rounded-2xl border border-stone-100 space-y-2">
                                    <User className="w-8 h-8 text-stone-300 mx-auto" />
                                    <h4 className="text-xs font-bold text-stone-700">No Patient Reviews Yet</h4>
                                    <p className="text-[11px] text-stone-500 font-light max-w-xs mx-auto">
                                        Reviews from verified consultations will appear here after completed appointments.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviewsList.slice(0, 4).map((r: any, idx: number) => {
                                        const patientName = r.patient?.name || 'Verified Patient';
                                        const patientInitial = patientName.charAt(0) || 'P';
                                        const reviewRating = Number(r.rating) || 5;

                                        return (
                                            <div
                                                key={r.id || idx}
                                                className="p-4 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-2"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-vd-forest font-bold text-xs flex items-center justify-center">
                                                            {patientInitial}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-stone-800 leading-tight">
                                                                {patientName}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <div className="flex">
                                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                                        <Star
                                                                            key={s}
                                                                            className={`w-3 h-3 ${
                                                                                s <= reviewRating
                                                                                    ? 'text-amber-400 fill-amber-400'
                                                                                    : 'text-stone-200'
                                                                            }`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-[10px] text-stone-400 font-medium ml-1">
                                                                    {r.created_at
                                                                        ? new Date(r.created_at).toLocaleDateString(undefined, {
                                                                              month: 'short',
                                                                              day: 'numeric',
                                                                              year: 'numeric',
                                                                          })
                                                                        : 'Recent Consultation'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {r.comment && (
                                                    <p className="text-xs text-stone-600 font-light leading-relaxed pl-9">
                                                        &ldquo;{r.comment}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {reviewsList.length > 4 && (
                                        <button
                                            onClick={() => setAllReviewsOpen(true)}
                                            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            View All {reviewsList.length} Reviews
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column (1 Col): Sticky Booking Panel */}
                    <div className="lg:sticky lg:top-24 space-y-4">
                        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-md">
                            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
                                <div className="flex items-center gap-2">
                                    <CalendarCheck className="w-5 h-5 text-vd-forest" />
                                    <h3 className="font-heading font-bold text-base text-stone-900">
                                        Book Appointment
                                    </h3>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-vd-forest border border-emerald-200 uppercase tracking-wider">
                                    {mode === 'video' ? 'Video' : 'In-Clinic'}
                                </span>
                            </div>

                            {/* Reuse the battle-tested PatientBookingWidget */}
                            <PatientBookingWidget doctor={doctor} mode={mode} />
                        </div>
                    </div>
                </div>
            </main>

            {/* All Reviews Modal Dialog */}
            {allReviewsOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setAllReviewsOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                <h3 className="font-heading font-bold text-lg text-stone-900">
                                    All Patient Reviews ({reviewsList.length})
                                </h3>
                            </div>
                            <button
                                onClick={() => setAllReviewsOpen(false)}
                                className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                            {reviewsList.map((r: any, idx: number) => {
                                const patientName = r.patient?.name || 'Verified Patient';
                                const reviewRating = Number(r.rating) || 5;

                                return (
                                    <div
                                        key={r.id || idx}
                                        className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-stone-800">
                                                {patientName}
                                            </span>
                                            <span className="text-[10px] text-stone-400">
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`w-3 h-3 ${
                                                        s <= reviewRating
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-stone-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        {r.comment && (
                                            <p className="text-xs text-stone-600 font-light">
                                                &ldquo;{r.comment}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-3 border-t border-stone-100 text-right">
                            <button
                                onClick={() => setAllReviewsOpen(false)}
                                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

export default function PublicDoctorProfile() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-stone-50 flex flex-col">
                    <Navbar />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-vd-forest" />
                    </div>
                    <Footer />
                </div>
            }
        >
            <PublicDoctorProfileContent />
        </Suspense>
    );
}
