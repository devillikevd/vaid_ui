"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  Search,
  MapPin,
  Filter,
  Star,
  Video,
  Building2,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Stethoscope
} from "lucide-react";
import { patientApi } from "@/lib/api";
import SearchLocationPicker, { SelectedLocation } from "@/components/shared/SearchLocationPicker";

const SPECIALTIES_LIST = [
  "All Specialties",
  "General Physician",
  "Dermatology",
  "Gynecology",
  "Pediatrics",
  "Orthopedics",
  "Cardiology",
  "Neurology",
  "Dentist",
  "Ophthalmology",
  "ENT",
  "Gastroenterology",
  "Psychiatry",
  "Urology",
  "Pulmonology",
  "Nutrition & Dietetics",
];

function DoctorCardAvatar({ src, name }: { src?: string; name: string }) {
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

  return (
    <div className="w-full h-full bg-emerald-50 text-vd-forest flex items-center justify-center font-bold text-lg">
      {name.replace(/^Dr\.?\s*/i, "").charAt(0).toUpperCase() || <User className="w-7 h-7 text-stone-400" />}
    </div>
  );
}

function DoctorsDiscoveryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") || searchParams.get("search") || "";
  const initialSpecialty = searchParams.get("specialty") || searchParams.get("specialization") || "All Specialties";
  const initialType = searchParams.get("type") || searchParams.get("consultationType") || "all";
  const initialCity = searchParams.get("city") || "";
  const initialLocation = searchParams.get("location") || "";
  const initialPincode = searchParams.get("pincode") || "";
  const initialLat = searchParams.get("lat") || searchParams.get("latitude");
  const initialLng = searchParams.get("lng") || searchParams.get("longitude");

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [consultationType, setConsultationType] = useState<"all" | "in_person" | "video">(
    initialType === "in_person" || initialType === "video" ? initialType : "all"
  );
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(() => {
    if (initialLat && initialLng) {
      return {
        latitude: parseFloat(initialLat),
        longitude: parseFloat(initialLng),
        city: initialCity || initialLocation || undefined,
        pincode: initialPincode || undefined,
        displayName: initialLocation || initialCity || "Custom Location",
      };
    }
    if (initialCity || initialLocation) {
      return {
        city: initialCity || initialLocation,
        displayName: initialLocation || initialCity,
      };
    }
    return null;
  });

  const [minRating, setMinRating] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 30,
        global: !selectedLocation,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (selectedSpecialty && selectedSpecialty !== "All Specialties") {
        params.specialization = selectedSpecialty;
      }

      if (consultationType !== "all") {
        params.consultationType = consultationType;
      }

      if (selectedLocation?.latitude && selectedLocation?.longitude) {
        params.latitude = selectedLocation.latitude;
        params.longitude = selectedLocation.longitude;
      } else if (selectedLocation?.city && selectedLocation.city !== "Current Location") {
        params.city = selectedLocation.city;
      }

      const res = await patientApi.getDoctors(params);

      if (res && res.success && Array.isArray(res.data)) {
        let list = res.data;

        // Apply client-side filters for rating and experience if requested
        if (minRating > 0) {
          list = list.filter((d: any) => (d.rating || d.average_rating || 4.5) >= minRating);
        }
        if (minExperience > 0) {
          list = list.filter((d: any) => Number(d.experience_years || 0) >= minExperience);
        }

        setDoctors(list);
        setTotalCount(list.length);
      } else {
        setDoctors([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setDoctors([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSpecialty, consultationType, selectedLocation, minRating, minExperience]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/60">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Verified Doctor Directory</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold text-vd-forest tracking-tight">
            Find and Book Trusted Doctors
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 font-light">
            Search verified specialists, compare credentials, consultation fees, and schedule visits.
          </p>
        </div>

        {/* Search & Main Filter Bar */}
        <div className="bg-white p-3 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xs mb-8">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch gap-2">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200/60">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor by name, specialty, condition, or hospital..."
                className="w-full text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Specialty Select */}
            <div className="md:w-56 shrink-0">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full h-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/60 text-xs sm:text-sm text-stone-800 focus:outline-none cursor-pointer"
              >
                {SPECIALTIES_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Selector */}
            <div className="md:w-52 shrink-0 flex items-center px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/60">
              <SearchLocationPicker
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="City / Pincode"
                className="w-full"
                align="right"
              />
            </div>

            {/* Search Submit */}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-vd-forest hover:bg-vd-forest-deep text-white text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Search</span>
            </button>
          </form>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-stone-100 text-xs text-stone-600">
            <span className="font-semibold text-stone-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter by:</span>
            </span>

            {/* Mode Pills */}
            {[
              { id: "all", label: "All Modes" },
              { id: "in_person", label: "In-Person Clinic" },
              { id: "video", label: "Video Consultation" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setConsultationType(m.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  consultationType === m.id
                    ? "bg-vd-forest text-white border-vd-forest shadow-xs"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                }`}
              >
                {m.label}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-stone-200 hidden sm:block mx-1" />

            {/* Rating Filter */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="0">Any Rating</option>
              <option value="4.5">★ 4.5 & above</option>
              <option value="4.0">★ 4.0 & above</option>
            </select>

            {/* Experience Filter */}
            <select
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="px-2.5 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="0">Any Experience</option>
              <option value="5">5+ Years Experience</option>
              <option value="10">10+ Years Experience</option>
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-xs sm:text-sm font-semibold text-stone-700">
            {loading ? (
              "Searching doctors..."
            ) : (
              <>
                Showing <span className="text-vd-forest font-bold">{totalCount}</span> verified doctors
                {selectedSpecialty !== "All Specialties" && ` in ${selectedSpecialty}`}
              </>
            )}
          </p>
        </div>

        {/* Doctor Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-stone-200 animate-pulse h-60" />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc) => {
              const name = doc.name || doc.full_name || "Doctor";
              const specialty = doc.specialty || doc.specialization || "General Medicine";
              const experience = doc.experience_years && Number(doc.experience_years) > 0 ? `${doc.experience_years}+ yrs exp` : null;
              const rating = (doc.rating && Number(doc.rating) > 0) ? Number(doc.rating) : (doc.average_rating && Number(doc.average_rating) > 0) ? Number(doc.average_rating) : null;
              const fee = (doc.consultation_fee && Number(doc.consultation_fee) > 0) ? doc.consultation_fee : (doc.fee && Number(doc.fee) > 0) ? doc.fee : (doc.in_person_fee && Number(doc.in_person_fee) > 0) ? doc.in_person_fee : null;
              const avatar = doc.avatar_url || doc.photo_url || doc.profile_image_url;
              const consultationTypeLabel = doc.consultation_type || (doc.offers_video ? "In-Person & Video" : "In-Person");
              const id = doc.id || doc._id;
              const clinicOrHospital = doc.hospital_name || doc.clinic_name || doc.address;

              return (
                <div
                  key={id}
                  className="p-5 rounded-2xl bg-white border border-stone-200/90 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Doctor Header */}
                    <div className="flex items-start gap-3.5 mb-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center text-stone-400 shadow-2xs">
                        <DoctorCardAvatar src={avatar} name={name} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h2 className="font-heading text-base font-bold text-stone-900 truncate">
                            {name}
                          </h2>
                          {rating !== null && (
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>{rating}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-emerald-800 truncate mb-1.5">
                          {specialty}
                        </p>

                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-stone-500">
                          {experience && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-stone-400" />
                              <span>{experience}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3 text-stone-400" />
                            <span>{consultationTypeLabel}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hospital / Clinic */}
                    {clinicOrHospital && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 mb-4 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-100">
                        <Building2 className="w-3.5 h-3.5 text-vd-forest shrink-0" />
                        <span className="truncate">{clinicOrHospital}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Fee */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <div>
                      {fee ? (
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-medium block">Consultation Fee</span>
                          <span className="text-sm font-bold text-stone-900">₹{fee}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold">Available</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/doctors/${id}`}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      >
                        View Profile
                      </Link>
                      <Link
                        href={`/doctors/${id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-vd-forest hover:bg-vd-forest-deep text-white text-xs font-bold transition-all shadow-xs"
                      >
                        Book Appointment
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-stone-200/80 text-center max-w-xl mx-auto shadow-2xs">
            <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h3 className="font-heading text-lg font-bold text-stone-900 mb-1">
              No doctors found matching your criteria
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed max-w-sm mx-auto">
              Try removing filters, searching for a different specialty, or clearing the search query.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("All Specialties");
                setConsultationType("all");
                setMinRating(0);
                setMinExperience(0);
              }}
              className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-vd-forest animate-spin" />
        </div>
      }
    >
      <DoctorsDiscoveryContent />
    </Suspense>
  );
}
