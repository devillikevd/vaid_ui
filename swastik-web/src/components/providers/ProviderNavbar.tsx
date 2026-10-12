import Link from 'next/link';
import { HeartPulse, ArrowLeft } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Health Library', href: '/health-library' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Contact Us', href: '/contact' },
];

export default function ProviderNavbar() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-[0_12px_30px_rgba(20,70,54,.18)] backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-extrabold tracking-tight text-[#176b5d]" aria-label="Vaididea home">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-[#16836c]"><HeartPulse size={19} /></span>
          <span>Vaididea</span>
        </Link>
        <div className="hidden items-center gap-5 text-sm font-semibold text-slate-800 md:flex lg:gap-9">
          {navItems.map((item) => <Link key={item.label} href={item.href} className="transition-colors hover:text-emerald-700">{item.label}</Link>)}
        </div>
        <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#18895e] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#116e4b] sm:px-5 sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5 md:hidden" />Back To Home
        </Link>
      </nav>
      <div className="mx-auto mt-2 flex max-w-[1280px] justify-center gap-4 rounded-2xl bg-white/80 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm md:hidden">
        {navItems.map((item) => <Link key={item.label} href={item.href} className="hover:text-emerald-700">{item.label}</Link>)}
      </div>
    </header>
  );
}
