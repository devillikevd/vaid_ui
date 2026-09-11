"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pill, Search, UploadCloud } from "lucide-react";

export default function PharmacySection() {
  const router = useRouter();
  const [medicineQuery, setMedicineQuery] = useState("");

  const handleSearchMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (medicineQuery.trim()) {
      router.push(`/patient/pharmacy?search=${encodeURIComponent(medicineQuery.trim())}`);
    } else {
      router.push("/patient/pharmacy");
    }
  };

  return (
    <section className="py-10 sm:py-12 bg-white border-b border-stone-100" id="pharmacy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-5 sm:p-7 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-vd-cream/30 to-stone-50 border border-emerald-200/50 shadow-2xs">
          <div className="grid lg:grid-cols-12 gap-5 items-center">
            {/* Left Info */}
            <div className="lg:col-span-6 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-vd-forest">
                <Pill className="w-3.5 h-3.5" />
                <span>Pharmacy</span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-vd-forest tracking-tight">
                Medicines delivered to your doorstep
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed">
                Search medicines or upload your prescription for convenient pharmacy ordering.
              </p>
            </div>

            {/* Right Actions */}
            <div className="lg:col-span-6 space-y-2.5">
              {/* Search Bar */}
              <form onSubmit={handleSearchMedicine} className="flex gap-2">
                <div className="flex-1 bg-white px-3 py-1.5 rounded-xl border border-stone-200 flex items-center gap-2 focus-within:border-vd-forest transition-colors">
                  <Search className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    value={medicineQuery}
                    onChange={(e) => setMedicineQuery(e.target.value)}
                    className="w-full text-xs text-stone-800 focus:outline-none bg-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-vd-forest text-white text-xs font-semibold hover:bg-vd-forest-deep transition-colors cursor-pointer shrink-0"
                >
                  Search Medicines
                </button>
              </form>

              {/* Upload Prescription Action */}
              <div className="flex justify-end">
                <Link
                  href="/patient/pharmacy"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-vd-forest hover:text-vd-forest-deep transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Prescription →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
