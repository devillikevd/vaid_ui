"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ChevronRight, 
  X, 
  Loader2, 
  ArrowLeft, 
  AlertCircle, 
  BookOpen, 
  Activity, 
  HelpCircle,
  AlertTriangle
} from "lucide-react";

// Types corresponding to backend Prisma models
interface Disease {
  id: number;
  code: string;
  name: string;
  first_letter: string;
  chapter: string;
  body_system: string;
  severity: string;
  keywords: string;
  source: string;
  variant_count: number;
  summary?: string;
  overview?: string;
  types?: string;
  symptoms?: string;
  causes?: string;
  risk_factors?: string;
  diagnosis?: string;
  medicines?: string;
  home_remedies?: string;
  complications?: string;
  prevention?: string;
  when_to_see_doctor?: string;
  faqs?: string;
}

interface Category {
  id: number;
  chapter: string;
  body_system: string;
  disease_count: number;
  icon: string;
}

interface Stats {
  total_diseases: number;
  total_categories: number;
  severity: { severity: string; cnt: number }[];
  by_letter: { first_letter: string; cnt: number }[];
}

// Medical emoji/icon mapper
const CATEGORY_EMOJIS: Record<string, string> = {
  virus: "🦠", cancer: "🎗️", blood: "🩸", metabolism: "⚖️",
  brain: "🧠", neurology: "⚡", eye: "👁️", ear: "👂",
  heart: "🫀", lungs: "🫁", stomach: "🥞", skin: "🩹",
  bone: "🦴", kidney: "🧼", pregnancy: "🤰", baby: "👶",
  dna: "🧬", stethoscope: "🩺", injury: "🩹", emergency: "🚨",
  checkup: "✅", medical: "🏥", code: "💾",
};

const CATEGORY_COLORS: Record<string, string> = {
  virus: "from-red-500/10 to-red-600/5 text-red-600 border-red-500/20",
  cancer: "from-rose-500/10 to-rose-600/5 text-rose-600 border-rose-500/20",
  blood: "from-red-600/10 to-red-700/5 text-red-700 border-red-600/20",
  metabolism: "from-orange-500/10 to-orange-600/5 text-orange-600 border-orange-500/20",
  brain: "from-purple-500/10 to-purple-600/5 text-purple-600 border-purple-500/20",
  neurology: "from-indigo-500/10 to-indigo-600/5 text-indigo-600 border-indigo-500/20",
  eye: "from-blue-500/10 to-blue-600/5 text-blue-600 border-blue-500/20",
  ear: "from-cyan-500/10 to-cyan-600/5 text-cyan-600 border-cyan-500/20",
  heart: "from-rose-600/10 to-rose-700/5 text-rose-700 border-rose-600/20",
  lungs: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-500/20",
  stomach: "from-amber-500/10 to-amber-600/5 text-amber-600 border-amber-500/20",
  skin: "from-yellow-500/10 to-yellow-600/5 text-yellow-600 border-yellow-500/20",
  bone: "from-slate-500/10 to-slate-600/5 text-slate-600 border-slate-500/20",
  kidney: "from-teal-500/10 to-teal-600/5 text-teal-600 border-teal-500/20",
  pregnancy: "from-pink-500/10 to-pink-600/5 text-pink-600 border-pink-500/20",
  baby: "from-fuchsia-500/10 to-fuchsia-600/5 text-fuchsia-600 border-fuchsia-500/20",
  dna: "from-blue-600/10 to-blue-700/5 text-blue-700 border-blue-600/20",
  stethoscope: "from-sky-500/10 to-sky-600/5 text-sky-600 border-sky-500/20",
  injury: "from-red-500/10 to-red-600/5 text-red-600 border-red-500/20",
  emergency: "from-red-600/10 to-red-700/5 text-red-700 border-red-600/20",
  checkup: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-500/20",
  medical: "from-sky-600/10 to-sky-700/5 text-sky-700 border-sky-600/20",
  code: "from-slate-600/10 to-slate-700/5 text-slate-700 border-slate-600/20",
};

