'use client';

import React from 'react';
import Link from 'next/link';
import {
    Star,
    CheckCircle2,
    MapPin,
    Building2,
    Video,
    CalendarCheck,
    ArrowRight,
    Compass,
    Sparkles,
    User,
    Clock,
    Shield
} from 'lucide-react';

export interface DoctorCardProps {
    doctor: {
        id: string;
        name: string;
        specialization: string;
        qualifications?: string[] | string | null;
        experience_years?: number | null;
        experienceYears?: number | null;
        experience?: number | null;
        rating?: number | null;
        total_reviews?: number | null;
        totalReviews?: number | null;
        profile_image_url?: string | null;
        profileImageUrl?: string | null;
        consultation_fee?: number | null;
        consultationFee?: number | null;
        video_consultation_fee?: number | null;
        videoConsultationFee?: number | null;
        consultation_types?: string[] | null;
        consultationTypes?: string[] | null;
        bio?: string | null;
        is_approved?: boolean | null;
        is_available?: boolean | null;
        recommendation_reason?: string | null;
        recommendationReason?: string | null;
        distance_km?: number | null;
        distanceKm?: number | null;
        hospital?: {
            id?: string;
            name?: string;
            city?: string;
            address?: string;
        } | null;
        clinic_doctors?: Array<{
            clinic?: {
                id?: string;
                name?: string;
                city?: string;
                address?: string;
            };
        }> | null;
        display_organization?: {
            name?: string;
            city?: string;
            address?: string;
        } | null;
        nearest_organization?: {
            name?: string;
            city?: string;
            address?: string;
        } | null;
        affiliatedClinics?: Array<{
            name?: string;
            city?: string;
            address?: string;
            consultation_fee?: number;
        }> | null;
        affiliatedHospitals?: Array<{
            name?: string;
            city?: string;
            address?: string;
            department?: string;
        }> | null;
    };
    mode?: 'in_person' | 'video';
    variant?: 'standard' | 'compact' | 'recommended' | 'search-result';
    recommendationReason?: string;
    onBook?: (doctor: any) => void;
    showActions?: boolean;
    className?: string;
}

