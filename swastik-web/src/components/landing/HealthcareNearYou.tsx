"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Stethoscope,
  Building2,
  Building,
  Star,
  ArrowRight,
  Compass,
  AlertCircle
} from "lucide-react";
import { patientApi } from "@/lib/api";
import { usePatientLocation } from "@/hooks/usePatientLocation";

export default function HealthcareNearYou() {
  const [activeTab, setActiveTab] = useState<"doctors" | "hospitals" | "clinics">("doctors");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { coords, loading: locationLoading, permissionDenied, requestLocation } = usePatientLocation(false);

  const fetchData = useCallback(async (tab: "doctors" | "hospitals" | "clinics") => {
    setLoading(true);
    try {
      const params: any = { limit: 4 };
      if (coords) {
        params.latitude = coords.latitude;
        params.longitude = coords.longitude;
        params.radius = 25;
      } else {
        params.global = true;
      }

      let res: any;
      if (tab === "doctors") {
        params.consultationType = "in_person";
        res = await patientApi.getDoctors(params);
      } else if (tab === "hospitals") {
        res = await patientApi.getHospitals(params);
      } else {
        res = await patientApi.getClinics(params);
      }

      if (res && res.success) {
        setItems(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const viewAllLink =
    activeTab === "doctors"
      ? "/patient/doctors"
      : activeTab === "hospitals"
      ? "/patient/hospitals"
      : "/patient/clinics";

  const viewAllLabel =
    activeTab === "doctors"
      ? "View all doctors →"
      : activeTab === "hospitals"
      ? "View all hospitals →"
      : "View all clinics →";

  return (
    <section className="py-10 sm:py-14 bg-vd-cream/30 border-b border-stone-100" id="healthcare-near-you">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-vd-forest mb-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{coords ? "Nearby within 25 km" : "Find healthcare near you"}</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
              Healthcare near you
            </h2>
          </div>

          {/* Tabs: Doctors | Hospitals | Clinics */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("doctors")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "doctors"
                  ? "bg-vd-forest text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Doctors
            </button>
            <button
              onClick={() => setActiveTab("hospitals")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "hospitals"
                  ? "bg-vd-forest text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Hospitals
            </button>
            <button
              onClick={() => setActiveTab("clinics")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "clinics"
                  ? "bg-vd-forest text-white shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Clinics
            </button>
          </div>
        </div>

        {/* Location prompt when location is NOT enabled */}
        {!coords && !permissionDenied && (
          <div className="mb-5 p-3.5 rounded-xl bg-white border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-700">
              <Compass className="w-4 h-4 text-vd-forest shrink-0" />
              <span>Allow location access to discover doctors, hospitals and clinics nearby.</span>
            </div>
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="px-3.5 py-1.5 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white font-semibold text-xs shrink-0 transition-colors cursor-pointer"
            >
              {locationLoading ? "Detecting..." : "Use my location"}
            </button>
          </div>
        )}

        {/* Location access disabled state */}
        {permissionDenied && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Location access is disabled.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={requestLocation}
                className="px-3 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Enable location
              </button>
              <Link
                href={viewAllLink}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-xs hover:bg-amber-50 transition-colors"
              >
                Explore all providers →
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-white border border-stone-200 animate-pulse space-y-2.5">
                <div className="w-8 h-8 bg-stone-200 rounded-lg" />
                <div className="h-3.5 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-200 rounded w-1/2" />
                <div className="h-7 bg-stone-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {items.map((item) => {
              const isDoctor = activeTab === "doctors";
              const isHospital = activeTab === "hospitals";
              const title = isDoctor ? `Dr. ${item.name.replace(/^Dr\.?\s+/i, "")}` : item.name;
              const subtext = isDoctor
                ? item.specialization || "Specialist"
                : item.city || item.address || "Healthcare Facility";
              const rating = item.rating;
              const link = isDoctor
                ? `/doctors/${item.id}`
                : isHospital
                ? `/patient/hospitals`
                : `/patient/clinics`;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white border border-stone-200/90 hover:border-vd-forest/30 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="w-9 h-9 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-vd-forest">
                        {isDoctor ? (
                          <Stethoscope className="w-4 h-4" />
                        ) : isHospital ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <Building className="w-4 h-4" />
                        )}
                      </div>
                      {rating && (
                        <div className="flex items-center gap-1 text-xs font-bold text-stone-800">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{rating}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-heading text-sm sm:text-base font-bold text-stone-900 group-hover:text-vd-forest transition-colors truncate">
                      {title}
                    </h3>
                    <p className="text-xs text-stone-500 font-normal truncate mt-0.5">
                      {subtext}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-stone-100">
                    <Link
                      href={link}
                      className="w-full py-1.5 rounded-lg bg-stone-50 group-hover:bg-vd-forest text-stone-800 group-hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{isDoctor ? "Book Appointment" : "View Details"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Compact Friendly Empty State */
          <div className="p-6 rounded-xl bg-white border border-stone-200 text-center max-w-md mx-auto">
            <h3 className="text-xs sm:text-sm font-bold text-stone-800">Nothing available nearby yet</h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-3">
              Try exploring providers across a wider area.
            </p>
            <Link
              href={viewAllLink}
              className="px-4 py-1.5 rounded-full bg-vd-forest text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-vd-forest-deep transition-colors"
            >
              <span>{viewAllLabel}</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
