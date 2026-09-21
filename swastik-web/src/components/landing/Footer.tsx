"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Instagram, Linkedin, Youtube, ChevronDown } from "lucide-react";

// ─── Accordion section data (single source of truth) ────────────────────────
const footerSections = [
  {
    id: "patients",
    label: "FOR PATIENTS",
    links: [
      { label: "Find Doctors", href: "/doctors" },
      { label: "Specialties", href: "/specialties" },
      { label: "Health Library", href: "/health-library" },
    ],
  },
  {
    id: "providers",
    label: "FOR PROVIDERS",
    links: [
      { label: "Provider Overview", href: "/providers", highlight: true },
      { label: "Doctor Registration", href: "/register/doctor" },
      { label: "Hospital Registration", href: "/register/hospital" },
      { label: "Clinic Registration", href: "/register/clinic" },
      { label: "Diagnostic Registration", href: "/register/diagnostic-center" },
      { label: "Pharmacy Registration", href: "/register/pharmacy" },
      { label: "Fitness Center Registration", href: "/register/fitness-center" },
      { label: "Wellness Coach Registration", href: "/register/wellness" },
    ],
  },
  {
    id: "resources",
    label: "RESOURCES",
    links: [
      { label: "Health Library", href: "/health-library" },
      { label: "Specialties Directory", href: "/specialties" },
      { label: "Doctor Directory", href: "/doctors" },
    ],
  },
  {
    id: "company",
    label: "COMPANY",
    links: [
      { label: "About & Vision", href: "/vision" },
      { label: "Contact", href: "/vision#contact" },
      { label: "Sign In", href: "/login" },
    ],
  },
];

// ─── Social icons data ────────────────────────────────────────────────────────
const socialLinks = [
  {
    href: "https://www.instagram.com/vaididea/",
    label: "Follow Vaididea on Instagram",
    Icon: Instagram,
  },
  {
    href: "https://www.linkedin.com/company/vaididea-healthcare/",
    label: "Follow Vaididea on LinkedIn",
    Icon: Linkedin,
  },
  {
    href: "https://www.youtube.com/@vaididea",
    label: "Follow Vaididea on YouTube",
    Icon: Youtube,
  },
];

// ─── Accordion row (mobile only) ─────────────────────────────────────────────
function AccordionSection({
  section,
  isOpen,
  onToggle,
}: {
  section: (typeof footerSections)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`footer-section-${section.id}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">
          {section.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-emerald-300/70 transition-transform duration-250 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible links — CSS max-height transition */}
      <div
        id={`footer-section-${section.id}`}
        role="region"
        aria-label={section.label}
        style={{
          maxHeight: isOpen ? `${section.links.length * 48 + 16}px` : "0px",
          overflow: "hidden",
          transition: "max-height 0.28s ease-out",
        }}
      >
        <ul className="pb-3 space-y-3">
          {section.links.map((link) => (
            <li key={link.href + link.label}>
              <Link
                href={link.href}
                className={`text-sm transition-colors duration-150 ${
                  link.highlight
                    ? "font-semibold text-emerald-300 hover:text-white"
                    : "text-emerald-100/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Social icons row ────────────────────────────────────────────────────────
function SocialRow() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-emerald-100/90 font-medium text-xs">
        Follow Vaididea
      </span>
      <div className="flex items-center gap-2">
        {socialLinks.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-8 h-8 rounded-full border border-white/15 bg-white/10 text-emerald-100 hover:text-white hover:border-emerald-400 hover:bg-white/20 flex items-center justify-center transition-colors duration-150"
          >
            <Icon className="w-4 h-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Footer ─────────────────────────────────────────────────────────────
export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Track which accordion section is open on mobile (null = all collapsed)
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  return (
    <footer className="w-full bg-vd-forest-deep text-emerald-100/80 border-t border-emerald-900/30">

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP / TABLET (sm+): Original multi-column grid — UNCHANGED
          ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block pt-12 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
            {/* Brand column */}
            <div className="space-y-3 col-span-2 md:col-span-3 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <img 
                  src="/logo.png" 
                  alt="Vaididea Logo" 
                  className="h-10 w-auto object-contain brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity" 
                />
                <span className="font-heading text-2xl font-bold tracking-tight text-white">
                  Vaididea
                </span>
              </Link>
              <p className="text-sm text-emerald-100/70 leading-relaxed max-w-sm font-light">
                Modern healthcare discovery and booking platform connecting
                patients with verified doctors, hospitals, clinics, diagnostics,
                and pharmacies.
              </p>
            </div>

            {/* Link columns */}
            {footerSections.map((section) => (
              <div key={section.id} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {section.label}
                </h4>
                <ul className="space-y-2.5 text-sm text-emerald-100/70">
                  {section.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className={`hover:text-white transition-colors duration-150 ${
                          link.highlight ? "font-semibold text-emerald-300" : ""
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom row */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-100/70">
            <p>© {currentYear} Vaididea. All rights reserved.</p>
            <SocialRow />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE (<sm): Compact accordion footer
          ════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden px-4 pt-7 pb-6">
        {/* Brand */}
        <div className="mb-5">
          <Link href="/" className="inline-flex items-center gap-2 mb-2.5 group">
            <img 
              src="/logo.png" 
              alt="Vaididea Logo" 
              className="h-8 w-auto object-contain brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity" 
            />
            <span className="font-heading text-xl font-bold tracking-tight text-white">
              Vaididea
            </span>
          </Link>
          <p className="text-xs text-emerald-100/65 leading-relaxed font-light">
            Modern healthcare discovery and booking platform connecting patients
            with verified doctors, hospitals, and pharmacies.
          </p>
        </div>

        {/* Accordion sections */}
        <div className="mb-5">
          {footerSections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={openSection === section.id}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
          {/* Bottom border after last section */}
          <div className="border-t border-white/10" />
        </div>

        {/* Bottom: copyright + social */}
        <div className="flex flex-col gap-3">
          <SocialRow />
          <p className="text-[11px] text-emerald-100/50">
            © {currentYear} Vaididea. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
