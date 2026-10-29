import Link from "next/link";
import PrivacyPolicyDocument from "./privacypolicy";

const toc = [
  ["privacy-at-a-glance", "Privacy at a glance"],
  ["article-i-introduction-and-scope", "I. Introduction and scope"],
  ["article-ii-definitions", "II. Definitions"],
  ["article-iii-our-role-data-fiduciary-or-data-processor", "III. Our role"],
  ["article-iv-personal-data-we-collect", "IV. Data we collect"],
  ["article-v-how-we-collect-data", "V. How we collect data"],
  ["article-vi-why-we-process-your-data", "VI. Why we process data"],
  ["article-vii-ai-features-and-your-data", "VII. AI features"],
  ["article-viii-emergency-services-sos-and-crash-detection", "VIII. Emergency services"],
  ["article-ix-public-health-and-outbreak-analytics", "IX. Public health"],
  ["article-x-consent-legitimate-uses-and-managing-your-choices", "X. Consent and choices"],
  ["article-xi-children-persons-with-disabilities-guardians-and-assisted-access", "XI. Children and guardians"],
  ["article-xii-sensitive-categories-of-data", "XII. Sensitive data"],
  ["article-xiii-disclosure-and-sharing-of-data", "XIII. Data sharing"],
  ["article-xiv-cross-border-transfer-of-data", "XIV. Cross-border transfers"],
  ["article-xv-data-retention-and-erasure", "XV. Retention and erasure"],
  ["article-xvi-data-security", "XVI. Data security"],
  ["article-xvii-personal-data-breach", "XVII. Data breaches"],
  ["article-xviii-cookies-tracking-technologies-and-communications", "XVIII. Cookies and communications"],
  ["article-xix-your-rights-and-how-to-use-them", "XIX. Your rights"],
  ["article-xx-provider-operator-and-agent-data", "XX. Provider and agent data"],
  ["article-xxi-grievance-officer-and-contact", "XXI. Grievance officer"],
  ["article-xxii-changes-to-this-policy", "XXII. Policy changes"],
  ["article-xxiii-governing-law", "XXIII. Governing law"],
] as const;

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#173b3b]">
      <header className="sticky top-0 z-30 border-b border-[#e2ece8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Vaididea home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#087f70] text-lg font-bold text-white">V</span>
            <span className="text-xl font-semibold tracking-tight text-[#153d3d]">vaididea<span className="text-[#087f70]">.</span></span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-[#496361]">
            <Link className="hidden transition hover:text-[#087f70] sm:inline" href="/">Home</Link>
            <Link className="transition hover:text-[#087f70]" href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link className="rounded-full border border-[#d6e6e0] px-4 py-2 transition hover:border-[#087f70] hover:text-[#087f70]" href="/contact">Contact</Link>
          </nav>
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-[#dcece6] bg-gradient-to-br from-[#e7f6f1] via-[#f4fbf8] to-[#edf7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[48px] border-white/40" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c8e4da] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#087f70]">
            <span className="size-1.5 rounded-full bg-[#087f70]" /> Legal &amp; policies
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#153d3d] sm:text-5xl lg:text-6xl">Privacy Policy</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#52706d] sm:text-lg">Understand how Vaididea collects, uses, shares and protects personal data across its digital healthcare platform.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#42615d]">
            <span className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">Version 1.0 </span>
            <span className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">Effective date: 25 November 2026</span>
          </div>
          <p className="mt-4 text-xs text-[#68817d]">Vaididea Healthcare Private Limited · www.vaididea.in</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:py-14">
        <aside className="self-start lg:sticky lg:top-28">
          <details className="group rounded-2xl border border-[#e0eae5] bg-white p-4 shadow-sm lg:hidden">
            <summary className="cursor-pointer list-none font-semibold text-[#234d49]">On this page <span className="float-right text-[#087f70] group-open:rotate-180">⌄</span></summary>
            <nav className="mt-4 grid gap-1 border-t border-[#edf1ee] pt-3">
              {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-sm text-[#496361] hover:bg-[#f1f8f5] hover:text-[#087f70]">{label}</a>)}
            </nav>
          </details>
          <div className="hidden rounded-2xl border border-[#e0eae5] bg-white p-4 shadow-sm lg:block">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#829894]">On this page</p>
            <nav className="max-h-[calc(100vh-10rem)] space-y-1 overflow-y-auto">
              {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm leading-5 text-[#496361] transition hover:bg-[#f1f8f5] hover:text-[#087f70]">{label}</a>)}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">
          {/* <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Publication note:</strong> This document is marked “draft pending legal review.” Complete the effective date, CIN, registered office address and Grievance Officer contact placeholders, and obtain legal review before publication.
          </div> */}
          <PrivacyPolicyDocument />
        </div>
      </div>
      <footer className="border-t border-[#e0eae5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#68817d] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Vaididea Healthcare Private Limited. All rights reserved.</p>
          <div className="flex flex-wrap gap-5">
            <Link className="hover:text-[#087f70]" href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link className="hover:text-[#087f70]" href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
