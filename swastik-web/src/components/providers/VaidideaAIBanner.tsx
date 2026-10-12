import Link from 'next/link';
import { Sparkles, Stethoscope, ArrowUpRight } from 'lucide-react';

export default function VaidideaAIBanner() {
  return (
    <section className="mt-9" aria-labelledby="vaididea-ai-heading">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#c9f1df] px-3 py-1 text-sm font-bold text-[#102c24] shadow-sm">
        <Stethoscope size={17} />For Services
      </div>
      <p className="px-2 font-serif text-sm leading-relaxed text-slate-700 sm:px-6 sm:text-base">Discover and manage essential healthcare and wellness services through a connected network designed to make quality services easier to access and manage.</p>
      <div className="relative mt-4 flex min-h-[145px] items-center overflow-hidden rounded-[22px] border border-white/80 bg-gradient-to-r from-[#d5f9e4] via-[#d4edf0] to-[#b9d0ff] px-4 py-5 shadow-[0_14px_20px_rgba(0,0,0,.18)] sm:px-7">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[44%] bg-[url('/images/providers/vaididea-ai-banner.webp')] bg-contain bg-right bg-no-repeat opacity-70" />
        <div className="relative z-10 max-w-[80%] sm:max-w-[68%]">
          <h2 id="vaididea-ai-heading" className="font-serif text-2xl font-black leading-tight text-black sm:text-3xl lg:text-4xl">Ask Anything about your Health</h2>
          <p className="mt-1 font-serif text-base text-slate-800 sm:text-lg">Chat with our Vaididea AI</p>
          <Link href="/ai" className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-indigo-500 bg-[#33363e] px-4 py-2 text-base font-extrabold text-white shadow-md transition hover:bg-[#22252b] sm:px-6 sm:text-xl">
            <Sparkles className="text-amber-300" size={20} /> VaidIdea AI <span className="self-start text-[10px] font-medium italic text-amber-300">beta</span><ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
