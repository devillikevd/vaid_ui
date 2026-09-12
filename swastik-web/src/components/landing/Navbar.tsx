"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import VaidideaLogo from "@/components/shared/VaidideaLogo";
import { useAuthStore } from "@/stores/authStore";
import AppDownloadModal from "@/components/shared/AppDownloadModal";
import {
  Menu,
  X,
  User,
  Smartphone,
  ChevronRight,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/doctors", label: "Find Doctors" },
    { href: "/specialties", label: "Specialties" },
    { href: "/health-library", label: "Health Library" },
    { href: "/providers", label: "For Providers" },
  ];

  return (
    <>
      {/* ── Desktop / Tablet Header ── */}
      <header
        className={`sticky top-0 w-full z-50 bg-white transition-all duration-200 ${
          scrolled
            ? "border-b border-stone-200/70 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
            : "border-b border-stone-200/50"
        }`}
        role="banner"
      >
        <nav
          aria-label="Main navigation"
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 transition-all duration-200 ${
            scrolled ? "h-[64px]" : "h-[72px]"
          }`}
        >
          {/* ── Logo ── */}
          <Link
            href="/"
            aria-label="Vaididea — go to homepage"
            className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest focus-visible:ring-offset-2 rounded-lg"
          >
            <VaidideaLogo className="w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[1.05rem] sm:text-[1.15rem] font-bold tracking-tight text-vd-forest leading-none select-none">
              Vaididea
            </span>
          </Link>

          {/* ── Center Nav Links (lg+) ── */}
          <div className="hidden lg:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              const isProviders = link.href === "/providers";

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-3.5 py-2 rounded-[10px] text-[13px] font-medium
                    transition-all duration-150 whitespace-nowrap
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest focus-visible:ring-offset-1
                    ${
                      isActive
                        ? "bg-emerald-50 text-vd-forest font-semibold"
                        : isProviders
                        ? "text-vd-forest hover:bg-emerald-50/70 hover:text-vd-forest"
                        : "text-stone-600 hover:text-vd-forest hover:bg-stone-50"
                    }
                  `}
                >
                  {link.label}
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-vd-forest/60" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sign In / My Account */}
            {isAuthenticated ? (
              <Link
                href="/patient"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-stone-700 hover:text-vd-forest hover:bg-stone-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
              >
                <User className="w-3.5 h-3.5 text-vd-forest" />
                <span>My Account</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full text-[13px] font-medium text-stone-600 hover:text-vd-forest hover:bg-stone-50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest"
              >
                Sign In
              </Link>
            )}

            {/* Divider */}
            <div className="hidden sm:block w-px h-4 bg-stone-200" />

            {/* Get the App CTA */}
            <button
              onClick={() => setAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-vd-forest hover:bg-vd-forest-deep active:scale-[0.98] transition-all duration-150 shadow-[0_1px_6px_rgba(15,95,80,0.25)] hover:shadow-[0_3px_12px_rgba(15,95,80,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest focus-visible:ring-offset-2 cursor-pointer"
              aria-label="Download the Vaididea Patient App"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Get the App</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Navigation Drawer ── */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        className={`fixed inset-y-0 right-0 z-[70] w-[280px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-200 ease-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <VaidideaLogo className="w-7 h-7" />
            <span className="text-base font-bold text-vd-forest leading-none">
              Vaididea
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Drawer links */}
        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);
            const isProviders = link.href === "/providers";

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest ${
                  isActive
                    ? "bg-emerald-50 text-vd-forest font-semibold"
                    : isProviders
                    ? "text-vd-forest hover:bg-emerald-50/60"
                    : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                <span>{link.label}</span>
                <ChevronRight
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-vd-forest" : "text-stone-300"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer actions */}
        <div className="px-4 py-4 border-t border-stone-100 space-y-2.5">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setAppModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-vd-forest text-white text-[13.5px] font-semibold shadow-[0_2px_8px_rgba(15,95,80,0.22)] hover:bg-vd-forest-deep transition-all duration-150 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Get the Patient App</span>
          </button>

          {isAuthenticated ? (
            <Link
              href="/patient"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 text-[13px] font-medium hover:bg-stone-100 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-vd-forest" />
              <span>My Account</span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-full py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 text-[13px] font-medium hover:bg-stone-100 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={appModalOpen}
        onClose={() => setAppModalOpen(false)}
      />
    </>
  );
}
