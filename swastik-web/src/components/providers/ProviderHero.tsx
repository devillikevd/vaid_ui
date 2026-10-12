import { Activity, HeartPulse, Users, ShieldCheck, Ambulance } from 'lucide-react';

const floatingLabels = [
  { text: 'Better Care', icon: HeartPulse, className: 'right-[28%] top-[16%] text-rose-100' },
  { text: 'Connected Providers', icon: Users, className: 'left-[49%] top-[42%] text-emerald-200' },
  { text: 'Healthier Communities', icon: Activity, className: 'right-[5%] top-[39%] text-emerald-200' },
  { text: 'Fastest Connection', icon: Ambulance, className: 'right-[19%] bottom-[17%] text-rose-200' },
];

export default function ProviderHero() {
  return (
    <section className="relative isolate mx-auto mt-0 min-h-[560px] max-w-[1440px] overflow-hidden px-5 pb-12 pt-9 sm:px-8 lg:min-h-[590px] lg:px-10 lg:pt-12">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_65%_20%,rgba(181,235,198,.7),transparent_38%),linear-gradient(115deg,#f7faf9_5%,#e7f3f0_58%,#f7faf9)]" />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-full bg-[url('/images/providers/hero-healthcare-collage.webp')] bg-contain bg-right-bottom bg-no-repeat opacity-90 sm:w-[78%] lg:w-[76%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7faf9] via-[#f7faf9]/90 to-transparent lg:via-[#f7faf9]/65" />

      <div className="relative z-10 max-w-[510px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400 bg-white/85 px-3 py-1.5 font-serif text-sm italic text-black shadow-[0_8px_20px_rgba(0,0,0,.14)]">
          <span className="h-3 w-3 rounded-full bg-red-500 font-bold font-weight-bold shadow-[0_0_0_4px_rgba(239,68,68,.14)]" /><span className="font-bold">One Ecosystem, Many Possibilities</span>
        </div>
        <h1 className="mt-8 font-sans text-4xl font-extrabold leading-[1.02] tracking-tight text-black sm:text-5xl lg:text-[58px]">
          Choose Your<br /><span className="text-[#176457]">VAIDIDEA</span><br /><span className="text-3xl sm:text-4xl lg:text-[42px]">Experience</span>
        </h1>
        <p className="mt-8 font-serif text-lg font-bold italic text-slate-900 sm:text-xl">Different needs. Personalized solutions</p>
        <p className="mt-4 max-w-[410px] font-serif text-sm leading-relaxed text-slate-700">
          Whether you’re a patient or a healthcare provider, Vaididea gives you dedicated tools, support and a seamless experience to manage your healthcare journey.
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {floatingLabels.map(({ text, icon: Icon, className }) => (
          <div key={text} className={`absolute inline-flex items-center gap-2 rounded-full border border-white/80 bg-slate-800/65 px-3 py-1.5 font-serif text-sm italic text-white shadow-lg backdrop-blur-sm ${className}`}>
            <Icon size={15} className="text-emerald-200" />{text}
          </div>
        ))}
        <div className="absolute right-[5%] top-[12%] rounded-full bg-white/55 p-2 text-sky-400"><ShieldCheck size={20} /></div>
      </div>
    </section>
  );
}
