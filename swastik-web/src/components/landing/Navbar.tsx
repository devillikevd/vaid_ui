
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/health-library', label: 'Health Library' },
  { href: '/blogs', label: 'Blogs' },
  { href: '/providers', label: 'Providers & Services' },
  { href: '/doctors', label: 'Find Doctors' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/60 bg-white/45 shadow-[0_8px_30px_rgba(23,59,52,0.08)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 md:px-6 lg:px-16 xl:px-20">

        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center"
        >
          <img
            src="/vaididea-logo.png"
            alt="Vaididea Logo"
            className="h-9 w-auto object-contain sm:h-11 lg:h-12"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 text-xs font-semibold text-[#222] md:flex lg:gap-5 lg:text-sm xl:gap-8 xl:text-[15px]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative whitespace-nowrap py-2 transition-colors duration-200 hover:text-[#2B6A60] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#2B6A60] after:transition-all hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden shrink-0 items-center gap-2 md:flex lg:gap-4">
          <Link
            href="/providers"
            className="rounded-full border border-white/70 bg-white/35 px-3 py-2 text-xs font-semibold text-[#222] shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-md lg:px-5 lg:py-2.5 lg:text-sm"
          >
            Log In
          </Link>

          <Link
            href="/app"
            className="rounded-full bg-[#2B6A60] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1E5B53] hover:shadow-md lg:px-5 lg:py-2.5 lg:text-sm"
          >
            Get The App
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/35 text-[#222] shadow-sm backdrop-blur-md transition-all hover:bg-white/70 hover:shadow-md md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="absolute left-0 top-full w-full border-b border-white/60 bg-white/65 px-4 pb-5 pt-3 shadow-[0_14px_35px_rgba(23,59,52,0.12)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
        >
          <div className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-[15px] font-semibold text-[#222] transition-colors hover:bg-white hover:text-[#2B6A60]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/60 pt-4">
            <Link
              href="/login"
              onClick={closeMenu}
              className="flex items-center justify-center rounded-full border border-[#222] px-3 py-3 text-sm font-semibold text-[#222] transition-colors hover:bg-white"
            >
              Log In
            </Link>

            <Link
              href="/app"
              onClick={closeMenu}
              className="flex items-center justify-center rounded-full bg-[#2B6A60] px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E5B53]"
            >
              Get The App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
