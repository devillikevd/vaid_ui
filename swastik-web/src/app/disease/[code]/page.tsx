import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  HeartPulse,
  HelpCircle,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { buildCanonicalApiUrl } from '@/lib/env';

type Props = {
  params: Promise<{ code: string }>;
};

async function fetchDisease(code: string) {
  try {
    const res = await fetch(buildCanonicalApiUrl(`/diseases/disease/${encodeURIComponent(code)}`), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.code ? data : null;
  } catch {
    return null;
  }
}

function mapChapterToSpecialty(chapter: string = '', bodySystem: string = ''): { name: string; specialty: string } {
  const c = chapter.toLowerCase();
  const s = bodySystem.toLowerCase();

  if (c.includes('circulatory') || s.includes('cardio') || c.includes('heart')) {
    return { name: 'Cardiologists', specialty: 'Cardiology' };
  }
  if (c.includes('skin') || s.includes('integumentary') || c.includes('dermat')) {
    return { name: 'Dermatologists', specialty: 'Dermatology' };
  }
  if (c.includes('respiratory') || s.includes('pulmon')) {
    return { name: 'Pulmonologists', specialty: 'Pulmonology' };
  }
  if (c.includes('nervous') || s.includes('neuro') || c.includes('brain')) {
    return { name: 'Neurologists', specialty: 'Neurology' };
  }
  if (c.includes('digestive') || s.includes('gastro')) {
    return { name: 'Gastroenterologists', specialty: 'Gastroenterology' };
  }
  if (c.includes('musculoskeletal') || s.includes('bone') || c.includes('joint')) {
    return { name: 'Orthopedic Specialists', specialty: 'Orthopedics' };
  }
  if (c.includes('eye') || s.includes('ophthal')) {
    return { name: 'Ophthalmologists', specialty: 'Ophthalmology' };
  }
  if (c.includes('ear') || c.includes('throat') || s.includes('ent')) {
    return { name: 'ENT Specialists', specialty: 'ENT' };
  }
  if (c.includes('mental') || c.includes('psych')) {
    return { name: 'Psychiatrists', specialty: 'Psychiatry' };
  }
  if (c.includes('endocrine') || c.includes('metabolic')) {
    return { name: 'Endocrinologists', specialty: 'General Physician' };
  }
  if (c.includes('pediatric') || c.includes('child')) {
    return { name: 'Pediatricians', specialty: 'Pediatrics' };
  }
  return { name: 'General Physicians', specialty: 'General Physician' };
}

function renderHtmlContent(htmlString?: string) {
  if (!htmlString) return null;
  // If content contains list items or HTML tags, parse into native React elements safely
  if (htmlString.includes('<li') || (htmlString.includes('<') && htmlString.includes('>'))) {
    if (htmlString.includes('<li')) {
      const items = htmlString
        .match(/<li[^>]*>([\s\S]*?)<\/li>/gi)
        ?.map((m) => m.replace(/<\/?li[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      if (items && items.length > 0) {
        return (
          <ul className="list-disc pl-5 space-y-1.5 text-stone-700 leading-relaxed text-sm">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
      }
    }
    const cleanText = htmlString.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    const paragraphs = cleanText.split(/\n\s*\n/).filter(Boolean);
    return (
      <div className="space-y-2 text-sm text-stone-700 leading-relaxed">
        {paragraphs.map((para, idx) => (
          <p key={idx}>{para.trim()}</p>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-stone-700 leading-relaxed">{htmlString}</p>;
}

export default async function DiseaseDetailPage({ params }: Props) {
  const { code } = await params;
  const disease = await fetchDisease(code);

  if (!disease) {
    notFound();
  }

  const cleanName = disease.name || 'Medical Condition';
  const icdCode = disease.code || code;
  const chapter = disease.chapter || 'Clinical Classification';
  const bodySystem = disease.body_system || '';
  const severity = disease.severity || 'Standard Reference';
  const recommendedSpecialist = mapChapterToSpecialty(chapter, bodySystem);

  const rawOverview = disease.overview || disease.summary;

  return (
    <div className="min-h-screen bg-stone-50/60 flex flex-col font-sans text-stone-900 selection:bg-vd-forest/15">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-6 sm:space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500 font-medium overflow-hidden">
            <Link href="/" className="hover:text-vd-forest transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <Link href="/health-library" className="hover:text-vd-forest transition-colors">
              Health Library
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-900 font-bold truncate max-w-[200px] sm:max-w-md">
              {cleanName}
            </span>
          </div>

          <Link
            href="/health-library"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-vd-forest hover:text-vd-forest-deep transition-colors bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Health Library</span>
          </Link>
        </nav>

        {/* Hero Banner Card */}
        <header className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 text-xs font-bold font-mono">
                  ICD-10: {icdCode}
                </span>
                {chapter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium">
                    {chapter}
                  </span>
                )}
                {severity && severity !== 'Standard Reference' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    {severity} Severity
                  </span>
                )}
              </div>

              <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-stone-900 tracking-tight leading-tight">
                {cleanName}
              </h1>

              {disease.summary && (
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-light">
                  {disease.summary}
                </p>
              )}
            </div>

            {/* Specialist Action Box */}
            <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 lg:w-80 shrink-0 space-y-3">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Stethoscope className="w-4 h-4 text-vd-forest" />
                <span>Need Clinical Guidance?</span>
              </div>
              <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                Connect with verified specialists experienced in managing conditions related to {chapter || cleanName}.
              </p>
              <Link
                href={`/doctors?specialty=${encodeURIComponent(recommendedSpecialist.specialty)}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                <span>Find {recommendedSpecialist.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Two-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Main Clinical Content (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Overview */}
            {rawOverview && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <FileText className="w-5 h-5 text-vd-forest" />
                  <h2>Clinical Overview</h2>
                </div>
                {renderHtmlContent(rawOverview)}
              </section>
            )}

            {/* 2. Symptoms */}
            {disease.symptoms && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <Activity className="w-5 h-5 text-amber-600" />
                  <h2>Common Symptoms</h2>
                </div>
                {renderHtmlContent(disease.symptoms)}
              </section>
            )}

            {/* 3. Causes & Risk Factors */}
            {(disease.causes || disease.risk_factors) && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <HeartPulse className="w-5 h-5 text-rose-600" />
                  <h2>Causes & Risk Factors</h2>
                </div>

                {disease.causes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Underlying Causes
                    </h3>
                    {renderHtmlContent(disease.causes)}
                  </div>
                )}

                {disease.risk_factors && (
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Known Risk Factors
                    </h3>
                    {renderHtmlContent(disease.risk_factors)}
                  </div>
                )}
              </section>
            )}

            {/* 4. Diagnosis & Treatment */}
            {(disease.diagnosis || disease.medicines) && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <Pill className="w-5 h-5 text-teal-600" />
                  <h2>Diagnosis & Clinical Management</h2>
                </div>

                {disease.diagnosis && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Diagnostic Pathways
                    </h3>
                    {renderHtmlContent(disease.diagnosis)}
                  </div>
                )}

                {disease.medicines && (
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Pharmacological Therapies
                    </h3>
                    {renderHtmlContent(disease.medicines)}
                  </div>
                )}
              </section>
            )}

            {/* 5. Home Remedies, Complications & Prevention */}
            {(disease.home_remedies || disease.prevention || disease.complications) && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2>Self-Care, Complications & Prevention</h2>
                </div>

                {disease.home_remedies && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Lifestyle & Supportive Care
                    </h3>
                    {renderHtmlContent(disease.home_remedies)}
                  </div>
                )}

                {disease.complications && (
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Potential Complications
                    </h3>
                    {renderHtmlContent(disease.complications)}
                  </div>
                )}

                {disease.prevention && (
                  <div className="space-y-2 pt-3 border-t border-stone-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Prevention Strategies
                    </h3>
                    {renderHtmlContent(disease.prevention)}
                  </div>
                )}
              </section>
            )}

            {/* 6. Frequently Asked Questions */}
            {disease.faqs && (
              <section className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-heading font-bold text-base sm:text-lg">
                  <HelpCircle className="w-5 h-5 text-indigo-600" />
                  <h2>Frequently Asked Questions</h2>
                </div>
                {renderHtmlContent(disease.faqs)}
              </section>
            )}
          </div>

          {/* Right Sidebar (1 Column): Specialist, Doctor Alert, Medical Disclaimer */}
          <aside className="space-y-6">
            {/* When to Consult a Specialist */}
            {disease.when_to_see_doctor && (
              <div className="bg-amber-50/80 rounded-3xl p-6 border border-amber-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <h3>When to Consult a Doctor</h3>
                </div>
                <p className="text-xs sm:text-sm text-amber-950/80 leading-relaxed font-light">
                  {disease.when_to_see_doctor}
                </p>
                <div className="pt-2">
                  <Link
                    href={`/doctors?specialty=${encodeURIComponent(recommendedSpecialist.specialty)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline underline-offset-4"
                  >
                    <span>Schedule consultation with a specialist</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Related Specialties Quick Links */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Explore Specialties
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-stone-700">
                <li>
                  <Link
                    href={`/doctors?specialty=${encodeURIComponent(recommendedSpecialist.specialty)}`}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors text-vd-forest"
                  >
                    <span>{recommendedSpecialist.name}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/doctors?specialty=General%20Physician"
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    <span>General Physicians</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/specialties"
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors text-stone-500"
                  >
                    <span>Browse All Specialties</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Medical Disclaimer Box */}
            <div className="bg-stone-100/70 rounded-3xl p-5 border border-stone-200 text-stone-500 text-[11px] leading-relaxed space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-stone-700">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Medical Disclaimer</span>
              </div>
              <p>
                Vaididea provides educational health information indexed to standard clinical classifications (ICD-10).
                This content is for reference only and does not substitute professional medical diagnosis, advice, or treatment from a certified medical practitioner.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
