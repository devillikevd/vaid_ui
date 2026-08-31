"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, BookOpen, ArrowRight, Activity, ShieldCheck, Loader2 } from "lucide-react";
import { PUBLIC_API_URL } from "@/lib/env";

export default function HealthLibrarySection() {
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [previewDiseases, setPreviewDiseases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [catsRes, statsRes, searchRes] = await Promise.allSettled([
          fetch(`${PUBLIC_API_URL}/diseases/categories`),
          fetch(`${PUBLIC_API_URL}/diseases/stats`),
          fetch(`${PUBLIC_API_URL}/diseases/alphabet/a?limit=3`),
        ]);

        if (catsRes.status === "fulfilled" && catsRes.value.ok) {
          const cats = await catsRes.value.json();
          setCategories(Array.isArray(cats) ? cats.slice(0, 6) : []);
        }

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const st = await statsRes.value.json();
          setStats(st);
        }

        if (searchRes.status === "fulfilled" && searchRes.value.ok) {
          const res = await searchRes.value.json();
          setPreviewDiseases(res.results || []);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/health-library?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden" id="health-library-section">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid md:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="md:col-span-6 animate-in fade-in slide-in-from-left-6 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vd-cream border border-vd-forest/10 mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-vd-sage animate-pulse" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
                Medical Intelligence
              </span>
            </div>

            <h2 className="font-heading text-3xl sm:text-5xl text-vd-forest font-semibold mb-6 tracking-tight leading-[1.1]">
              A smarter way to{" "}
              <em className="text-vd-sage italic font-normal">understand health.</em>
            </h2>

            <p className="text-base sm:text-lg text-vd-muted mb-8 leading-relaxed font-light">
              Explore thousands of medical conditions, clinical symptoms, and evidence-based guidance indexed
              directly by standard ICD-10 classifications.
            </p>

            <div className="flex flex-wrap gap-2.5 mb-10">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-vd-cream text-vd-forest border border-vd-forest/10">
                {stats?.total_diseases ? `${stats.total_diseases.toLocaleString()} Conditions` : 'Indexed Medical Database'}
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-vd-cream text-vd-forest border border-vd-forest/10">
                {categories.length > 0 ? `${categories.length}+ Body Systems` : 'ICD-10 Chapters'}
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-vd-cream text-vd-forest border border-vd-forest/10">
                AI Symptom Insights
              </span>
            </div>

            <Link
              href="/health-library"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-vd-forest text-white text-sm font-semibold tracking-wide hover:bg-vd-forest-deep transition-all shadow-[0_8px_30px_-6px_rgba(15,95,80,0.4)] hover:-translate-y-0.5 group"
            >
              <span>Explore Full Health Library</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right: Live Dynamic Preview */}
          <div className="md:col-span-6 relative animate-in fade-in slide-in-from-right-6 duration-700 delay-150">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 via-teal-500/10 to-transparent rounded-[3rem] blur-3xl -z-10 transform scale-105" />

            <div className="apple-glass-card bg-white/90 rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] relative overflow-hidden space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-stone-200 shadow-xs">
                <Search className="w-4 h-4 text-vd-forest shrink-0" />
                <input
                  type="text"
                  placeholder="Search conditions, symptoms, or ICD-10..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs sm:text-sm font-light text-stone-800 placeholder:text-stone-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-vd-forest text-white rounded-xl text-xs font-bold shrink-0 hover:bg-vd-forest-deep transition-all"
                >
                  Search
                </button>
              </form>

              {/* Dynamic Categories Chips */}
              {categories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-[10px] font-bold">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/health-library?category=${encodeURIComponent(c.chapter)}`}
                      className="px-3 py-1 bg-vd-cream text-vd-forest border border-vd-forest/10 rounded-full shrink-0 hover:bg-vd-forest hover:text-white transition-colors"
                    >
                      {c.body_system || c.chapter}
                    </Link>
                  ))}
                </div>
              )}

              {/* Live Disease Preview Cards */}
              <div className="space-y-2.5">
                {previewDiseases.length > 0 ? (
                  previewDiseases.map((d) => (
                    <Link
                      key={d.id || d.code}
                      href={`/health-library?q=${encodeURIComponent(d.name)}`}
                      className="bg-white p-3.5 rounded-2xl border border-stone-100 shadow-xs hover:border-vd-forest/30 transition-all flex flex-col gap-1 block group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-stone-100 text-stone-700 rounded">
                            {d.code}
                          </span>
                          <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider truncate max-w-[180px]">
                            {d.body_system || d.chapter}
                          </span>
                        </div>
                        <span
                          className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                            d.severity === 'Critical'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : d.severity === 'Severe'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {d.severity || 'GENERAL'}
                        </span>
                      </div>
                      <h4 className="font-heading font-semibold text-stone-900 text-sm group-hover:text-vd-forest transition-colors">
                        {d.name}
                      </h4>
                      {d.summary && (
                        <p className="text-[10px] text-stone-500 font-light truncate">
                          {d.summary}
                        </p>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-stone-400 font-light">
                    Connecting to SQLite Health Library database...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
