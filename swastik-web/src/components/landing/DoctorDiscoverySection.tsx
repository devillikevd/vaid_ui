"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Star,
  Video,
  Building2,
  Calendar,
  ArrowRight,
  User,
  MapPin
} from "lucide-react";
import { patientApi } from "@/lib/api";

const SPECIALTIES = [
  { label: "All", value: "All" },
  { label: "General Physician", value: "General Physician" },
  { label: "Dermatologist", value: "Dermatology" },
  { label: "Gynecologist", value: "Gynecology" },
  { label: "Pediatrician", value: "Pediatrics" },
  { label: "Cardiologist", value: "Cardiology" },
  { label: "Orthopedist", value: "Orthopedics" },
];

export default function DoctorDiscoverySection() {
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctorsList = useCallback(async (specialty: string) => {
    setLoading(true);
    try {
      const params: any = { limit: 6, global: true };
      if (specialty !== "All") {
        params.specialization = specialty;
      }
      const res = await patientApi.getDoctors(params);
      if (res && res.success) {
        setDoctors(Array.isArray(res.data) ? res.data.slice(0, 6) : []);
      } else {
        setDoctors([]);
      }
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorsList(selectedSpecialty);
  }, [selectedSpecialty, fetchDoctorsList]);

  return (
    <section className="py-10 sm:py-14 bg-white border-b border-stone-100" id="doctor-discovery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
              Find the right doctor
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-normal mt-0.5">
              Consult verified doctors online or book an in-person appointment.
            </p>
          </div>

          <Link
            href="/patient/doctors"
            className="text-xs font-bold text-vd-forest hover:text-vd-forest-deep flex items-center gap-1 shrink-0"
          >
            <span>View all doctors →</span>
          </Link>
        </div>

        {/* Compact Specialty Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-5 hide-scrollbar">
          {SPECIALTIES.map((spec) => {
            const isActive = selectedSpecialty === spec.value;
            return (
              <button
                key={spec.label}
                onClick={() => setSelectedSpecialty(spec.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  isActive
                    ? "bg-vd-forest text-white border-vd-forest"
                    : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200/80"
                }`}
              >
                {spec.label}
              </button>
            );
          })}
        </div>

        {/* Doctor Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-white border border-stone-200 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-stone-200 rounded w-3/4" />
                    <div className="h-3 bg-stone-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-7 bg-stone-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor) => {
              const profileImg = doctor.profile_image_url || doctor.profileImageUrl;
              const exp = doctor.experience_years || doctor.experienceYears || doctor.experience;
              const fee = doctor.consultation_fee || doctor.consultationFee || doctor.video_consultation_fee;
              const rating = doctor.rating;
              const hasVideo = doctor.consultation_types?.includes?.("video") || doctor.video_consultation_fee;
              const hospitalName =
                doctor.hospital?.name ||
                doctor.display_organization?.name ||
                doctor.clinic_doctors?.[0]?.clinic?.name ||
                doctor.affiliatedClinics?.[0]?.name;

              return (
                <div
                  key={doctor.id}
                  className="p-4 rounded-xl bg-white border border-stone-200/90 hover:border-vd-forest/30 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {profileImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileImg}
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-vd-forest/70" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-vd-forest uppercase tracking-wider block truncate">
                          {doctor.specialization || "Doctor"}
                        </span>
                        <h3 className="font-heading text-sm sm:text-base font-bold text-stone-900 group-hover:text-vd-forest transition-colors truncate">
                          Dr. {doctor.name.replace(/^Dr\.?\s+/i, "")}
                        </h3>
                        {exp && (
                          <p className="text-[11px] text-stone-500 font-normal">
                            {exp}+ yrs experience
                          </p>
                        )}
                      </div>
                    </div>

                    {hospitalName && (
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 mb-2 truncate">
                        <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="truncate">{hospitalName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-100">
                      {rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-stone-800 text-xs">{rating}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-medium">Verified Doctor</span>
                      )}
                      {fee ? (
                        <div className="font-bold text-stone-900 text-xs">
                          ₹{fee}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 flex gap-2">
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-vd-forest text-white text-xs font-semibold hover:bg-vd-forest-deep transition-colors text-center flex items-center justify-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Book</span>
                    </Link>
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Compact Directory Discovery CTA (Avoids duplicate 'no doctors' state) */
          <div className="p-6 rounded-xl bg-stone-50/80 border border-stone-200 text-center max-w-md mx-auto">
            <h3 className="text-xs sm:text-sm font-bold text-stone-800">Explore Vaididea&apos;s doctor directory</h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-3">
              Browse specialists and find a doctor that fits your needs.
            </p>
            <Link
              href="/patient/doctors"
              className="px-4 py-1.5 bg-vd-forest text-white rounded-full text-xs font-semibold inline-flex items-center gap-1 hover:bg-vd-forest-deep transition-colors"
            >
              <span>View all doctors →</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
