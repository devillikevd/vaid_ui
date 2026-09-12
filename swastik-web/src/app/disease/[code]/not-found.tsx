import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { BookOpen, ArrowLeft, Search, Home } from 'lucide-react';

export default function DiseaseNotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-vd-forest mb-6 shadow-sm">
          <BookOpen className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 mb-3">
          Error 404
        </span>

        <h1 className="font-heading font-bold text-2xl sm:text-4xl text-stone-900 mb-3">
          Medical Condition Not Found
        </h1>

        <p className="text-stone-600 text-sm sm:text-base max-w-lg mb-8 leading-relaxed font-light">
          The requested ICD-10 disease code or medical condition was not found in the Vaididea Health Library index. Please explore our categorized medical library or search by symptom.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/health-library"
            className="inline-flex items-center gap-2 px-6 py-3 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Explore Health Library</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-sm font-semibold border border-stone-200 transition-all shadow-2xs cursor-pointer"
          >
            <Home className="w-4 h-4 text-stone-500" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
