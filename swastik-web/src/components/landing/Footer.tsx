"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-blue-100 text-slate-700 py-16 px-6 border-t border-blue-200">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-8 gap-y-12">
        
        {/* Brand Column */}
        <div className="col-span-2 md:col-span-3 lg:col-span-2 pr-4 lg:pr-8">
          <div className="flex items-center gap-2 mb-6 group cursor-pointer">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-cyan-400 shadow-[0_4px_15px_rgba(37,99,235,0.3)] group-hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-all duration-300">
              <span className="text-white font-bold text-xl drop-shadow-md font-outfit">V</span>
            </div>
            <span className="font-outfit text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-darkText to-brand-primary group-hover:to-cyan-500 transition-colors duration-300">
              vaididea
            </span>
          </div>
          <p className="text-sm font-medium text-slate-700">
            Seamless, fast, and fully connected for the modern urban healthcare experience.
          </p>
        </div>

        {/* Company */}
        <div className="col-span-1">
          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">Company</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="/about" className="hover:text-blue-600 transition">About Vaididea</Link></li>
            <li><Link href="/vision" className="hover:text-blue-600 transition">The Vision</Link></li>
            <li><Link href="/impact" className="hover:text-blue-600 transition">Smart Cities Impact</Link></li>
            <li><Link href="/contact" className="hover:text-blue-600 transition">Contact Us</Link></li>
          </ul>
        </div>

        {/* The Platform */}
        <div className="col-span-1">
          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">The Platform</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="/app" className="text-slate-700 hover:text-[#FF6B1A] transition">Patient App</Link></li>
            <li><Link href="/portal" className="text-slate-700 hover:text-[#138808] transition">Provider Portal</Link></li>
            <li><Link href="/voice-assistant" className="hover:text-blue-600 transition">Voice Assistant</Link></li>
            <li><Link href="/smart-postbox" className="hover:text-blue-600 transition">Smart Postbox</Link></li>
            <li><Link href="/digital-id" className="hover:text-blue-600 transition">Health ID</Link></li>
          </ul>
        </div>

        {/* Healthcare Network */}
        <div className="col-span-1">
          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">The Network</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="/network/doctors" className="hover:text-blue-600 transition">Doctors & Specialists</Link></li>
            <li><Link href="/network/hospitals" className="hover:text-blue-600 transition">Hospitals & Clinics</Link></li>
            <li><Link href="/network/pharmacies" className="hover:text-blue-600 transition">Local Pharmacies</Link></li>
            <li><Link href="/network/labs" className="hover:text-blue-600 transition">Diagnostic Centers</Link></li>
            <li><Link href="/network/care-workers" className="hover:text-blue-600 transition">Care Workers</Link></li>
          </ul>
        </div>

        {/* Core Technologies */}
        <div className="col-span-1">
          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">Core Tech</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><Link href="/tech/cloud" className="hover:text-blue-600 transition">Cloud-Native Tech</Link></li>
            <li><Link href="/tech/async-model" className="hover:text-blue-600 transition">Async Review Model</Link></li>
            <li><Link href="/tech/localization" className="hover:text-blue-600 transition">Indic Localization</Link></li>
            <li><Link href="/tech/real-time" className="hover:text-blue-600 transition">Real-Time Sync</Link></li>
            <li><Link href="/developers" className="hover:text-blue-600 transition">API Documentation</Link></li>
          </ul>
        </div>

        {/* Social & Legal */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1">
          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">Legal & Support</h4>
          <ul className="space-y-3 text-sm font-medium mb-8">
            <li><Link href="/help-support" className="hover:text-blue-600 transition">Help Center</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-blue-600 transition">Privacy Policy</Link></li>
            <li><Link href="/terms-conditions" className="hover:text-blue-600 transition">Terms of Service</Link></li>
          </ul>

          <h4 className="text-slate-900 font-bold mb-6 uppercase tracking-wider text-xs">Connect</h4>
          <div className="flex flex-wrap gap-2.5">
            <a href="https://www.instagram.com/vaididea/" target="_blank" rel="noopener noreferrer" className="relative group transition hover:scale-110" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#instagram-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity">
                <defs>
                  <linearGradient id="instagram-gradient" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-slate-800 text-white text-xs py-1 px-2.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-md origin-bottom z-10">
                Instagram
              </span>
            </a>
            <a href="https://www.youtube.com/@vaididea" target="_blank" rel="noopener noreferrer" className="relative group text-[#FF0000] transition hover:scale-110" aria-label="YouTube">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity"><path d="M2.5 7.1C2.6 5.9 3.5 5 4.7 4.9 8.2 4.5 12 4.5 15.3 4.9c1.2.1 2.1 1 2.2 2.2.4 2.8.4 6 0 8.8-.1 1.2-1 2.1-2.2 2.2-3.3.4-7.1.4-10.6 0-1.2-.1-2.1-1-2.2-2.2-.4-2.8-.4-6 0-8.8Z"/><polygon points="9.5 15.5 15.5 12 9.5 8.5 9.5 15.5"/></svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-[#FF0000] text-white text-xs py-1 px-2.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-md origin-bottom z-10">
                YouTube
              </span>
            </a>
            <a href="#" className="relative group text-[#1877F2] transition hover:scale-110" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-[#1877F2] text-white text-xs py-1 px-2.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-md origin-bottom z-10">
                Facebook
              </span>
            </a>
            <a href="#" className="relative group text-slate-900 transition hover:scale-110" aria-label="X (Twitter)">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5 0.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-slate-900 text-white text-xs py-1 px-2.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-md origin-bottom z-10">
                X
              </span>
            </a>
            <a href="#" className="relative group text-[#0A66C2] transition hover:scale-110" aria-label="LinkedIn">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 group-hover:opacity-100 transition-opacity"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all bg-[#0A66C2] text-white text-xs py-1 px-2.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-md origin-bottom z-10">
                LinkedIn
              </span>
            </a>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-blue-200 flex flex-col items-center justify-center gap-4 text-xs font-medium text-slate-500">
        <div>
          © {new Date().getFullYear()} Vaididea Vision. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
