"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav 
        className={`fixed w-full top-0 z-50 px-4 sm:px-6 lg:px-8 transition-all duration-300 flex justify-between items-center font-sans
          ${scrolled 
            ? 'py-3 bg-[#ffffff]/95 backdrop-blur-md border-b border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.08)]' 
            : 'py-4 lg:py-5 bg-[#ffffff] border-b border-slate-200/60 shadow-sm'
          }`}
      >
        {/* Left Side: Logo & Main Links */}
        <div className="flex items-center gap-8 xl:gap-12">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-cyan-400 shadow-[0_4px_15px_rgba(37,99,235,0.3)] group-hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-xl drop-shadow-md font-outfit">V</span>
              </div>
              <span className="font-outfit text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-darkText to-brand-primary group-hover:to-cyan-500 transition-colors duration-300">
                vaididea
              </span>
          </Link>

          {/* Desktop Main Links */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-[15px] font-medium text-slate-600">
            <Link href="/doctors" className="hover:text-brand-primary hover:font-semibold transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-brand-primary after:transition-all after:duration-300 hover:after:w-full">
              Find Doctors
            </Link>
            <Link href="/consult" className="hover:text-brand-primary hover:font-semibold transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-brand-primary after:transition-all after:duration-300 hover:after:w-full">
              Video Consult
            </Link>
            <Link href="/pharmacy" className="hover:text-brand-primary hover:font-semibold transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-brand-primary after:transition-all after:duration-300 hover:after:w-full">
              Nearest Pharmacy
            </Link>
            <Link href="/diagnostic-center" className="hover:text-brand-primary hover:font-semibold transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-brand-primary after:transition-all after:duration-300 hover:after:w-full">
              Diagnostic Center
            </Link>
          </div>
        </div>

        {/* Right Side: Dropdowns, Button */}
        <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden xl:flex items-center gap-2 text-[15px] font-medium text-slate-600">
                
                {/* For Corporates Dropdown */}
                <div className="relative group cursor-pointer" onMouseEnter={() => setDropdownOpen('corporates')} onMouseLeave={() => setDropdownOpen(null)}>
                  <div className="flex items-center gap-1.5 hover:text-brand-primary hover:bg-brand-primary/5 px-3 py-2 rounded-lg transition-all">
                    For Corporates
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-300 ${dropdownOpen === 'corporates' ? 'rotate-180 text-brand-primary' : ''}`}><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className={`absolute top-full right-0 w-56 bg-[#ffffff]/95 backdrop-blur-xl border border-blue-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-xl py-3 z-50 transform origin-top-right transition-all duration-200 ${dropdownOpen === 'corporates' ? 'opacity-100 scale-100 translate-y-2' : 'opacity-0 scale-95 pointer-events-none translate-y-0'}`}>
                    <Link href="/corporates/health-plans" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Corporate Health Plans</Link>
                    <Link href="/corporates/wellness" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Wellness Programs</Link>
                  </div>
                </div>

                {/* For Providers Dropdown */}
                <div className="relative group cursor-pointer" onMouseEnter={() => setDropdownOpen('providers')} onMouseLeave={() => setDropdownOpen(null)}>
                  <div className="flex items-center gap-1.5 hover:text-brand-primary hover:bg-brand-primary/5 px-3 py-2 rounded-lg transition-all">
                    For Providers
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-300 ${dropdownOpen === 'providers' ? 'rotate-180 text-brand-primary' : ''}`}><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className={`absolute top-full right-0 w-48 bg-[#ffffff]/95 backdrop-blur-xl border border-blue-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-xl py-3 z-50 transform origin-top-right transition-all duration-200 ${dropdownOpen === 'providers' ? 'opacity-100 scale-100 translate-y-2' : 'opacity-0 scale-95 pointer-events-none translate-y-0'}`}>
                    <Link href="/provider/join" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Join as Doctor</Link>
                    <Link href="/login" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Provider Login</Link>
                  </div>
                </div>

                {/* Security & help Dropdown */}
                <div className="relative group cursor-pointer" onMouseEnter={() => setDropdownOpen('help')} onMouseLeave={() => setDropdownOpen(null)}>
                  <div className="flex items-center gap-1.5 hover:text-brand-primary hover:bg-brand-primary/5 px-3 py-2 rounded-lg transition-all">
                    Security & help
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-300 ${dropdownOpen === 'help' ? 'rotate-180 text-brand-primary' : ''}`}><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className={`absolute top-full right-0 w-48 bg-[#ffffff]/95 backdrop-blur-xl border border-blue-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-xl py-3 z-50 transform origin-top-right transition-all duration-200 ${dropdownOpen === 'help' ? 'opacity-100 scale-100 translate-y-2' : 'opacity-0 scale-95 pointer-events-none translate-y-0'}`}>
                    <Link href="/security" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Data Security</Link>
                    <Link href="/help" className="block px-5 py-2.5 hover:bg-blue-50/50 hover:text-brand-primary text-slate-700 transition-colors">Help Center</Link>
                  </div>
                </div>
            </div>
            
            <Link href="/login" className="px-5 py-2 sm:px-7 sm:py-2.5 bg-gradient-to-r from-brand-primary to-blue-500 hover:from-blue-600 hover:to-cyan-500 text-white rounded-full text-[13px] sm:text-sm font-semibold shadow-[0_4px_15px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-0.5 whitespace-nowrap border border-blue-400/20">
                Login / Signup
            </Link>

            {/* Mobile Hamburger */}
            <div 
              className={`nav-hamburger lg:hidden ${mobileMenuOpen ? 'active' : ''} cursor-pointer flex flex-col gap-1.5 w-7 h-7 justify-center z-50`} 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                <span className={`block h-[2.5px] w-full bg-brand-darkText rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[8px]' : ''}`}></span>
                <span className={`block h-[2.5px] w-full bg-brand-darkText rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`block h-[2.5px] w-full bg-brand-darkText rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''}`}></span>
            </div>
        </div>

      </nav>

      {/* Mobile Navigation Panel */}
      <div className={`fixed inset-0 bg-[#ffffff]/95 backdrop-blur-xl z-40 transition-all duration-300 lg:hidden overflow-y-auto border-t border-blue-50 ${scrolled ? 'pt-[64px]' : 'pt-[72px]'} ${mobileMenuOpen ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-full'}`}>
        <div className="flex flex-col p-6 gap-6">
            <div className="flex flex-col gap-4 text-lg font-semibold text-[#0F172A]">
              <Link href="/doctors" onClick={() => setMobileMenuOpen(false)}>Find Doctors</Link>
              <Link href="/consult" onClick={() => setMobileMenuOpen(false)}>Video Consult</Link>
              <Link href="/pharmacy" onClick={() => setMobileMenuOpen(false)}>Nearest Pharmacy</Link>
              <Link href="/diagnostic-center" onClick={() => setMobileMenuOpen(false)}>Diagnostic Center</Link>
            </div>
            
            <hr className="border-blue-100" />
            
            <div className="flex flex-col gap-4 text-base font-medium text-slate-600">
              <Link href="/corporates" onClick={() => setMobileMenuOpen(false)}>For Corporates</Link>
              <Link href="/providers" onClick={() => setMobileMenuOpen(false)}>For Providers</Link>
              <Link href="/help" onClick={() => setMobileMenuOpen(false)}>Security & help</Link>
            </div>
        </div>
      </div>
    </>
  );
}
