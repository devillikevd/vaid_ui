"use client";

import React from "react";
import { X, Smartphone, ArrowRight } from "lucide-react";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppDownloadModal({ isOpen, onClose }: AppDownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      <div
        className="bg-white p-6 sm:p-7 rounded-3xl max-w-sm w-full mx-auto shadow-2xl relative text-center text-stone-900 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-semibold mb-3 border border-emerald-200/60">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Vaididea Patient Android App</span>
        </div>

        <h3 className="font-heading text-xl font-bold text-vd-forest mb-1.5">
          Get the Vaididea App
        </h3>
        <p className="text-xs text-stone-500 mb-5 leading-relaxed">
          Manage appointments, video consultations, medical records, prescriptions, and digital health cards on your Android device.
        </p>

        <div className="bg-stone-50 p-4 rounded-2xl flex flex-col items-center justify-center mb-5 border border-stone-200/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=1A3D2F&data=https://play.google.com/store/apps/details?id=com.vaididea.patient"
            alt="Scan QR code to install Vaididea app"
            className="w-36 h-36 rounded-xl border border-stone-100 shadow-2xs"
          />
          <span className="text-[11px] text-stone-500 font-medium mt-2">
            Scan with phone camera to download
          </span>
        </div>

        <a
          href="https://play.google.com/store/apps/details?id=com.vaididea.patient"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <span>Open Google Play Store</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
