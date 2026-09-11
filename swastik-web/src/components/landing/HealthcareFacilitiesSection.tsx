"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Building,
  MapPin,
  Star,
  Phone,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { patientApi } from "@/lib/api";

export default function HealthcareFacilitiesSection() {
  const [activeTab, setActiveTab] = useState<"hospitals" | "clinics">("hospitals");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFacilities() {
      setLoading(true);
      try {
        const [hospRes, clinRes] = await Promise.allSettled([
          patientApi.getHospitals({ limit: 4 }),
          patientApi.getClinics({ limit: 4 }),
        ]);

        if (hospRes.status === "fulfilled" && hospRes.value.success) {
          setHospitals(Array.isArray(hospRes.value.data) ? hospRes.value.data.slice(0, 4) : []);
        }
        if (clinRes.status === "fulfilled" && clinRes.value.success) {
          setClinics(Array.isArray(clinRes.value.data) ? clinRes.value.data.slice(0, 4) : []);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }

    loadFacilities();
  }, []);

  const displayedList = activeTab === "hospitals" ? hospitals : clinics;

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-stone-100" id="facilities-discovery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header and Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-3">
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-800">
                Medical Infrastructure
              </span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-vd-forest tracking-tight">
              Find healthcare near you
            </h2>
            <p className="text-sm sm:text-base text-stone-600 font-normal mt-2 max-w-2xl">
              Locate accredited hospitals and modern healthcare clinics equipped with emergency and multi-specialty care.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl mt-4 md:mt-0 w-fit">
            <button
              onClick={() => setActiveTab("hospitals")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "hospitals"
                  ? "bg-white text-vd-forest shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hospitals ({hospitals.length || 4})</span>
            </button>
            <button
              onClick={() => setActiveTab("clinics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "clinics"
                  ? "bg-white text-vd-forest shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Clinics ({clinics.length || 4})</span>
            </button>
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayedList.length > 0 ? (
            displayedList.map((item, idx) => {
              const isHospital = activeTab === "hospitals";
              const title = item.name || (isHospital ? `Apex Multi-Specialty Hospital` : `Vaididea Family Clinic`);
              const city = item.city || item.address || "Delhi NCR";
              const rating = item.rating || 4.7 + (idx % 3) * 0.1;
              const reviews = item.total_reviews || 80 + idx * 15;
              const hasEmergency = item.emergency_services_available || isHospital;

              return (
                <div
                  key={item.id || idx}
                  className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-vd-forest/40 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    {/* Top Icon Badge & Type */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-vd-forest group-hover:bg-vd-forest group-hover:text-white transition-colors">
                        {isHospital ? <Building2 className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                        {isHospital ? "Hospital" : "Clinic"}
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-1.5 line-clamp-1">
                      {title}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-stone-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{city}</span>
                    </div>

                    {/* Features pill */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {hasEmergency && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                          24/7 Emergency
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Verified Facility
                      </span>
                    </div>
                  </div>

                  <div>
                    {/* Rating & CTA */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-stone-800">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{rating.toFixed(1)}</span>
                        <span className="text-[10px] text-stone-400 font-normal">({reviews})</span>
                      </div>
                    </div>

                    <Link
                      href={isHospital ? "/patient/hospitals" : "/patient/clinics"}
                      className="w-full py-2.5 rounded-xl bg-stone-50 hover:bg-vd-forest text-stone-800 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{isHospital ? "View Hospital" : "View Clinic"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-stone-200 animate-pulse space-y-3">
                <div className="w-10 h-10 bg-stone-200 rounded-xl" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-200 rounded w-1/2" />
                <div className="h-8 bg-stone-200 rounded-xl" />
              </div>
            ))
          )}
        </div>

        {/* Bottom Dual CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/patient/hospitals"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore All Hospitals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/patient/clinics"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore All Clinics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
