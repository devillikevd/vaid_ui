"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TermsDocument from "./termsdocument";

const TERMS_VERSION = "1.0";
const TERMS_ACCEPTANCE_STORAGE_KEY = "vaididea_terms_acceptance";

const toc = [
  ["important-notice-and-key-points", "Important notice"],
  ["who-should-read-what", "Who should read what"],
  ["article-i-recitals-and-acceptance", "I. Recitals and acceptance"],
  ["article-ii-definitions-and-interpretation", "II. Definitions"],
  ["article-iii-eligibility-registration-and-account-security", "III. Eligibility and accounts"],
  ["article-iv-nature-of-services", "IV. Nature of services"],
  ["article-v-role-specific-terms", "V. Role-specific terms"],
  ["article-vi-artificial-intelligence-features", "VI. AI features"],
  ["article-vii-medical-records-health-data-and-consent", "VII. Health data and consent"],
  ["article-viii-public-health-and-outbreak-alerts", "VIII. Public health alerts"],
  ["article-ix-third-party-integrations-referrals-and-interoperability", "IX. Integrations"],
  ["article-x-intellectual-property-and-user-content", "X. Intellectual property"],
  ["article-xi-acceptable-use", "XI. Acceptable use"],
  ["article-xii-fees-subscriptions-billing-and-refunds", "XII. Fees and refunds"],
  ["article-xiii-disclaimer-of-warranties", "XIII. Warranties"],
  ["article-xiv-limitation-of-liability-and-indemnity", "XIV. Liability"],
  ["article-xv-suspension-and-termination", "XV. Suspension and termination"],
  ["article-xvi-force-majeure", "XVI. Force majeure"],
  ["article-xvii-governing-law-and-dispute-resolution", "XVII. Governing law"],
  ["article-xviii-grievance-redressal", "XVIII. Grievances"],
  ["article-xix-general-provisions", "XIX. General provisions"],
  ["schedule-a-operational-module-terms", "Schedule A"],
  ["acceptance", "Acceptance"],
] as const;

export default function TermsAndConditionsPage() {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const storedAcceptance = localStorage.getItem(TERMS_ACCEPTANCE_STORAGE_KEY);
      if (!storedAcceptance) return;

      const acceptance = JSON.parse(storedAcceptance) as { accepted?: boolean; termsVersion?: string };
      if (acceptance.accepted === true && acceptance.termsVersion === TERMS_VERSION) {
        setHasAccepted(true);
        setConsentChecked(true);
      }
    } catch {
      setStorageError("We could not read your saved Terms acceptance from this browser.");
    }
  }, []);

  function handleAcceptTerms() {
    if (!consentChecked) return;

    try {
      localStorage.setItem(
        TERMS_ACCEPTANCE_STORAGE_KEY,
        JSON.stringify({
          accepted: true,
          termsVersion: TERMS_VERSION,
          acceptedAt: new Date().toISOString(),
        }),
      );
      setHasAccepted(true);
      setStorageError("");
    } catch {
      setStorageError("We could not save your acceptance in this browser. Please enable site storage and try again.");
    }
  }

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
            <Link className="transition hover:text-[#087f70]" href="/Privacy-Policy">Privacy Policy</Link>
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
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#153d3d] sm:text-5xl lg:text-6xl">Terms &amp; Conditions</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#52706d] sm:text-lg">Please review the terms that govern access to and use of the Vaididea Digital Healthcare Ecosystem.</p>
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
              {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-sm text-[#607571] transition hover:bg-[#eef8f4] hover:text-[#087f70]">{label}</a>)}
            </nav>
          </details>
          <div className="hidden rounded-2xl border border-[#e0eae5] bg-white p-4 shadow-sm lg:block">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#81928d]">On this page</p>
            <nav className="grid max-h-[calc(100vh-11rem)] gap-1 overflow-y-auto">
              {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-sm leading-5 text-[#607571] transition hover:bg-[#eef8f4] hover:text-[#087f70]">{label}</a>)}
            </nav>
          </div>
          <div className="mt-4 hidden rounded-2xl bg-[#e8f5f0] p-4 lg:block">
            <div className="mb-2 grid size-9 place-items-center rounded-xl bg-white text-[#087f70]">✳</div>
            <p className="text-sm font-semibold text-[#24534d]">Need help?</p>
            <p className="mt-1 text-sm leading-6 text-[#587671]">For questions about these terms, contact Vaididea through the official support channel.</p>
            <Link href="/contact" className="mt-3 inline-flex text-sm font-semibold text-[#087f70] hover:underline">Contact support →</Link>
          </div>
        </aside>

        <article className="min-w-0 rounded-2xl border border-[#e4ece8] bg-white px-5 py-8 shadow-[0_12px_40px_rgba(20,65,54,0.04)] sm:px-9 sm:py-10 lg:px-12">
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-[#d8ebe3] bg-[#f2faf6] p-4 sm:p-5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#d9f0e6] text-[#087f70]">i</span>
            <div>
              <p className="font-semibold text-[#24534d]">Please read these terms carefully</p>
              <p className="mt-1 text-sm leading-6 text-[#587671]">This document includes important information about the platform, independent healthcare providers, health data, AI features, emergency services, payments and dispute resolution.</p>
            </div>
          </div>
          <TermsDocument />
          <section aria-labelledby="terms-acceptance" className="mt-10 rounded-xl border border-[#cfe6dc] bg-[#f2faf6] p-5">
            <h2 id="terms-acceptance" className="text-lg font-semibold text-[#24534d]">Acceptance</h2>
            <p className="mt-2 text-sm leading-6 text-[#587671]">
              Please confirm that you have read and agree to these Terms and Conditions.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-[#435c57]">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                className="mt-1 size-4 accent-[#087f70]"
              />
              <span>I have read and agree to the Terms and Conditions.</span>
            </label>
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={!consentChecked || hasAccepted}
              className="mt-4 rounded-lg bg-[#087f70] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#076b60] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasAccepted ? "Terms Accepted" : "I Agree and Continue"}
            </button>
            {hasAccepted && (
              <p className="mt-3 text-sm font-medium text-[#087f70]" role="status">
                Thank You For Accepting The Terms.
              </p>
            )}
            {storageError && (
              <p className="mt-3 text-sm text-red-700" role="alert">{storageError}</p>
            )}
          </section>
        </article>
      </div>

      <footer className="border-t border-[#dfe9e4] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#6b807b] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Vaididea Healthcare Private Limited. All rights reserved.</p>
          <div className="flex flex-wrap gap-5"><Link href="/Privacy-Policy" className="hover:text-[#087f70]">Privacy Policy</Link><Link href="/contact" className="hover:text-[#087f70]">Contact</Link><Link href="/" className="hover:text-[#087f70]">Back to home</Link></div>
        </div>
      </footer>
    </main>
  );
}
