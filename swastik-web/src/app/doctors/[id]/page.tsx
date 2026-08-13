/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doctorApi } from "@/lib/api";
import {
  Star,
  CheckCircle,
  MapPin,
  Clock,
  Languages,
  Award,
  BookOpen,
  ShieldCheck,
  Video,
  Building2,
  CalendarDays
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { PatientBookingWidget } from "@/components/patient/PatientBookingWidget";

export default function PublicDoctorProfile() {
  const params = useParams();
  const doctorId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoctor() {
      try {
        const res = await doctorApi.getPublicDoctorById(doctorId);
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load doctor profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-vd-cream flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vd-orange"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data || !data.doctor) {
    return (
      <div className="min-h-screen bg-vd-cream flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-vd-blue font-semibold text-xl">
          Doctor Profile Not Found
        </div>
        <Footer />
      </div>
    );
  }

  const { doctor, reviews, clinics, hospitals } = data;
  const rating = doctor.rating || 0;
  const totalReviews = doctor.total_reviews || 0;

  // Phase 5 Trust Badges Logic
  const checklist = doctor.verification_checklist || {};
  const trustBadges = [
    { label: "Identity Verified", show: checklist.aadhaar_verified, icon: ShieldCheck },
    { label: "Degree Verified", show: checklist.degree_verified, icon: BookOpen },
    { label: "Council Verified", show: checklist.registration_verified, icon: Award },
    { label: "Email Verified", show: checklist.email_verified, icon: CheckCircle },
    { label: "Clinic Verified", show: checklist.clinic_verified, icon: Building2 },
  ].filter(b => b.show);

  return (
    <div className="min-h-screen bg-vd-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Top Profile Banner */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-vd-beige">
          <div className="h-48 bg-gradient-to-r from-vd-blue/10 to-vd-orange/10 relative">
             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
               <Star className="w-5 h-5 text-yellow-400 fill-current" />
               <span className="font-bold text-vd-blue">{rating.toFixed(1)}</span>
               <span className="text-gray-500 text-sm">({totalReviews} Reviews)</span>
             </div>
          </div>
          
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row gap-8 items-start -mt-16">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-vd-beige">
                  {doctor.profile_image_url ? (
                    <img src={doctor.profile_image_url} alt={doctor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-vd-blue/50 font-bold">
                      {doctor.name.charAt(0)}
                    </div>
                  )}
                </div>
                {doctor.is_approved && (
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-md border-2 border-white" title="Verified Professional">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Doctor Basic Info */}
              <div className="flex-1 pt-2 md:pt-16">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-vd-blue">Dr. {doctor.name}</h1>
                  {doctor.is_approved && (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-green-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xl text-gray-600 font-medium mb-4">{doctor.specialization}</p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Award className="w-4 h-4 text-vd-orange" />
                    <span className="font-medium">{doctor.experience_years} Years Experience</span>
                  </div>
                  {(doctor.languages || []).length > 0 && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Languages className="w-4 h-4 text-vd-orange" />
                      <span className="font-medium">{(doctor.languages || []).join(", ")}</span>
                    </div>
                  )}
                  {doctor.consultation_types?.includes("Video") && (
                    <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-blue-700">
                      <Video className="w-4 h-4" />
                      <span className="font-medium">Video Consult Available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Badges (Phase 5) */}
            {trustBadges.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Trust & Verification</h3>
                <div className="flex flex-wrap gap-3">
                  {trustBadges.map((badge, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-vd-cream/50 text-vd-blue px-4 py-2 rounded-xl border border-vd-beige">
                      <badge.icon className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            {doctor.bio && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-vd-beige">
                <h2 className="text-xl font-bold text-vd-blue mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-vd-orange" />
                  About
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {doctor.bio}
                </p>
              </div>
            )}

            {/* Qualifications & Awards */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-vd-beige">
              <h2 className="text-xl font-bold text-vd-blue mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-vd-orange" />
                Credentials & Achievements
              </h2>
              <div className="space-y-6">
                {doctor.education?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Education</h3>
                    <ul className="space-y-2">
                      {doctor.education.map((edu: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-vd-orange flex-shrink-0"></span>
                          {edu}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {doctor.awards?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Awards</h3>
                    <ul className="space-y-2">
                      {doctor.awards.map((award: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <Star className="w-4 h-4 text-yellow-400 mt-1 flex-shrink-0" />
                          {award}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {doctor.qualifications?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Qualifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.qualifications.map((qual: string, idx: number) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">
                          {qual}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            {reviews?.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-vd-beige">
                <h2 className="text-xl font-bold text-vd-blue mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-vd-orange" />
                  Patient Stories
                </h2>
                <div className="space-y-6">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400 font-medium">
                          {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-gray-700 italic">&quot;{review.comment}&quot;</p>
                      <p className="text-sm text-gray-500 font-medium mt-2">- {review.patient?.name || "Anonymous Patient"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking & Locations */}
          <div className="space-y-6">
            {/* Consultation Booking Widget */}
            <PatientBookingWidget doctor={doctor} />

            {/* Affiliations */}
            {(clinics?.length > 0 || hospitals?.length > 0) && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-vd-beige">
                <h3 className="text-lg font-bold text-vd-blue mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-vd-orange" />
                  Practice Locations
                </h3>
                
                <div className="space-y-4">
                  {clinics?.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <h4 className="font-bold text-gray-800">{c.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500 ml-6">{c.address}, {c.city}</p>
                    </div>
                  ))}

                  {hospitals?.map((h: any) => (
                    <div key={h.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <h4 className="font-bold text-gray-800">{h.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500 ml-6">{h.address}, {h.city}</p>
                      <span className="inline-block ml-6 mt-2 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {h.department || "Consultant"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
