"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import AppDownloadModal from "@/components/shared/AppDownloadModal";
import {
  Menu,
  X,
  User,
  Smartphone,
  ChevronRight,
  Search,
  ChevronDown,
  ArrowRight,
  HeartPulse,
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
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] border-b border-white/50"
            : "bg-white/40 backdrop-blur-md border-b border-white/30"
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
            className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md"
          >
            <img 
              src="/logo.png" 
              alt="Vaididea Logo" 
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-110 transition-transform duration-300" 
            />
            <span className="text-2xl sm:text-[26px] font-extrabold text-[#0F5F50] tracking-tight leading-none">
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
                    relative px-3.5 py-2 rounded-[10px] text-[14px] font-medium
                    transition-all duration-150 whitespace-nowrap
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1
                    ${
                      isActive
                        ? "text-emerald-700 font-semibold"
                        : "text-stone-600 hover:text-emerald-700"
                    }
                  `}
                >
                  {link.label}
                  {/* Active indicator border */}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] rounded-t-full bg-emerald-600" />
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
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-medium text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>My Account</span>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/download"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-all duration-150 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Patient App
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-bold text-stone-800 bg-white border border-stone-200 hover:bg-stone-50 transition-all duration-150 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </Link>
              </div>
            )}

            {/* Divider */}
            <div className="hidden sm:block w-px h-4 bg-stone-200" />

            {/* Get the App CTA */}
            <button
              onClick={() => setAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-semibold text-white bg-gray-900 hover:bg-black active:scale-[0.98] transition-all duration-150 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 cursor-pointer"
              aria-label="Download the Vaididea Patient App"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Register App</span>
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
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Vaididea Logo" 
              className="h-8 w-auto object-contain" 
            />
            <span className="text-2xl font-extrabold text-[#0F5F50] tracking-tight leading-none">
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-[14px] font-semibold shadow-md hover:bg-black transition-all duration-150 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Register App</span>
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
