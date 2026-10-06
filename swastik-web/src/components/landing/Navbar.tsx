import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full bg-[#F3F4F6] py-6 px-10 md:px-20 flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <img src="/vaididea-logo.png" alt="Vaididea Logo" className="h-12 md:h-16 object-contain mix-blend-multiply" />
      </Link>
      
      {/* Center Links */}
      <div className="hidden lg:flex items-center gap-12 text-[#222] font-semibold text-[15px]">
        <Link href="/" className="hover:text-[#2B6A60] transition-colors">Home</Link>
        <Link href="/health-library" className="hover:text-[#2B6A60] transition-colors">Health Library</Link>
        <Link href="/blogs" className="hover:text-[#2B6A60] transition-colors">Blogs</Link>
        <Link href="/providers" className="hover:text-[#2B6A60] transition-colors">Providers & Services</Link>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <Link href="/login" className="px-6 py-2 rounded-full border border-[#222] text-[#222] text-sm font-semibold hover:bg-gray-50 transition-colors">
          Log In
        </Link>
        <Link href="/app" className="px-6 py-2 rounded-full bg-[#2B6A60] hover:bg-[#1E5B53] text-white text-sm font-semibold transition-colors">
          Get The App
        </Link>
      </div>
    </nav>
  );
}
