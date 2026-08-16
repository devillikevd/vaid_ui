"use client";

import Link from "next/link";
import VaidideaLogo from "@/components/shared/VaidideaLogo";

export default function Footer() {
  return (
    <footer className="bg-vd-warm text-vd-muted py-16 sm:py-20 border-t border-vd-forest/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 gap-y-12">
          
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 pr-4">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group">
              <VaidideaLogo className="w-8 h-8" />
              <span className="font-heading text-2xl font-semibold text-vd-forest uppercase">VAIDIDEA</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Seamless, fast, and fully connected for the modern urban healthcare experience.
            </p>

            {/* Social */}
            <div className="flex gap-3 mt-6">
              <a href="https://www.instagram.com/vaididea/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-vd-forest/10 flex items-center justify-center hover:bg-vd-forest/20 transition-colors" aria-label="Instagram">
                <svg className="w-4 h-4 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
              </a>
              <a href="https://www.youtube.com/@vaididea" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-vd-forest/10 flex items-center justify-center hover:bg-vd-forest/20 transition-colors" aria-label="YouTube">
                <svg className="w-4 h-4 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 7.1C2.6 5.9 3.5 5 4.7 4.9 8.2 4.5 12 4.5 15.3 4.9c1.2.1 2.1 1 2.2 2.2.4 2.8.4 6 0 8.8-.1 1.2-1 2.1-2.2 2.2-3.3.4-7.1.4-10.6 0-1.2-.1-2.1-1-2.2-2.2-.4-2.8-.4-6 0-8.8Z" /><polygon points="9.5 15.5 15.5 12 9.5 8.5" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/vaididea-healthcare/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-vd-forest/10 flex items-center justify-center hover:bg-vd-forest/20 transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-vd-forest/10 flex items-center justify-center hover:bg-vd-forest/20 transition-colors" aria-label="X">
                <svg className="w-4 h-4 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-vd-forest font-semibold mb-5 text-xs tracking-widest uppercase">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="hover:text-vd-forest transition-colors">About Vaididea</Link></li>
              <li><Link href="/vision" className="hover:text-vd-forest transition-colors">The Vision</Link></li>
              <li><Link href="/impact" className="hover:text-vd-forest transition-colors">Smart Cities Impact</Link></li>
              <li><Link href="/contact" className="hover:text-vd-forest transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-vd-forest font-semibold mb-5 text-xs tracking-widest uppercase">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/app" className="hover:text-vd-forest transition-colors">Patient App</Link></li>
              <li><Link href="/login" className="hover:text-vd-forest transition-colors">Provider Portal</Link></li>
              <li><Link href="/voice-assistant" className="hover:text-vd-forest transition-colors">Voice Assistant</Link></li>
              <li><Link href="/digital-id" className="hover:text-vd-forest transition-colors">Health ID</Link></li>
            </ul>
          </div>

          {/* Network */}
          <div className="hidden md:block">
            <h4 className="text-vd-forest font-semibold mb-5 text-xs tracking-widest uppercase">Network</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/login" className="hover:text-vd-forest transition-colors">Doctors & Specialists</Link></li>
              <li><Link href="/login" className="hover:text-vd-forest transition-colors">Hospitals & Clinics</Link></li>
              <li><Link href="/login" className="hover:text-vd-forest transition-colors">Local Pharmacies</Link></li>
              <li><Link href="/login" className="hover:text-vd-forest transition-colors">Diagnostic Centers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="hidden lg:block">
            <h4 className="text-vd-forest font-semibold mb-5 text-xs tracking-widest uppercase">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/help-support" className="hover:text-vd-forest transition-colors">Help Center</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-vd-forest transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions" className="hover:text-vd-forest transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-vd-forest/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-vd-muted">
            © {new Date().getFullYear()} Vaididea Healthcare. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-vd-muted">
            <Link href="/privacy-policy" className="hover:text-vd-forest transition-colors">Privacy</Link>
            <span className="w-1 h-1 rounded-full bg-vd-muted/40" />
            <Link href="/terms-conditions" className="hover:text-vd-forest transition-colors">Terms</Link>
            <span className="w-1 h-1 rounded-full bg-vd-muted/40" />
            <Link href="/help-support" className="hover:text-vd-forest transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
