import Link from 'next/link';
import { ArrowRight, UserRound, HeartPulse } from 'lucide-react';

export default function PatientPortalBanner() {
  return (
    <section aria-labelledby="patients-heading" className="mb-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#c9f1df] px-3 py-1 text-sm font-bold text-[#102c24] shadow-sm">
        <UserRound size={17} fill="currentColor" />For Individuals/Patients
      </div>
      <p className="mt-3 px-2 text-center font-serif text-base leading-relaxed text-slate-700 sm:text-lg">Manage your health, book services and stay connected with trusted providers.</p>
      <div className="relative mt-3 flex min-h-[160px] items-center overflow-hidden rounded-[22px] border border-white/80 bg-gradient-to-r from-[#c5ddff] via-[#d8e9f8] to-[#fff] px-5 py-6 shadow-[0_15px_20px_rgba(0,0,0,.22)] sm:px-8 lg:min-h-[175px]">
        <div aria-hidden="true" className="absolute inset-y-0 right-[18%] w-1/3 bg-[url('/images/providers/patient-banner.webp')] bg-contain bg-right-bottom bg-no-repeat opacity-90" />
        <div className="relative z-10 max-w-[58%] sm:max-w-[60%]">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-800/20 bg-white/65 text-emerald-800"><HeartPulse size={22} /></span>
            <h2 id="patients-heading" className="font-serif text-xl font-black tracking-[.06em] text-black sm:text-2xl">PATIENTS</h2>
          </div>
          <p className="mt-1 max-w-[360px] font-serif text-sm leading-relaxed text-slate-700 sm:text-base">Book appointments, manage health records, order medicines and more</p>
          <Link href="/login/patient" className="mt-3 inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-white sm:text-sm">Login/Sign up <ArrowRight size={20} /></Link>
        </div>
        <div className="relative z-10 ml-auto hidden max-w-[245px] text-right font-sans text-3xl font-extrabold leading-tight text-[#11656a] sm:block lg:text-4xl">Your Health<br />Our Priority</div>
      </div>
    </section>
  );
}
