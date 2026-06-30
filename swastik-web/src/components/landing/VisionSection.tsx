"use client";

import React from "react";

export default function VisionSection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" id="vision">
      {/* Background with subtle gradients for glassy feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-vd-cream via-white to-vd-cream pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-vd-sage/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[50vw] h-[50vw] bg-vd-forest/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-8 transition-all hover:bg-white/80">
            <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">Our Vision</span>
          </div>

          <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-vd-forest mb-6 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Reimagining Healthcare for <br className="hidden sm:block" />
            <em className="text-vd-sage font-medium italic">Every Human Being</em>
          </h2>
        </div>

        {/* Content Container - Glassmorphic Card */}
        <div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 md:p-16 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="prose prose-lg prose-emerald max-w-none text-vd-muted leading-relaxed font-light">
            <p className="text-xl sm:text-2xl text-vd-forest font-heading mb-8 leading-relaxed">
              At VAIDIDEA, we envision a future where quality healthcare is accessible, intelligent, affordable, and continuous—regardless of where a person lives, how much they earn, or which language they speak.
            </p>

            <div className="grid md:grid-cols-2 gap-10 md:gap-16 mb-10">
              <div className="space-y-6">
                <p>
                  We are building more than a healthcare application. We are creating an AI-powered Digital Health Ecosystem that seamlessly connects patients, doctors, hospitals, clinics, pharmacies, diagnostic centers, ambulances, caregivers, and public health systems onto a single unified platform.
                </p>
                <p>
                  Our vision is to transform healthcare from a reactive system that treats illness into a proactive ecosystem that predicts, prevents, monitors, and manages health throughout every stage of life.
                </p>
                <p>
                  Through artificial intelligence, offline-first technology, real-time medical intelligence, digital health records, preventive care, and continuous monitoring, we aim to ensure that every individual receives the right care, at the right time, from the right healthcare provider.
                </p>
              </div>

              <div className="space-y-6">
                <p>
                  We believe healthcare should never depend on geography, internet quality, language barriers, or financial limitations. Whether someone lives in a metropolitan city or the most remote rural village, they deserve the same standard of healthcare.
                </p>
                <p>
                  VAIDIDEA is committed to building a future where healthcare is not fragmented across multiple applications and providers, but unified into one intelligent ecosystem that empowers patients, supports healthcare professionals, improves clinical outcomes, and strengthens public health.
                </p>
                <p>
                  Our long-term vision is to become the world's most trusted AI-powered Healthcare Operating System—driving innovation in digital medicine, preventive healthcare, emergency response, medical intelligence, and population health while keeping privacy, security, ethics, and patient ownership of health data at the center of everything we build.
                </p>
              </div>
            </div>

            {/* Callout */}
            <div className="mt-12 pt-10 border-t border-vd-forest/10 text-center">
              <p className="font-heading text-2xl sm:text-3xl text-vd-forest italic">
                "Healthcare should not begin when someone becomes sick. It should continuously work to keep people healthy."
              </p>
              <p className="mt-4 text-sm font-semibold tracking-widest uppercase text-vd-sage">
                That is the future VAIDIDEA is building.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