export function DoctorCard({
    doctor,
    mode = 'in_person',
    variant = 'standard',
    recommendationReason,
    onBook,
    showActions = true,
    className = '',
}: DoctorCardProps) {
    const rawName = doctor.name || 'Medical Practitioner';
    const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
    const initials = rawName.replace(/^(Dr\.|Dr)\s+/i, '').charAt(0) || 'D';

    const rawClinicFee = doctor.consultation_fee ?? doctor.consultationFee;
    const hasClinicFee = rawClinicFee !== null && rawClinicFee !== undefined && !isNaN(Number(rawClinicFee));
    const clinicFeeDisplay = hasClinicFee ? `₹${Number(rawClinicFee)}` : null;

    const rawVideoFee = doctor.video_consultation_fee ?? doctor.videoConsultationFee;
    const hasVideoFee = rawVideoFee !== null && rawVideoFee !== undefined && !isNaN(Number(rawVideoFee));

    const consultationTypes = doctor.consultation_types || doctor.consultationTypes || [];
    const hasVideoConsult = hasVideoFee ||
        consultationTypes.includes('Video') ||
        consultationTypes.includes('video') ||
        mode === 'video';

    const hasClinicConsult = hasClinicFee ||
        consultationTypes.includes('In-Person') ||
        consultationTypes.includes('in_person') ||
        consultationTypes.includes('Clinic') ||
        consultationTypes.includes('clinic') ||
        mode === 'in_person';

    const expYears = doctor.experience_years ?? doctor.experienceYears ?? doctor.experience;
    const rawRating = doctor.rating ? Number(doctor.rating) : null;
    const rating = rawRating && rawRating > 0 ? rawRating : null;
    const rawReviews = doctor.total_reviews ?? doctor.totalReviews;
    const totalReviews = rawReviews !== null && rawReviews !== undefined ? Number(rawReviews) : null;

    const qualificationsStr = Array.isArray(doctor.qualifications)
        ? doctor.qualifications.filter(Boolean).join(', ')
        : (typeof doctor.qualifications === 'string' ? doctor.qualifications : null);

    const affiliationName =
        doctor.display_organization?.name ||
        doctor.nearest_organization?.name ||
        doctor.hospital?.name ||
        doctor.clinic_doctors?.[0]?.clinic?.name ||
        doctor.affiliatedHospitals?.[0]?.name ||
        doctor.affiliatedClinics?.[0]?.name ||
        null;

    const affiliationCity =
        doctor.display_organization?.city ||
        doctor.display_organization?.address ||
        doctor.hospital?.city ||
        doctor.clinic_doctors?.[0]?.clinic?.city ||
        doctor.affiliatedHospitals?.[0]?.city ||
        doctor.affiliatedClinics?.[0]?.city ||
        null;

    const distanceKm = doctor.distance_km ?? doctor.distanceKm;

    const reason = doctor.recommendation_reason || doctor.recommendationReason || recommendationReason;

    const profileHref = `/doctors/${doctor.id}?mode=${mode}`;

    if (variant === 'compact') {
        return (
            <div className={`bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-vd-forest/30 transition-all flex flex-col justify-between ${className}`}>
                <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                        {doctor.profile_image_url || doctor.profileImageUrl ? (
                            <img
                                src={doctor.profile_image_url || doctor.profileImageUrl || ''}
                                alt={displayName}
                                className="w-11 h-11 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-vd-forest font-heading font-bold text-base flex items-center justify-center shrink-0">
                                {initials}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <h4 className="font-heading font-bold text-sm text-stone-900 truncate">
                                    {displayName}
                                </h4>
                                {doctor.is_approved && (
                                    <span title="Verified Specialist" className="inline-flex">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-vd-forest truncate">
                                {doctor.specialization}
                            </p>
                            {rating && (
                                <div className="flex items-center gap-1 text-[11px] text-amber-700 font-bold mt-0.5">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{rating.toFixed(1)}</span>
                                    {totalReviews !== null && totalReviews > 0 && (
                                        <span className="text-stone-400 font-normal">({totalReviews})</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showActions && (
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-stone-100">
                        <Link
                            href={profileHref}
                            className="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer"
                        >
                            View Profile
                        </Link>
                        {onBook ? (
                            <button
                                onClick={() => onBook(doctor)}
                                className="py-1.5 px-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Book
                            </button>
                        ) : (
                            <Link
                                href={profileHref}
                                className="py-1.5 px-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Book
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-vd-forest/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${className}`}>
            <div className="space-y-3.5">
                {/* Header: Photo + Info + Rating */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                        <div className="relative shrink-0">
                            {doctor.profile_image_url || doctor.profileImageUrl ? (
                                <img
                                    src={doctor.profile_image_url || doctor.profileImageUrl || ''}
                                    alt={displayName}
                                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border border-stone-200"
                                />
                            ) : (
                                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 text-vd-forest font-heading font-bold text-lg flex items-center justify-center">
                                    {initials}
                                </div>
                            )}
                            {doctor.is_approved && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href={profileHref}
                                    className="font-heading font-bold text-base sm:text-lg text-stone-900 hover:text-vd-forest transition-colors leading-snug cursor-pointer"
                                >
                                    {displayName}
                                </Link>
                            </div>
                            <p className="text-xs font-semibold text-vd-forest">
                                {doctor.specialization}
                            </p>
                            {qualificationsStr && (
                                <p className="text-[11px] text-stone-400 font-light truncate max-w-[200px] sm:max-w-[240px]">
                                    {qualificationsStr}
                                </p>
                            )}
                        </div>
                    </div>

                    {rating !== null ? (
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl text-amber-800 font-bold text-xs shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{rating.toFixed(1)}</span>
                            {totalReviews !== null && totalReviews > 0 && (
                                <span className="text-[10px] text-amber-600/80 font-normal">
                                    ({totalReviews})
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] text-stone-400 font-medium bg-stone-50 px-2 py-1 rounded-xl border border-stone-100 shrink-0">
                            New Specialist
                        </div>
                    )}
                </div>

                {/* Recommendation Reason Pill */}
                {reason && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold">
                        <Sparkles className="w-3 h-3 text-vd-forest shrink-0" />
                        <span className="truncate">{reason}</span>
                    </div>
                )}

                {/* Doctor Bio Preview */}
                {doctor.bio && (
                    <p className="text-xs text-stone-500 line-clamp-2 font-light leading-relaxed">
                        {doctor.bio}
                    </p>
                )}

                {/* Practice Location & Distance (In-Person Mode) */}
                {mode === 'in_person' && affiliationName && (
                    <div className="space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-100 text-xs">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-semibold text-stone-800 truncate">
                                <Building2 className="w-3.5 h-3.5 text-vd-forest shrink-0" />
                                <span className="truncate">{affiliationName}</span>
                            </div>
                            {distanceKm !== undefined && distanceKm !== null && !isNaN(Number(distanceKm)) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/70 text-vd-forest font-bold text-[10px] shrink-0">
                                    <Compass className="w-3 h-3" />
                                    <span>{Number(distanceKm).toFixed(1)} km away</span>
                                </span>
                            )}
                        </div>
                        {affiliationCity && (
                            <p className="text-[11px] text-stone-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                                <span className="truncate">{affiliationCity}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* Consultation Capabilities & Fees (No fabricated video fee) */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {mode === 'in_person' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-teal-700" />
                            <span>In-Clinic Visit: {clinicFeeDisplay || 'Fee available at booking'}</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                            <Video className="w-3.5 h-3.5 text-blue-600" />
                            <span>Video Consultation Available</span>
                        </span>
                    )}

                    {expYears !== null && expYears !== undefined && Number(expYears) > 0 && (
                        <span className="text-[11px] text-stone-500 font-medium ml-auto flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{Number(expYears)}+ yrs exp</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Actions: View Profile (Secondary) + Book Appointment (Primary) */}
            {showActions && (
                <div className="flex items-center gap-2.5 pt-4 mt-3 border-t border-stone-100">
                    <Link
                        href={profileHref}
                        className="flex-1 py-2.5 px-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                        <span>View Profile</span>
                    </Link>

                    {onBook ? (
                        <button
                            onClick={() => onBook(doctor)}
                            className={`flex-1 py-2.5 px-3.5 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                mode === 'in_person'
                                    ? 'bg-vd-forest hover:bg-vd-forest-deep'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>
                                {mode === 'in_person' ? 'Book In-Clinic' : 'Book Video'}
                            </span>
                        </button>
                    ) : (
                        <Link
                            href={profileHref}
                            className={`flex-1 py-2.5 px-3.5 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                mode === 'in_person'
                                    ? 'bg-vd-forest hover:bg-vd-forest-deep'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>
                                {mode === 'in_person' ? 'Book In-Clinic' : 'Book Video'}
                            </span>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
