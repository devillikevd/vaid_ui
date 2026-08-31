/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function FinalCtaSection() {
  const [scannerOpen, setScannerOpen] = useState(false);

  const handlePatientApp = () => {
    if (typeof window !== "undefined") {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;
      if (isMobile) {
        window.open(
          "https://play.google.com/store/apps/details?id=com.vaididea.patient",
          "_blank"
        );
        return;
      }
    }
    setScannerOpen(true);
  };

  return (
    <section className="py-20 sm:py-28 bg-[#FAF8F4] text-stone-900 relative overflow-hidden border-t border-stone-200/60" id="final-cta">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200/80 mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
            Get Connected Today
          </span>
        </div>

        <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold mb-6 tracking-tight leading-[1.1]">
          The future of healthcare is{" "}
          <em className="text-vd-sage italic font-normal">connected.</em>
        </h2>

        <p className="text-base sm:text-lg text-stone-600 max-w-xl mx-auto mb-10 font-light leading-relaxed">
          Join the Vaididea ecosystem. Whether you seek immediate care or provide clinical
          excellence, your journey starts here.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handlePatientApp}
            className="w-full sm:w-auto px-8 py-4 bg-vd-forest text-white rounded-full text-sm font-bold tracking-wide hover:bg-vd-forest-deep transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Get the Patient App</span>
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          <a
            href="#providers"
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-full text-sm font-semibold tracking-wide transition-all shadow-xs hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Join as a Provider</span>
            <svg
              className="w-4 h-4 text-vd-forest"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>

      {/* QR Modal */}
      {scannerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setScannerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <div
            className="apple-glass-card bg-white/95 p-8 sm:p-10 rounded-[2.5rem] max-w-sm w-full mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative animate-in zoom-in-95 duration-300 text-center text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-5 right-5 p-2 bg-gray-500/5 hover:bg-gray-500/15 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              onClick={() => setScannerOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-2xl font-heading font-bold text-vd-forest mb-2">Get Patient App</h3>
            <p className="text-xs text-vd-muted mb-6">Scan QR code to install the Vaididea app directly.</p>
            <div className="bg-white p-4 rounded-2xl flex justify-center mb-6 shadow-xs border border-gray-100">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0F5F50&data=https://vaididea.com/download/patient"
                alt="QR Code"
                className="w-44 h-44 rounded-xl"
              />
            </div>
            <button
              className="w-full py-3.5 bg-vd-forest text-white rounded-xl font-semibold tracking-wide hover:bg-vd-forest-deep transition-all cursor-pointer"
              onClick={() => setScannerOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
