import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProviderPortal } from './provider-portal-data';

export default function ProviderPortalCard({ portal }: { portal: ProviderPortal }) {
  const Icon = portal.icon;
  return (
    <article className={`group relative isolate flex min-h-[158px] overflow-hidden rounded-[22px] border border-white/90 bg-gradient-to-r ${portal.tone} p-4 shadow-[0_13px_17px_rgba(0,0,0,.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_24px_rgba(0,0,0,.2)] sm:min-h-[175px] sm:p-5`}>
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-[52%] bg-cover bg-right-bottom bg-no-repeat opacity-90 transition-transform duration-500 group-hover:scale-[1.04]" style={{ backgroundImage: `url('${portal.image}')` }} />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
      <div className="flex min-w-0 max-w-[75%] flex-col items-start">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-[#16745f] shadow-sm"><Icon size={22} /></span>
          <h3 className="font-serif text-sm font-black leading-tight tracking-[.045em] text-black sm:text-base">{portal.title}</h3>
        </div>
        <p className="mt-1.5 max-w-[290px] font-serif text-xs leading-relaxed text-slate-700 sm:text-sm">{portal.description}</p>
        <Link href={portal.href} className="mt-auto inline-flex items-center gap-3 rounded-full bg-white/65 px-3 py-1.5 text-xs font-extrabold text-slate-700 transition hover:bg-white sm:text-sm">Login/Sign up <ArrowRight size={18} /></Link>
      </div>
    </article>
  );
}
