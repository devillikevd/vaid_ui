'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function DoctorDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log non-sensitive error info for observability
    console.error('Doctor detail route error:', error?.message || 'Unknown error');
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-5 shadow-2xs">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-stone-900 mb-2">
          Unable to Load Doctor Profile
        </h1>

        <p className="text-stone-600 text-sm max-w-md mb-8 leading-relaxed font-light">
          We encountered a temporary issue while loading this specialist&apos;s details. Please try refreshing or return to the directory.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold border border-stone-200 transition-all shadow-2xs cursor-pointer"
          >
            <span>Browse All Doctors</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
