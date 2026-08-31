"use client";

import React from "react";
import Link from "next/link";
import VaidideaLogo from "@/components/shared/VaidideaLogo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-vd-forest text-emerald-100/90 pt-8 pb-5 sm:pt-9 sm:pb-6 border-t border-emerald-900/60">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-6 sm:gap-8 gap-y-7">
          {/* Brand Column (lg: 4 cols) */}
          <div className="col-span-2 lg:col-span-4 pr-0 lg:pr-6">
            <Link href="/" className="flex items-center gap-2.5 mb-2.5 group inline-flex">
              <VaidideaLogo className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              <span className="font-heading text-lg sm:text-xl font-bold text-white uppercase tracking-tight">
                VAIDIDEA
              </span>
            </Link>
            <p className="text-xs sm:text-[13px] text-emerald-100/90 font-normal leading-relaxed max-w-sm mb-3.5">
              One intelligent healthcare ecosystem connecting patients, doctors, hospitals, clinics,
              pharmacies, diagnostic labs, wellness providers, fitness centres, and emergency response.
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              <a
                href="https://www.instagram.com/vaididea/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="Instagram"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@vaididea"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="YouTube"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path d="M2.5 7.1C2.6 5.9 3.5 5 4.7 4.9 8.2 4.5 12 4.5 15.3 4.9c1.2.1 2.1 1 2.2 2.2.4 2.8.4 6 0 8.8-.1 1.2-1 2.1-2.2 2.2-3.3.4-7.1.4-10.6 0-1.2-.1-2.1-1-2.2-2.2-.4-2.8-.4-6 0-8.8Z" />
                  <polygon points="9.5 15.5 15.5 12 9.5 8.5" fill="currentColor" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/vaididea-healthcare/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/10"
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform Column (lg: 2.5 cols) */}
          <div className="col-span-1 lg:col-span-3">
            <h4 className="text-white font-semibold mb-2.5 text-xs tracking-widest uppercase">
              Platform
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[13px] font-medium">
              <li>
                <a href="#patient-app" className="text-emerald-100/90 hover:text-white transition-colors">
                  Patient App
                </a>
              </li>
              <li>
                <Link href="/patient/doctors" className="text-emerald-100/90 hover:text-white transition-colors">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link href="/health-library" className="text-emerald-100/90 hover:text-white transition-colors">
                  Health Library
                </Link>
              </li>
              <li>
                <a href="#emergency-sos" className="text-emerald-100/90 hover:text-white transition-colors">
                  Emergency SOS
                </a>
              </li>
            </ul>
          </div>

          {/* Provider Portals (All 7 Categories) (lg: 3 cols) */}
          <div className="col-span-1 lg:col-span-3">
            <h4 className="text-white font-semibold mb-2.5 text-xs tracking-widest uppercase">
              Providers
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[13px] font-medium">
              <li>
                <Link href="/register/doctor" className="text-emerald-100/90 hover:text-white transition-colors">
                  Doctor Portal
                </Link>
              </li>
              <li>
                <Link href="/register/hospital" className="text-emerald-100/90 hover:text-white transition-colors">
                  Hospital Portal
                </Link>
              </li>
              <li>
                <Link href="/register/clinic" className="text-emerald-100/90 hover:text-white transition-colors">
                  Clinic Portal
                </Link>
              </li>
              <li>
                <Link href="/register/pharmacy" className="text-emerald-100/90 hover:text-white transition-colors">
                  Pharmacy Portal
                </Link>
              </li>
              <li>
                <Link href="/register/diagnostic-center" className="text-emerald-100/90 hover:text-white transition-colors">
                  Diagnostic Center
                </Link>
              </li>
              <li>
                <Link href="/wellness" className="text-emerald-100/90 hover:text-white transition-colors">
                  Wellness Portal
                </Link>
              </li>
              <li>
                <Link href="/fitness-center" className="text-emerald-100/90 hover:text-white transition-colors">
                  Fitness Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column (lg: 2 cols) */}
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-white font-semibold mb-2.5 text-xs tracking-widest uppercase">
              Company
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-[13px] font-medium">
              <li>
                <Link href="/vision" className="text-emerald-100/90 hover:text-white transition-colors">
                  Our Vision
                </Link>
              </li>
              <li>
                <a href="#trust" className="text-emerald-100/90 hover:text-white transition-colors">
                  Security & Trust
                </a>
              </li>
              <li>
                <Link href="/login" className="text-emerald-100/90 hover:text-white transition-colors">
                  Account Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 sm:mt-7 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-emerald-100/75">
          <p>© {currentYear} Vaididea Healthcare. All rights reserved.</p>
          <div className="flex items-center gap-3.5 text-xs text-emerald-100/75">
            <a href="#trust" className="hover:text-white text-emerald-100/80 transition-colors">
              Privacy & Consent
            </a>
            <span className="w-1 h-1 rounded-full bg-emerald-100/50" />
            <a href="#trust" className="hover:text-white text-emerald-100/80 transition-colors">
              Terms & Standards
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

