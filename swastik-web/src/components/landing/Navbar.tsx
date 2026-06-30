"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

function VaidideaLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer Heart Shape forming a V */}
      <path d="M 50 90 L 22 55 C 8 38 25 12 45 28 L 50 32 L 55 28 C 75 12 92 38 78 55 L 50 90 Z" 
            stroke="#1B4D3E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Inner Checkmark forming the right side of V */}
      <path d="M 30 50 L 45 68 L 72 32" 
            stroke="#2D6A4F" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            
      {/* Plus Sign */}
      <path d="M 78 45 L 78 60 M 70.5 52.5 L 85.5 52.5" 
            stroke="#1B4D3E" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "#ecosystem", label: "Ecosystem" },
    { href: "#patient-app", label: "Patient App" },
    { href: "#providers", label: "For Providers" },
    { href: "#vision", label: "Our Vision" },
  ];

  return (
    <>
      <nav
        className={`fixed w-full top-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'py-3 bg-white/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border-b border-white/50'
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <VaidideaLogo className="w-9 h-9 transition-transform duration-300 group-hover:scale-105" />
            <span className="font-heading text-2xl font-semibold tracking-tight text-vd-forest">
              Vaididea
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-[15px] font-medium text-vd-muted hover:text-vd-forest transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">


            {/* Mobile Hamburger */}
            <button
              className="lg:hidden flex flex-col gap-[5px] w-7 h-7 justify-center z-50 relative"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`block h-[2px] w-full bg-vd-forest rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-[2px] w-full bg-vd-forest rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[2px] w-full bg-vd-forest rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-vd-cream z-40 transition-all duration-500 lg:hidden flex flex-col ${
        mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex flex-col items-center justify-center flex-1 gap-8">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-3xl font-heading font-semibold text-vd-forest hover:text-vd-sage transition-colors"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {link.label}
            </a>
          ))}

        </div>
      </div>
    </>
  );
}
