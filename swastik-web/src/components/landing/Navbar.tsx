"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import VaidideaLogo from "@/components/shared/VaidideaLogo";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const darkSections = document.querySelectorAll(".dark-section, [data-theme='dark']");
      let overDark = false;
      const navbarHeight = 70;

      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= navbarHeight && rect.bottom >= navbarHeight / 2) {
          overDark = true;
        }
      });
      setIsDarkTheme(overDark);
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
    { href: "/#hero", label: "Ecosystem" },
    { href: "/#patient-care", label: "Patient Care" },
    { href: "/#emergency-sos", label: "Emergency SOS" },
    { href: "/#providers", label: "Providers" },
    { href: "/#health-library-section", label: "Health Library" },
    { href: "/vision", label: "Our Vision" },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    href: string
  ) => {
    if (href.startsWith("/#") && pathname === "/") {
      const targetId = href.replace("/#", "");
      const element = document.getElementById(targetId);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }
    }
    setMobileMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className={`fixed w-full top-0 z-50 transition-all duration-400 ease-out border-b ${
          isDarkTheme ? "border-white/10" : "border-stone-200/80"
        } ${
          scrolled
            ? isDarkTheme
              ? "py-2.5 bg-black/85 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
              : "py-2.5 bg-white/90 backdrop-blur-2xl shadow-[0_4px_25px_rgba(0,0,0,0.04)]"
            : isDarkTheme
            ? "py-3.5 sm:py-4 bg-black/60 backdrop-blur-xl"
            : "py-3.5 sm:py-4 bg-[#FAF8F4]/90 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2.5 group">
            <VaidideaLogo
              className={`w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-300 group-hover:scale-105 ${
                isDarkTheme ? "text-white" : ""
              }`}
            />
            <span
              className={`font-heading text-xl sm:text-2xl font-bold tracking-tight uppercase transition-colors duration-300 ${
                isDarkTheme ? "text-white" : "text-vd-forest"
              }`}
            >
              VAIDIDEA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive = (link.href === "/vision" && pathname === "/vision") || (link.href === "/" && pathname === "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`text-[14px] font-medium transition-colors duration-200 relative ${
                    isActive
                      ? isDarkTheme
                        ? "text-white font-bold"
                        : "text-vd-forest font-bold"
                      : isDarkTheme
                      ? "text-white/70 hover:text-white"
                      : "text-vd-muted hover:text-vd-forest"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-vd-forest rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side Action & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/patient"
              className={`hidden sm:inline-flex items-center justify-center px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                isDarkTheme
                  ? "bg-white text-black hover:bg-gray-100"
                  : "bg-vd-forest text-white hover:bg-vd-forest-deep shadow-xs"
              }`}
            >
              Patient Portal →
            </Link>

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden flex flex-col gap-[5px] w-7 h-7 justify-center z-50 relative cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span
                className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center ${
                  isDarkTheme ? "bg-white" : "bg-vd-forest"
                } ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`}
              />
              <span
                className={`block h-[2px] w-full rounded-full transition-all duration-300 ${
                  isDarkTheme ? "bg-white" : "bg-vd-forest"
                } ${mobileMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-[2px] w-full rounded-full transition-all duration-300 origin-center ${
                  isDarkTheme ? "bg-white" : "bg-vd-forest"
                } ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-vd-cream z-40 transition-all duration-400 lg:hidden flex flex-col justify-center px-8 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          {navLinks.map((link) => {
            const isActive = (link.href === "/vision" && pathname === "/vision");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-2xl font-heading font-semibold transition-colors ${
                  isActive ? "text-vd-forest font-bold underline" : "text-vd-forest hover:text-vd-sage"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/patient"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-4 px-8 py-3.5 bg-vd-forest text-white rounded-full text-sm font-bold tracking-wide cursor-pointer"
          >
            Patient Portal →
          </Link>
        </div>
      </div>
    </>
  );
}

