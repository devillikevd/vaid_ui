"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <section
      id="newsletter"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{ backgroundColor: "var(--medica-offwhite)" }}
    >
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #1D1E20 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: Text + Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full lg:w-3/5"
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--medica-peach)" }}
              >
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-sm font-700 font-outfit tracking-[0.1em] uppercase font-bold"
                style={{ color: "var(--medica-olive)" }}
              >
                Health Newsletter
              </span>
            </div>

            <h2 className="medica-heading mb-4">
              Stay Informed
            </h2>

            <p
              className="text-[17px] leading-relaxed mb-8 max-w-lg"
              style={{ color: "var(--medica-muted)" }}
            >
              Get weekly health tips, doctor insights, clinic news, and exclusive
              Vaididea updates delivered straight to your inbox.
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="medica-input"
                    id="newsletter-name"
                    aria-label="Your name"
                  />
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="medica-input"
                    id="newsletter-email"
                    aria-label="Your email address"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-medica-dark w-full justify-center mt-2 disabled:opacity-70"
                  id="newsletter-submit"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Subscribing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Subscribe Now
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
                <p className="text-[12px]" style={{ color: "var(--medica-muted)" }}>
                  No spam, ever. Unsubscribe anytime. 🔒
                </p>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="flex items-center gap-4 p-6 rounded-2xl max-w-md"
                style={{ backgroundColor: "var(--medica-sage)" }}
              >
                <CheckCircle2
                  className="w-10 h-10 shrink-0"
                  style={{ color: "var(--medica-olive)" }}
                />
                <div>
                  <p
                    className="font-bold text-lg font-outfit"
                    style={{ color: "var(--medica-charcoal)" }}
                  >
                    You're subscribed!
                  </p>
                  <p className="text-[14px]" style={{ color: "var(--medica-muted)" }}>
                    Thanks for joining. Check your inbox for a welcome message.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Trust badges */}
            <div className="flex items-center gap-6 mt-8 flex-wrap">
              {["10K+ subscribers", "Weekly tips", "Expert doctors"].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--medica-muted)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--medica-olive)" }} />
                  {t}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="w-full lg:w-2/5 hidden lg:flex justify-center"
          >
            <div className="relative w-64 h-64">
              {/* Decorative circle */}
              <div
                className="absolute inset-0 rounded-full opacity-20"
                style={{ backgroundColor: "var(--medica-peach)" }}
              />
              {/* Image */}
              <div
                className="relative z-10 w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl"
              >
                <img
                  src="/images/article_wellness.png"
                  alt="Health newsletter illustration"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              {/* Floating pill */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -right-6 medica-badge px-4 py-3 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" style={{ color: "var(--medica-olive)" }} />
                <span className="text-[13px] font-bold font-outfit" style={{ color: "var(--medica-charcoal)" }}>
                  Weekly Tips
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
