"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Star,
  Video,
  Building2,
  ArrowRight,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { patientApi } from "@/lib/api";

const SPECIALTIES = [
  { label: "All", value: "All" },
  { label: "General Physician", value: "General Physician" },
  { label: "Dermatology", value: "Dermatology" },
  { label: "Pediatrics", value: "Pediatrics" },
  { label: "ENT", value: "ENT" },
  { label: "Cardiology", value: "Cardiology" },
  { label: "Orthopedics", value: "Orthopedics" },
  { label: "Gynecology", value: "Gynecology" },
];

function DoctorCardAvatar({ src, name }: { src?: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover"
      />
    );
  }

  const initial = name.replace(/^Dr\.?\s*/i, "").trim().charAt(0).toUpperCase() || "D";

  return (
    <div className="w-full h-full bg-emerald-50 text-vd-forest flex items-center justify-center font-bold text-lg">
      {initial || <User className="w-6 h-6 text-stone-400" />}
    </div>
  );
}

export default function FeaturedDoctorsSection() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);

  // Touch swipe coordinates
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchDoctorsList = useCallback(async (specialty: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 12, global: true };
      if (specialty !== "All") {
        params.specialization = specialty;
      }
      const res = await patientApi.getDoctors(params);

      if (res && res.success && Array.isArray(res.data)) {
        // Enforce strict validity criteria: only real approved, verified, active doctor accounts
        const realApprovedDoctors = res.data.filter((doc: any) => {
          const hasName = Boolean(doc && (doc.name || doc.full_name));
          const isApproved = doc.is_approved !== false && (!doc.approval_status || doc.approval_status === "approved");
          const isVerified = doc.is_verified === true || doc.user?.is_verified === true;
          const isDoctorRole = !doc.user?.role || doc.user?.role === "doctor";
          const isActive = doc.is_active !== false && doc.user?.is_active !== false;
          return hasName && isApproved && isVerified && isDoctorRole && isActive;
        });

        setDoctors(realApprovedDoctors);
      } else {
        setDoctors([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch verified specialists from API:", err);
      setError("Unable to load doctors. Please check your connection and try again.");
      setDoctors([]);
    } finally {
      setLoading(false);
      setActiveIndex(0);
    }
  }, []);

  useEffect(() => {
    fetchDoctorsList(selectedSpecialty);
  }, [selectedSpecialty, fetchDoctorsList]);

  const total = doctors.length;

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Touch Swipe Handlers for mobile & tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (total <= 1) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(distance) > 40) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Card geometry:
  // Desktop: 300px card, 215px step -> 85px overlap (28.3%)
  // Tablet: 270px card, 190px step -> 80px overlap (29.6%)
  // Mobile: 250px card, 175px step -> 75px overlap (30.0%)
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const cardWidth = isMobile ? 250 : isTablet ? 270 : 300;
  const step = isMobile ? 175 : isTablet ? 190 : 215;

  return (
    <section className="py-10 sm:py-14 bg-white border-b border-stone-200/80 overflow-hidden" id="popular-specialists">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/60">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Verified Specialists</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-vd-forest tracking-tight">
            Popular Specialists
          </h2>
        </div>

        {/* Specialty Filter Chips (Real Database Specializations) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec.label}
              type="button"
              onClick={() => setSelectedSpecialty(spec.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSpecialty === spec.value
                  ? "bg-vd-forest text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200/60"
              }`}
            >
              {spec.label}
            </button>
          ))}
        </div>

        {/* ── Overlapping Horizontal Cards Track ── */}
        <div
          className="relative w-full h-[390px] sm:h-[420px] flex items-center justify-center overflow-hidden select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 1. Loading Skeleton State */}
          {loading ? (
            [-1, 0, 1].map((offset) => {
              const isCenter = offset === 0;
              const translateX = offset * step;
              return (
                <div
                  key={offset}
                  style={{
                    width: `${cardWidth}px`,
                    transform: `translate3d(calc(-50% + ${translateX}px), -50%, 0) scale(${isCenter ? 1.0 : 0.94})`,
                    zIndex: isCenter ? 30 : 20,
                    opacity: isCenter ? 1 : 0.85,
                  }}
                  className="absolute top-1/2 left-1/2 p-5 rounded-2xl bg-stone-50 border border-stone-200/90 shadow-xs h-[340px] sm:h-[365px] flex flex-col justify-between animate-pulse"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-200" />
                      <div className="w-14 h-6 rounded-lg bg-stone-200" />
                    </div>
                    <div className="h-4 bg-stone-200 rounded-md w-3/4 mb-2" />
                    <div className="h-3.5 bg-stone-200 rounded-md w-1/2 mb-3" />
                    <div className="h-3 bg-stone-200 rounded-md w-2/3 mb-2" />
                    <div className="h-3 bg-stone-200 rounded-md w-1/2" />
                  </div>
                  <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                    <div className="w-16 h-5 bg-stone-200 rounded-md" />
                    <div className="w-20 h-7 bg-stone-200 rounded-lg" />
                  </div>
                </div>
              );
            })
          ) : error ? (
            /* 2. Error State (No dummy fallback) */
            <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-2xl bg-stone-50/90 border border-stone-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center mb-3.5 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-stone-900 mb-1">
                Unable to load doctors
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mb-4 max-w-xs">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchDoctorsList(selectedSpecialty)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : doctors.length === 0 ? (
            /* 3. Empty State (No verified doctors for selected category) */
            <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-2xl bg-stone-50/90 border border-stone-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-vd-forest border border-emerald-200/60 flex items-center justify-center mb-3.5 shadow-2xs">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-stone-900 mb-1">
                {selectedSpecialty !== "All"
                  ? `No verified ${selectedSpecialty} doctors yet`
                  : "No verified doctors available"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mb-5 max-w-xs leading-relaxed">
                We&apos;re actively onboarding verified specialists for this category. Please check another specialty or browse all doctors.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {selectedSpecialty !== "All" && (
                  <button
                    type="button"
                    onClick={() => setSelectedSpecialty("All")}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explore Other Specialties</span>
                  </button>
                )}
                <Link
                  href="/doctors"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200/80 transition-all cursor-pointer"
                >
                  <span>View All Doctors</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            /* 4. Real Doctors Overlapping Carousel */
            doctors.map((doc, i) => {
              const rawName = doc.name || doc.full_name || "Doctor";
              const name = rawName.startsWith("Dr.") || rawName.startsWith("Dr ") ? rawName : `Dr. ${rawName}`;
              const specialty = doc.specialization || doc.specialty || "Specialist";
              const isVerified = Boolean(doc.is_verified || doc.user?.is_verified);

              // Truthful metrics without fabrications
              const experienceYears = Number(doc.experience_years);
              const experience = experienceYears > 0 ? `${experienceYears}+ yrs exp` : null;

              const rating = typeof doc.rating === "number" && doc.rating > 0 ? Number(doc.rating) : null;
              const reviewsCount = typeof doc.total_reviews === "number" && doc.total_reviews > 0 ? Number(doc.total_reviews) : null;

              // Actual consultation fees
              const inPersonFee = Number(doc.consultation_fee);
              const videoFee = Number(doc.video_consultation_fee);
              const hasFee = (inPersonFee > 0) || (videoFee > 0);
              const fee = inPersonFee > 0 ? inPersonFee : videoFee;

              const avatar = doc.profile_image_url || doc.avatar_url || doc.photo_url || null;

              // Actual consultation mode availability
              const consultationTypes = Array.isArray(doc.consultation_types)
                ? doc.consultation_types.map((t: string) => t.toLowerCase())
                : [];
              const hasVideo = videoFee > 0 || consultationTypes.includes("video") || Boolean(doc.offers_video);
              const hasInPerson = inPersonFee > 0 || consultationTypes.includes("in-person") || consultationTypes.includes("in_person");
              let consultationType: string | null = null;
              if (hasVideo && hasInPerson) {
                consultationType = "In-Person & Video";
              } else if (hasVideo) {
                consultationType = "Video Consult";
              } else if (hasInPerson) {
                consultationType = "In-Person";
              }

              // Actual facility name
              const facilityName =
                doc.hospital?.name ||
                doc.clinic_doctors?.[0]?.clinic?.name ||
                doc.hospital_name ||
                doc.clinic_name ||
                null;

              const id = doc.id || doc._id;

              // Geometry calculation based on total count
              let offset = 0;
              let isCenter = true;

              if (total === 1) {
                offset = 0;
                isCenter = true;
              } else if (total === 2) {
                offset = i === activeIndex ? 0 : (activeIndex === 0 ? 1 : -1);
                isCenter = offset === 0;
              } else {
                offset = i - activeIndex;
                if (offset > total / 2) offset -= total;
                if (offset < -total / 2) offset += total;
                isCenter = offset === 0;
              }

              const absOffset = Math.abs(offset);
              const translateX = offset * step;

              let scale = 1.0;
              let opacity = 1.0;
              let zIndex = 30;
              let boxShadow = "0 20px 40px -12px rgba(15, 95, 80, 0.22), 0 0 0 2px rgba(15, 95, 80, 0.35)";
              let borderColor = "rgba(15, 95, 80, 0.40)";

              if (absOffset === 1) {
                scale = 0.94;
                opacity = 0.95;
                zIndex = 20;
                boxShadow = "0 10px 25px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(231, 229, 228, 0.9)";
                borderColor = "rgba(231, 229, 228, 0.9)";
              } else if (absOffset === 2) {
                scale = 0.86;
                opacity = 0.80;
                zIndex = 10;
                boxShadow = "0 6px 18px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(231, 229, 228, 0.8)";
                borderColor = "rgba(231, 229, 228, 0.8)";
              } else if (absOffset >= 3) {
                scale = 0.80;
                opacity = Math.max(0, 0.50 - (absOffset - 3) * 0.25);
                zIndex = Math.max(1, 5 - absOffset);
                boxShadow = "0 4px 12px rgba(0, 0, 0, 0.04)";
                borderColor = "rgba(231, 229, 228, 0.6)";
              }

              return (
                <div
                  key={id || i}
                  style={{
                    width: `${cardWidth}px`,
                    transform: `translate3d(calc(-50% + ${translateX}px), -50%, 0) scale(${scale})`,
                    zIndex,
                    opacity,
                    boxShadow,
                    borderColor,
                    pointerEvents: absOffset > 2 ? "none" : "auto",
                  }}
                  className="absolute top-1/2 left-1/2 transition-all duration-500 ease-out will-change-transform rounded-2xl bg-white border p-4 sm:p-5 flex flex-col justify-between h-[340px] sm:h-[365px]"
                >
                  {/* Clicking an adjacent card focuses it to front */}
                  {!isCenter && total > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Focus ${name}`}
                      className="absolute inset-0 z-20 w-full h-full rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest bg-transparent border-0"
                    />
                  )}

                  {/* Top: Avatar + Verified Badge + Real Rating */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                        <DoctorCardAvatar src={avatar} name={name} />
                        {isVerified && (
                          <div
                            className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs"
                            title="Verified Specialist"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                          </div>
                        )}
                      </div>

                      {rating !== null ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50/90 px-2 py-1 rounded-lg border border-amber-200/70 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{rating.toFixed(1)}</span>
                          {reviewsCount !== null && (
                            <span className="text-[10px] font-medium text-stone-500">
                              ({reviewsCount})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200/70 shrink-0">
                          <span>Verified</span>
                        </div>
                      )}
                    </div>

                    {/* Name & Specialty */}
                    <div className="mb-2">
                      <h3 className="font-heading text-sm sm:text-base font-bold text-stone-900 leading-snug line-clamp-1">
                        {name}
                      </h3>
                      <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-vd-forest text-xs font-semibold border border-emerald-200/50">
                        {specialty}
                      </div>
                    </div>

                    {/* Metadata: Experience & Mode */}
                    <div className="flex items-center flex-wrap gap-2 text-[11px] text-stone-600 mb-2.5">
                      {experience && (
                        <span className="flex items-center gap-1 font-medium bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70">
                          <Clock className="w-3 h-3 text-vd-forest" />
                          <span>{experience}</span>
                        </span>
                      )}
                      {consultationType && (
                        <span className="flex items-center gap-1 font-medium bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70 truncate">
                          <Video className="w-3 h-3 text-vd-forest shrink-0" />
                          <span className="truncate">{consultationType}</span>
                        </span>
                      )}
                    </div>

                    {/* Facility */}
                    {facilityName ? (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 truncate">
                        <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{facilityName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 truncate">
                        <Building2 className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        <span className="truncate">Independent Practice</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Consultation Fee + Actions */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 relative z-30">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block leading-none mb-0.5">
                        Consultation
                      </span>
                      {hasFee ? (
                        <span className="text-sm sm:text-base font-bold text-vd-forest">
                          ₹{fee}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-stone-500">
                          Fee on inquiry
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/doctors/${id}`}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        Profile
                      </Link>
                      <Link
                        href={`/doctors/${id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-vd-forest hover:bg-vd-forest-deep text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Carousel Navigation Controls: ← ● ● ● ● ● ● → ── */}
        {!loading && !error && total > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3" aria-label="Specialists carousel controls">
            {/* Left arrow button: ← */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous specialist"
              className="w-9 h-9 rounded-full bg-white hover:bg-emerald-50 text-stone-700 hover:text-vd-forest border border-stone-200/90 hover:border-vd-forest/40 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pagination dots in the center */}
            <div className="flex items-center gap-1.5 px-1" role="tablist" aria-label="Specialists pagination">
              {doctors.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={activeIndex === idx}
                  aria-label={`Go to specialist ${idx + 1}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeIndex === idx
                      ? "w-6 h-2 bg-vd-forest"
                      : "w-2 h-2 bg-stone-300 hover:bg-stone-400"
                  }`}
                />
              ))}
            </div>

            {/* Right arrow button: → */}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next specialist"
              className="w-9 h-9 rounded-full bg-white hover:bg-emerald-50 text-stone-700 hover:text-vd-forest border border-stone-200/90 hover:border-vd-forest/40 transition-all flex items-center justify-center cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bottom Action: View All Doctors */}
        <div className="mt-4 sm:mt-5 flex justify-center">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-vd-forest text-xs sm:text-sm font-bold border border-stone-200/90 hover:border-vd-forest/40 shadow-2xs hover:shadow-xs transition-all group"
          >
            <span>View All Doctors</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
