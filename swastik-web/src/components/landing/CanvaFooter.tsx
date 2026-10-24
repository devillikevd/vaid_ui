import React from 'react';
import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

export default function CanvaFooter() {
  return (
    <footer className="relative overflow-hidden rounded-t-[3rem] bg-gradient-to-b from-[#286b5b] via-[#1A2E2A] from-0% via-20% to-[#1A2E2A] pb-8 pt-14 font-sans text-white sm:rounded-t-[4rem] sm:pt-24">
      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-white/[0.02] select-none pointer-events-none whitespace-nowrap z-0 font-serif tracking-tighter">
        Vaididea
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-16">
        
        {/* Top CTA Bar */}
        <div className="relative mb-14 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#2B6A60] to-[#1E5B53] p-7 shadow-2xl sm:mb-20 sm:rounded-[2.5rem] sm:p-10 md:flex-row md:items-center md:p-14">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <h3 className="mb-2 text-2xl font-bold sm:text-3xl md:text-4xl">Ready to Transform Your Health?</h3>
            <p className="text-base font-medium text-white/70 sm:text-lg">Join 25,000+ patients already using VaidIdea.</p>
          </div>
          <Link href="/login" className="relative z-10 bg-white text-[#1E5B53] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl whitespace-nowrap flex items-center gap-2">
            Get Started <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2B6A60] to-[#1E5B53] rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-black text-lg">V</span>
              </div>
              <span className="font-extrabold text-2xl tracking-tight">Vaid<span className="text-[#2B6A60]">idea</span></span>
            </div>
            <p className="text-white/50 leading-relaxed font-medium text-sm mb-8 max-w-xs">
              Your all-in-one digital healthcare ecosystem — connecting patients, doctors, hospitals, and pharmacies for seamless care.
            </p>
            <div className="flex gap-3">
               {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                 <a key={i} href="#" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#2B6A60] transition-all border border-white/10 hover:border-[#2B6A60] hover:-translate-y-0.5">
                   <Icon className="w-4 h-4" />
                 </a>
               ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/40 mb-6">Quick Links</h4>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/vision' },
                { label: 'Our Services', href: '/doctors' },
                { label: 'Health Library', href: '/health-library' },
                { label: 'Blogs', href: '/blogs' },
                { label: 'Contact', href: '/vision#contact' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="text-white/60 hover:text-white hover:translate-x-1 transition-all text-sm font-medium flex items-center gap-1 group">
                  <span className="w-0 group-hover:w-2 h-px bg-[#2B6A60] transition-all" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/40 mb-6">For Providers</h4>
            <div className="flex flex-col gap-3">
              {['Doctor Portal', 'Hospital Portal', 'Clinic Portal', 'Pharmacy Portal', 'Ambulance Service', 'Gym & Fitness'].map((item) => (
                <Link key={item} href="/providers" className="text-white/60 hover:text-white hover:translate-x-1 transition-all text-sm font-medium flex items-center gap-1 group">
                  <span className="w-0 group-hover:w-2 h-px bg-[#2B6A60] transition-all" />
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest text-white/40 mb-6">Contact Us</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#2B6A60] mt-1 shrink-0" />
                <span className="text-white/60 text-sm font-medium leading-relaxed">123 Healthcare Ave, Medical District, Tech City 400001</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#2B6A60] shrink-0" />
                <span className="text-white/60 text-sm font-medium">support@vaididea.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#2B6A60] shrink-0" />
                <span className="text-white/60 text-sm font-medium">+91 98765 43210</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-sm font-medium text-white/40 md:flex-row md:text-left">
          <p>&copy; 2026 Vaididea. All Rights Reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:justify-end">
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