export default function HealthLibraryPage() {
  // Stats & categories
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [activeLetter, setActiveLetter] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  
  // Results state
  const [results, setResults] = useState<Disease[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [currentMode, setCurrentMode] = useState<"search" | "alphabet" | "category" | null>(null);
  const [searchTriggeredQuery, setSearchTriggeredQuery] = useState("");
  
  // Detail modal state
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [diseaseDetails, setDiseaseDetails] = useState<Disease | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("overview");
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});

  const LIMIT = 24;
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Suggestions
  const suggestions = ["Diabetes", "Hypertension", "Malaria", "Asthma", "Tuberculosis"];

  // Fetch initial stats and categories
  useEffect(() => {
    async function loadInitialData() {
      try {
        const statsRes = await fetch("http://localhost:5001/api/diseases/stats");
        const statsData = await statsRes.json();
        setStats(statsData);

        const catsRes = await fetch("http://localhost:5001/api/diseases/categories");
        const catsData = await catsRes.json();
        setCategories(catsData);
      } catch (e) {
        console.error("Failed to load health library stats or categories", e);
      }
    }
    loadInitialData();
  }, []);

  // Fetch results based on active filters/parameters
  const fetchResults = async (page = 1) => {
    if (!currentMode) return;
    setIsSearching(true);
    
    let url = "";
    const sevParam = selectedSeverity ? `&severity=${selectedSeverity}` : "";
    
    if (currentMode === "search") {
      url = `http://localhost:5001/api/diseases/search?q=${encodeURIComponent(searchTriggeredQuery)}&page=${page}&limit=${LIMIT}${sevParam}`;
    } else if (currentMode === "alphabet") {
      url = `http://localhost:5001/api/diseases/alphabet/${activeLetter}?page=${page}&limit=${LIMIT}${sevParam}`;
    } else if (currentMode === "category") {
      url = `http://localhost:5001/api/diseases/category/${encodeURIComponent(activeCategory)}?page=${page}&limit=${LIMIT}${sevParam}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
      setTotalResults(data.total || 0);
      setCurrentPage(data.page || 1);
    } catch (e) {
      console.error("Error fetching disease results", e);
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-fetch on filter or page changes
  useEffect(() => {
    if (currentMode) {
      fetchResults(currentPage);
    }
  }, [selectedSeverity, currentPage, currentMode, activeLetter, activeCategory, searchTriggeredQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;
    
    setActiveLetter("");
    setActiveCategory("");
    setCurrentMode("search");
    setSearchTriggeredQuery(query);
    setCurrentPage(1);
    
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLetterClick = (letter: string) => {
    setSearchQuery("");
    setActiveCategory("");
    setActiveLetter(letter);
    setCurrentMode("alphabet");
    setCurrentPage(1);
    
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCategoryClick = (chapterName: string) => {
    setSearchQuery("");
    setActiveLetter("");
    setActiveCategory(chapterName);
    setCurrentMode("category");
    setCurrentPage(1);
    
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Details Modal handler
  const handleOpenDetails = async (disease: Disease) => {
    setSelectedDisease(disease);
    setDiseaseDetails(null);
    setIsLoadingDetails(true);
    setActiveDetailTab("overview");
    setOpenFaqs({});
    document.body.style.overflow = "hidden";

    try {
      const res = await fetch(`http://localhost:5001/api/diseases/disease/${disease.code}/details`);
      const details = await res.json();
      setDiseaseDetails(details);
    } catch (e) {
      console.error("Error loading disease details", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedDisease(null);
    setDiseaseDetails(null);
    document.body.style.overflow = "unset";
  };

  // Severity style helper
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return {
          border: "border-red-500/25 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500",
          pill: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200",
          accent: "text-red-600"
        };
      case "Severe":
        return {
          border: "border-orange-500/25 bg-orange-50/50 dark:bg-orange-950/20 hover:border-orange-500",
          pill: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200",
          accent: "text-orange-600"
        };
      case "Moderate":
        return {
          border: "border-yellow-500/25 bg-yellow-50/50 dark:bg-yellow-950/20 hover:border-yellow-500",
          pill: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200",
          accent: "text-amber-600"
        };
      default:
        return {
          border: "border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500",
          pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200",
          accent: "text-emerald-600"
        };
    }
  };

  // Convert "<li><strong>Q?</strong> A</li>" into question-answer arrays
  const parseFaqs = (faqHtml?: string) => {
    if (!faqHtml) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<ul>${faqHtml}</ul>`, "text/html");
      const listItems = doc.querySelectorAll("li");
      
      return Array.from(listItems).map((li, idx) => {
        const strong = li.querySelector("strong");
        const question = strong ? strong.textContent?.trim() || "Question" : "Question";
        if (strong) strong.remove();
        const answer = li.textContent?.trim() || "Answer not available.";
        return { id: idx, question, answer };
      });
    } catch {
      return [];
    }
  };

  const parseHtmlList = (htmlString?: string) => {
    if (!htmlString) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<ul>${htmlString}</ul>`, "text/html");
      const listItems = doc.querySelectorAll("li");
      return Array.from(listItems).map(li => li.innerHTML);
    } catch {
      return [];
    }
  };

  const totalPages = Math.ceil(totalResults / LIMIT) || 1;

  // Pagination page windows
  const getPageNumbers = () => {
    const pages = new Set<number>([1, totalPages]);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i >= 1 && i <= totalPages) pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const letterCounts: Record<string, number> = {};
  if (stats?.by_letter) {
    stats.by_letter.forEach(item => {
      letterCounts[item.first_letter] = item.cnt;
    });
  }

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-slate-800 font-sans selection:bg-vd-forest/10">
      {/* Mini Header / Back Navigation */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center shadow-[0_2px_15px_rgba(0,0,0,0.01)]">
        <Link href="/" className="flex items-center gap-2 group text-vd-forest hover:text-vd-forest/80 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Telemedicine Portal</span>
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-vd-forest" />
          <span className="font-heading font-semibold text-lg text-vd-forest">Vaididea Health Library</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-vd-forest to-emerald-950 py-16 px-6 md:px-12 text-center text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-6"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            AI-Enhanced Disease Intelligence
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight"
          >
            Deduplicated Medical Knowledge Library
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-emerald-100 text-base md:text-lg max-w-2xl font-light mb-8 leading-relaxed"
          >
            Access clinically verified, structured insights on <span className="font-semibold text-white">{stats?.total_diseases.toLocaleString() || "31,000+"}</span> medical conditions. Driven by official ICD-10 chapters.
          </motion.p>

          {/* Search form */}
          <motion.form 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleSearchSubmit}
            className="w-full max-w-2xl relative flex shadow-2xl rounded-2xl overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 p-1.5 focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-transparent transition-all"
          >
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-white/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Search diseases, symptoms, codes (e.g. Diabetes, E11)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-white/50 border-0 focus:outline-none focus:ring-0 text-base font-medium rounded-xl"
              />
            </div>
            <button 
              type="submit" 
              className="bg-white text-vd-forest hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              Search
            </button>
          </motion.form>

          {/* Suggestions */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center flex-wrap gap-2.5 mt-4 justify-center text-sm"
          >
            <span className="text-white/60">Suggestions:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSearchQuery(s);
                  setSearchTriggeredQuery(s);
                  setActiveLetter("");
                  setActiveCategory("");
                  setCurrentMode("search");
                  setCurrentPage(1);
                  resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-100 font-medium transition-all"
              >
                {s}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Section */}
      <main className="max-w-7xl mx-auto py-12 px-6 md:px-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Stats Widget & Alphabet grid */}
        <aside className="lg:col-span-1 flex flex-col gap-6">
          {/* Quick Stats */}
          {stats && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.015)]"
            >
              <h2 className="font-heading text-lg font-bold text-vd-forest mb-4 border-b border-slate-50 pb-2">Overview Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 rounded-xl p-3.5 text-center border border-emerald-50">
                  <div className="text-vd-forest font-bold text-2xl">{stats.total_diseases.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Total Diseases</div>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-3.5 text-center border border-blue-50">
                  <div className="text-blue-700 font-bold text-2xl">{stats.total_categories}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Chapters</div>
                </div>
                <div className="bg-red-50/50 rounded-xl p-3.5 text-center border border-red-50">
                  <div className="text-red-700 font-bold text-xl">
                    {stats.severity.find(s => s.severity === "Critical")?.cnt.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Critical</div>
                </div>
                <div className="bg-orange-50/50 rounded-xl p-3.5 text-center border border-orange-50">
                  <div className="text-orange-700 font-bold text-xl">
                    {stats.severity.find(s => s.severity === "Severe")?.cnt.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Severe</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Alphabet bar */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.015)]"
          >
            <h2 className="font-heading text-lg font-bold text-vd-forest mb-4 border-b border-slate-50 pb-2 flex justify-between items-center">
              <span>A–Z Alphabet Index</span>
              {activeLetter && (
                <button 
                  onClick={() => { setActiveLetter(""); setCurrentMode(null); }}
                  className="text-xs text-rose-500 font-semibold hover:underline"
                >
                  Clear
                </button>
              )}
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => {
                const count = letterCounts[letter] || 0;
                const isActive = activeLetter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    className={`relative py-2.5 rounded-lg flex flex-col items-center justify-center border font-semibold transition-all ${
                      isActive 
                        ? "bg-vd-forest text-white border-vd-forest shadow-md"
                        : count > 0 
                          ? "bg-white text-slate-800 border-slate-100 hover:border-vd-forest/30 hover:bg-slate-50/50"
                          : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    <span className="text-base leading-none">{letter}</span>
                    {count > 0 && (
                      <span className={`text-[9px] font-bold mt-1 px-1 rounded ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </aside>

        {/* Right Side: Dynamic Content / Categories & Results */}
        <section ref={resultsSectionRef} className="lg:col-span-3 flex flex-col gap-8">
          
          {/* Dynamic Title / Filter Bar when Results are Loaded */}
          {currentMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.015)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <h3 className="font-heading text-xl font-bold text-vd-forest leading-tight">
                  {currentMode === "search" && `Search results for "${searchTriggeredQuery}"`}
                  {currentMode === "alphabet" && `Diseases starting with "${activeLetter}"`}
                  {currentMode === "category" && `Chapter: ${activeCategory}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md inline-block">
                  {totalResults.toLocaleString()} conditions found
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Severity:</span>
                <select
                  value={selectedSeverity}
                  onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}
                  className="w-full sm:w-44 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-vd-forest font-medium text-slate-700 shadow-sm"
                >
                  <option value="">All Severities</option>
                  <option value="Critical">🚨 Critical</option>
                  <option value="Severe">⚠️ Severe</option>
                  <option value="Moderate">🟡 Moderate</option>
                  <option value="General">🟢 General</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Results Grid */}
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div 
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <Loader2 className="w-10 h-10 text-vd-forest animate-spin" />
                <p className="text-slate-500 font-medium text-sm">Searching the medical repository...</p>
              </motion.div>
            ) : currentMode && results.length > 0 ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((disease) => {
                    const style = getSeverityStyle(disease.severity);
                    const keywords = disease.keywords ? disease.keywords.split(",").filter(Boolean).slice(0, 3) : [];
                    return (
                      <motion.div
                        key={disease.id}
                        onClick={() => handleOpenDetails(disease)}
                        whileHover={{ y: -3, scale: 1.005 }}
                        className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-[0_2px_15px_rgba(0,0,0,0.005)] flex flex-col justify-between ${style.border}`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {disease.code}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase truncate max-w-36">
                                {disease.body_system}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.pill}`}>
                              {disease.severity}
                            </span>
                          </div>
                          <h4 className="font-heading font-semibold text-slate-800 text-base md:text-lg mb-1 leading-snug group-hover:text-vd-forest">
                            {disease.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-light line-clamp-1 mb-4">
                            {disease.chapter}
                          </p>
                        </div>
                        <div>
                          {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {keywords.map(k => (
                                <span key={k} className="text-[9px] font-medium px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500">
                                  {k.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-end pt-2 border-t border-slate-100/50">
                            <span className="text-xs font-semibold text-slate-500 hover:text-vd-forest flex items-center gap-1 group">
                              Read Details
                              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_4px_25px_rgba(0,0,0,0.01)]">
                    <div className="text-xs font-medium text-slate-500">
                      Showing Page <span className="font-semibold text-slate-700">{currentPage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Prev */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold"
                      >
                        Prev
                      </button>
                      
                      {/* Numbers */}
                      {getPageNumbers().map((p, idx, arr) => {
                        const isEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {isEllipsis && <span className="px-2 text-slate-400">…</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`w-9 h-9 rounded-lg border font-semibold transition-all ${
                                currentPage === p
                                  ? "bg-vd-forest border-vd-forest text-white shadow-sm"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                      {/* Next */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : currentMode && results.length === 0 ? (
              <motion.div 
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-[0_4px_25px_rgba(0,0,0,0.01)]"
              >
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h4 className="font-heading text-lg font-bold text-slate-700">No medical conditions found</h4>
                <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 leading-relaxed">
                  Try adjusting the severity filter, typing a shorter keyword, or searching using another term.
                </p>
              </motion.div>
            ) : (
              // Default View: Categories Grid
              <motion.div 
                key="categories"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col">
                  <h2 className="font-heading text-2xl font-bold text-vd-forest">Chapters & Body Systems</h2>
                  <p className="text-slate-500 text-sm font-light mt-0.5">Explore diseases cataloged by official ICD-10 medical system classifications.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => {
                    const iconKey = cat.icon || "medical";
                    const emoji = CATEGORY_EMOJIS[iconKey] || CATEGORY_EMOJIS.medical;
                    const style = CATEGORY_COLORS[iconKey] || CATEGORY_COLORS.medical;
                    
                    return (
                      <motion.div
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.chapter)}
                        whileHover={{ y: -3, scale: 1.008 }}
                        className={`cursor-pointer rounded-2xl border p-5 bg-gradient-to-br transition-all border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.008)] flex items-start gap-4 hover:border-emerald-600/30 ${style}`}
                      >
                        <div className="text-3xl p-2.5 bg-white/80 rounded-xl shadow-sm leading-none border border-slate-100/50 select-none">
                          {emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-semibold text-slate-800 text-sm md:text-base leading-snug line-clamp-2">
                            {cat.chapter}
                          </h3>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/20">
                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate pr-2">
                              {cat.body_system}
                            </span>
                            <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full border border-slate-200/30 whitespace-nowrap">
                              {cat.disease_count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Disease Detail Modal */}
      <AnimatePresence>
        {selectedDisease && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDetails}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[85vh] relative z-10 flex flex-col border border-slate-100"
            >
              {/* Single Scrollable Container */}
              <div className="overflow-y-auto w-full h-full flex flex-col">
                {/* Header Hero */}
                <div className={`shrink-0 p-6 md:p-8 bg-gradient-to-r text-white flex justify-between items-start relative border-b border-white/10 ${
                  selectedDisease.severity === "Critical" ? "from-red-700 to-rose-950" :
                  selectedDisease.severity === "Severe" ? "from-orange-700 to-amber-950" :
                  selectedDisease.severity === "Moderate" ? "from-yellow-700 to-amber-950" :
                  "from-emerald-700 to-emerald-950"
                }`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                      <span className="text-xs uppercase tracking-wider font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full">
                        ICD-10 Code: {selectedDisease.code}
                      </span>
                      <span className="text-xs uppercase tracking-wider font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full">
                        {selectedDisease.severity} Severity
                      </span>
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                      {selectedDisease.name}
                    </h2>
                    <p className="text-xs text-emerald-100/80 font-light mt-1 max-w-2xl leading-relaxed">
                      {selectedDisease.chapter} • System: {selectedDisease.body_system}
                    </p>
                  </div>
                  
                  <button 
                    onClick={handleCloseDetails}
                    className="shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/15 text-white active:scale-95 shadow-md"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Tab Nav */}
                {diseaseDetails && !isLoadingDetails && (
                  <div className="shrink-0 flex flex-wrap border-b border-slate-100 px-6 bg-slate-50/50">
                    {[
                      { id: "overview", label: "Overview" },
                      { id: "symptoms", label: "Symptoms" },
                      { id: "causes", label: "Causes & Risks" },
                      { id: "treatment", label: "Treatment" },
                      { id: "prevention", label: "Prevention" },
                      { id: "faqs", label: "FAQs" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDetailTab(tab.id)}
                        className={`py-3.5 px-4 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
                          activeDetailTab === tab.id
                            ? "border-vd-forest text-vd-forest font-bold"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scrollable Content Body */}
                <div ref={modalBodyRef} className="p-6 md:p-8 flex-1 bg-[#FAFBFD] shrink-0">
                <AnimatePresence mode="wait">
                  {isLoadingDetails ? (
                    <motion.div 
                      key="skel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-4 py-8"
                    >
                      <div className="h-5 w-44 bg-slate-200/80 rounded animate-pulse mb-2" />
                      <div className="h-4 w-full bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-4 w-[95%] bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-4 w-[90%] bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-4 w-[75%] bg-slate-200/80 rounded animate-pulse mt-2" />
                      
                      <div className="h-5 w-32 bg-slate-200/80 rounded animate-pulse mt-6 mb-2" />
                      <div className="h-4 w-full bg-slate-200/80 rounded animate-pulse" />
                      <div className="h-4 w-[85%] bg-slate-200/80 rounded animate-pulse" />
                    </motion.div>
                  ) : diseaseDetails ? (
                    <motion.div
                      key={activeDetailTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-slate-700 text-sm md:text-base leading-relaxed"
                    >
                      {/* OVERVIEW TAB */}
                      {activeDetailTab === "overview" && (
                        <div className="flex flex-col gap-6">
                          {diseaseDetails.summary && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4">
                              <div className="text-2xl pt-0.5 leading-none select-none">💡</div>
                              <div>
                                <span className="font-semibold text-emerald-800 text-xs uppercase tracking-wider block mb-1">In simple terms</span>
                                <p className="text-emerald-950 font-medium text-sm leading-relaxed">{diseaseDetails.summary}</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <h3 className="font-heading text-lg font-bold text-vd-forest mb-2.5">About this Condition</h3>
                            <div className="text-slate-600 font-light flex flex-col gap-3" dangerouslySetInnerHTML={{ __html: diseaseDetails.overview || "Overview not available." }} />
                          </div>
                          
                          {diseaseDetails.types && (
                            <div className="mt-2">
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-3">Classification & Types</h3>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.types).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm" dangerouslySetInnerHTML={{ __html: item }} />
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SYMPTOMS TAB */}
                      {activeDetailTab === "symptoms" && (
                        <div className="flex flex-col gap-5">
                          <div>
                            <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Symptoms You May Notice</h3>
                            <p className="text-slate-500 text-xs font-light mb-4">Signs and changes in your body associated with this condition.</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                              {parseHtmlList(diseaseDetails.symptoms).map((item, idx) => (
                                <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3 align-start" >
                                  <span className="text-slate-400 text-sm font-semibold select-none pt-0.5">🩺</span>
                                  <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                </li>
                              ))}
                            </ul>
                          </div>

                          {diseaseDetails.when_to_see_doctor && (
                            <div className="bg-red-50 border border-red-100/50 rounded-2xl p-5 mt-4 flex gap-4">
                              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-red-800 text-xs uppercase tracking-wider block mb-1">When to Seek Medical Attention</span>
                                <p className="text-red-950 font-medium text-sm leading-relaxed">{diseaseDetails.when_to_see_doctor}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CAUSES TAB */}
                      {activeDetailTab === "causes" && (
                        <div className="flex flex-col gap-6">
                          <div>
                            <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Root Causes</h3>
                            <p className="text-slate-500 text-xs font-light mb-4">Underlying biological or lifestyle causes.</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                              {parseHtmlList(diseaseDetails.causes).map((item, idx) => (
                                <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                  <span className="text-emerald-500 text-sm font-bold select-none">🧬</span>
                                  <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                </li>
                              ))}
                            </ul>
                          </div>

                          {diseaseDetails.risk_factors && (
                            <div>
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Risk Factors</h3>
                              <p className="text-slate-500 text-xs font-light mb-4">Habits, genetic factors, or environments that increase likelihood of contracting this condition.</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.risk_factors).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                    <span className="text-amber-500 text-sm font-bold select-none">⚠️</span>
                                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TREATMENT TAB */}
                      {activeDetailTab === "treatment" && (
                        <div className="flex flex-col gap-6">
                          {diseaseDetails.diagnosis && (
                            <div>
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Diagnosis Methods</h3>
                              <p className="text-slate-500 text-xs font-light mb-4">Common clinical tests, scans, or exams used by medical professionals.</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.diagnosis).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                    <span className="text-blue-500 select-none">🔬</span>
                                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {diseaseDetails.medicines && (
                            <div>
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Clinical Treatments & Medicines</h3>
                              <p className="text-slate-500 text-xs font-light mb-4">Primary medicines, therapies, or interventions prescribed by doctors.</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.medicines).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                    <span className="text-indigo-500 select-none">💊</span>
                                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {diseaseDetails.home_remedies && (
                            <div>
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Home Care & Lifestyle</h3>
                              <p className="text-slate-500 text-xs font-light mb-4">Safe practices you can adopt at home to manage symptoms.</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.home_remedies).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                    <span className="text-emerald-500 select-none">🏠</span>
                                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PREVENTION TAB */}
                      {activeDetailTab === "prevention" && (
                        <div className="flex flex-col gap-6">
                          <div>
                            <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Prevention Guidelines</h3>
                            <p className="text-slate-500 text-xs font-light mb-4">Proactive measures to lower the risk or prevent the onset of this condition.</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                              {parseHtmlList(diseaseDetails.prevention).map((item, idx) => (
                                <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                  <span className="text-purple-500 select-none">🛡️</span>
                                  <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                </li>
                              ))}
                            </ul>
                          </div>

                          {diseaseDetails.complications && (
                            <div>
                              <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5">Potential Complications</h3>
                              <p className="text-slate-500 text-xs font-light mb-4">Possible risks if the condition is left untreated or unmanaged.</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                                {parseHtmlList(diseaseDetails.complications).map((item, idx) => (
                                  <li key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex gap-3" >
                                    <span className="text-rose-500 select-none">📈</span>
                                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: item }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* FAQS TAB */}
                      {activeDetailTab === "faqs" && (
                        <div>
                          <h3 className="font-heading text-lg font-bold text-vd-forest mb-1.5 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5" />
                            Frequently Asked Questions
                          </h3>
                          <p className="text-slate-500 text-xs font-light mb-5">Common patient inquiries answered by medical assistants.</p>
                          <div className="flex flex-col gap-3">
                            {parseFaqs(diseaseDetails.faqs).map((faq) => {
                              const isOpen = openFaqs[faq.id] || false;
                              return (
                                <div key={faq.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden transition-all">
                                  <button
                                    onClick={() => setOpenFaqs(prev => ({ ...prev, [faq.id]: !isOpen }))}
                                    className="w-full text-left p-5 font-semibold text-slate-800 hover:text-vd-forest flex justify-between items-center gap-4 transition-all"
                                  >
                                    <span className="text-sm md:text-base leading-snug">{faq.question}</span>
                                    <span className="text-lg leading-none font-bold text-slate-400 select-none">
                                      {isOpen ? "−" : "+"}
                                    </span>
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {isOpen && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto" }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-5 pb-5 pt-1 text-slate-500 font-light border-t border-slate-50/50 text-sm md:text-base leading-relaxed">
                                          {faq.answer}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-4 font-semibold text-center text-sm">
                      Failed to load detailed medical insights. Please ensure the backend server is running.
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Disclaimer footer */}
              <div className="shrink-0 p-5 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-light text-center leading-relaxed">
                ⚠️ <strong>Disclaimer:</strong> This content is generated by AI models and is intended solely for educational purposes. It does NOT constitute medical advice. Please consult with a licensed doctor or medical specialist for any official diagnosis, prescription, or therapeutic management.
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
