import Link from 'next/link';
import DnaModel from './DnaModel';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  HeartPulse,
  MapPin,
  ScanLine,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';

function GlassCard({ children, className }: { children: React.ReactNode; className: string }) {
  return <div className={`vaid-glass-card ${className}`}>{children}</div>;
}

export default function Hero() {
  return (
    <section className="vaid-hero relative w-full overflow-hidden bg-[#F3F8F6] font-sans">
      <div className="vaid-ambient vaid-ambient-mint" />
      <div className="vaid-ambient vaid-ambient-lilac" />
      <div className="vaid-grid" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-14 sm:px-8 sm:pt-20 lg:px-16 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-4">
          <div className="relative z-10 text-center lg:text-left">
            <div className="vaid-reveal inline-flex items-center gap-2 rounded-full border border-[#2B6A60]/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B6A60] shadow-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Your care, connected
            </div>
            <h1 className="vaid-reveal vaid-delay-1 mt-5 font-sans text-[clamp(2.8rem,6vw,5.5rem)] font-bold leading-[1.05] tracking-[-.06em] text-[#173B34]">
              Healthcare that
              <span className="vaid-title-gradient block pb-3 sm:pb-2 sm:leading-[1.05]">works for you.</span>
            </h1>
            <p className="vaid-reveal vaid-delay-2 mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#61756E] sm:text-lg lg:mx-0">
              Find trusted doctors, book appointments, order medicines, and manage your health journey in one simple place.
            </p>

            <form action="/doctors" method="get" className="vaid-reveal vaid-delay-3 mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-[1.5rem] border border-white bg-white/90 p-2 shadow-[0_18px_50px_rgba(43,106,96,.16)] sm:flex-row sm:items-center sm:rounded-full lg:mx-0">
              <label htmlFor="hero-doctor-search" className="sr-only">Search for a doctor, speciality, clinic, or city</label>
              <div className="flex min-w-0 flex-1 items-center px-3 sm:px-4">
                <Search className="mr-3 h-5 w-5 shrink-0 text-[#2B6A60]" aria-hidden="true" />
                <input id="hero-doctor-search" name="q" type="search" placeholder="Doctor, speciality or city" className="w-full bg-transparent py-3 text-sm text-[#233D38] outline-none placeholder:text-[#8B9B96] sm:text-[15px]" />
                <MapPin className="hidden h-5 w-5 shrink-0 text-[#9BAEA8] sm:block" aria-hidden="true" />
              </div>
              <button type="submit" className="rounded-full bg-[#2B6A60] px-7 py-3.5 text-sm font-bold text-white shadow-[0_7px_20px_rgba(43,106,96,.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#1E5B53] hover:shadow-lg">
                Find care <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>

          <div className="vaid-visual relative mx-auto mt-2 block h-[300px] w-full max-w-[700px] overflow-visible sm:h-[400px] lg:mt-0 lg:h-[590px]">
            <div className="vaid-visual-halo" />
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/80 shadow-[0_18px_50px_rgba(43,106,96,.14)] lg:hidden">
              <img
                src="/images/female_doctor_hero.png"
                alt="Healthcare professional ready to help"
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173B34]/55 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm">
                <div>
                  <p className="text-sm font-bold text-[#173B34]">Care that feels personal</p>
                  <p className="mt-0.5 text-xs text-[#61756E]">Connected healthcare for you</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#2B6A60]" aria-hidden="true" />
              </div>
            </div>
            <div className="vaid-dna-wrap"><DnaModel /></div>

            <GlassCard className="vaid-card-ai hidden lg:block">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4F6F0] text-[#2B806F]"><ScanLine className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#1B3832] sm:text-sm">Smart health insights</p><p className="mt-0.5 text-[10px] text-[#81928D] sm:text-[11px]">Your health overview</p></div>
                <span className="rounded-full bg-[#E5F6EE] px-2 py-1 text-[9px] font-bold text-[#27806B]">READY</span>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 rounded-xl bg-white/65 p-2.5"><Activity className="h-3.5 w-3.5 text-[#4BAE91]" /><span className="flex-1 text-[10px] text-[#536D65] sm:text-xs">Care plan overview</span><Check className="h-3.5 w-3.5 text-[#31977D]" /></div>
                <div className="flex items-center gap-2 rounded-xl bg-white/65 p-2.5"><HeartPulse className="h-3.5 w-3.5 text-[#A48AE9]" /><span className="flex-1 text-[10px] text-[#536D65] sm:text-xs">Health records organised</span><Check className="h-3.5 w-3.5 text-[#31977D]" /></div>
              </div>
            </GlassCard>

            <GlassCard className="vaid-card-appointment hidden lg:block">
              <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DFF2EA] text-[#2B6A60]"><CalendarCheck2 className="h-4 w-4" /></div><div><p className="text-xs font-bold text-[#1B3832]">Appointments</p><p className="mt-0.5 text-[10px] text-[#81928D]">Care, on your schedule</p></div></div>
              <div className="mt-3 flex items-center gap-2 border-t border-[#D8E9E2]/80 pt-3"><Clock3 className="h-4 w-4 text-[#2B8B78]" /><span className="text-[11px] font-medium text-[#526A63]">Easy booking & reminders</span></div>
            </GlassCard>

            <GlassCard className="vaid-card-trust hidden lg:block">
              <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E7F6F0] text-[#2B806F]"><Video className="h-4 w-4" /></div><div><p className="text-xs font-bold text-[#1B3832]">Your health, connected</p><p className="mt-0.5 text-[10px] text-[#81928D]">Everything in one place</p></div></div>
            </GlassCard>

            <div className="vaid-orbit-dot vaid-dot-one hidden lg:block" />
            <div className="vaid-orbit-dot vaid-dot-two hidden lg:block" />
            <div className="vaid-orbit-dot vaid-dot-three hidden lg:block" />
            <div className="vaid-visual-caption hidden lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#5BBBA5]" />Better connected care</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-center">
          <Link href="/doctors" className="inline-flex items-center gap-2 rounded-full bg-[#173B34] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2B6A60]">Explore healthcare<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <span className="flex items-center gap-1.5 text-sm font-medium text-[#6F827C]"><ShieldCheck className="h-4 w-4 text-[#2B6A60]" aria-hidden="true" />Trusted care for every stage of life</span>
        </div>
      </div>

      <style>{`
        .vaid-hero { isolation: isolate; }
        .vaid-ambient { position: absolute; z-index: -1; pointer-events: none; border-radius: 9999px; filter: blur(75px); }
        .vaid-ambient-mint { width: 36rem; height: 36rem; left: 36%; top: 5%; background: rgba(155, 224, 203, .34); }
        .vaid-ambient-lilac { width: 29rem; height: 29rem; right: -8rem; top: 20%; background: rgba(190, 166, 241, .25); }
        .vaid-grid { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .2; background-image: radial-gradient(rgba(44, 117, 99, .2) .7px, transparent .7px); background-size: 24px 24px; mask-image: linear-gradient(to bottom, black, transparent 78%); }
        .vaid-title-gradient { background: linear-gradient(100deg, #2B6A60 5%, #389B85 47%, #8270CF 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .vaid-reveal { animation: vaidReveal .8s cubic-bezier(.2,.7,.2,1) both; }
        .vaid-delay-1 { animation-delay: .08s; } .vaid-delay-2 { animation-delay: .16s; } .vaid-delay-3 { animation-delay: .24s; }
        .vaid-visual { perspective: 1100px; overflow: visible; }
        .vaid-visual-halo { position: absolute; width: 90%; height: 78%; left: 5%; top: 10%; border-radius: 50%; background: radial-gradient(ellipse, rgba(173,229,211,.55) 0%, rgba(206,190,246,.2) 43%, transparent 72%); filter: blur(24px); }
        .vaid-dna-wrap { position: absolute; inset: -6% 8% 0 6%; display: flex; align-items: center; justify-content: center; transform-style: preserve-3d; animation: vaidDnaFloat 7s ease-in-out infinite; }
        .vaid-dna-scene { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; perspective: 900px; transform-style: preserve-3d; }
        .vaid-dna-helix { position: relative; z-index: 2; height: 100%; width: 100%; overflow: visible; filter: drop-shadow(0 18px 20px rgba(79,94,135,.13)); animation: vaidDnaRotate 12s linear infinite; }
        .vaid-dna-orbit { position: absolute; left: 50%; top: 50%; border: 1px solid rgba(88,164,144,.2); border-radius: 50%; transform: translate(-50%, -50%) rotate(-25deg); }
        .vaid-dna-orbit-one { width: 125%; height: 33%; } .vaid-dna-orbit-two { width: 115%; height: 45%; border-color: rgba(150,126,220,.17); transform: translate(-50%, -50%) rotate(38deg); }
        .vaid-dna-base-glow { position: absolute; z-index: 0; left: 0; right: 0; bottom: 3%; height: 20%; background: radial-gradient(ellipse, rgba(125,203,179,.3), rgba(188,166,239,.17) 42%, transparent 72%); filter: blur(17px); }
        .vaid-glass-card { position: absolute; z-index: 5; border: 1px solid rgba(255,255,255,.88); background: linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.48)); box-shadow: 0 18px 55px rgba(39,87,76,.12), inset 0 1px 0 rgba(255,255,255,.95); backdrop-filter: blur(22px) saturate(145%); border-radius: 20px; padding: 14px; animation: vaidCardFloat 6s ease-in-out infinite; }
        .vaid-card-ai { width: min(66%, 285px); top: 8%; right: 0; animation-delay: -.7s; } .vaid-card-appointment { width: min(58%, 250px); left: 0; top: 46%; animation-delay: -2.4s; } .vaid-card-trust { width: min(64%, 270px); right: 2%; bottom: 8%; animation-delay: -4s; }
        .vaid-orbit-dot { position: absolute; z-index: 4; width: 10px; height: 10px; border-radius: 50%; background: linear-gradient(135deg, #BDF3E2, #8D78DB); box-shadow: 0 0 0 6px rgba(255,255,255,.48), 0 0 22px rgba(94,180,153,.4); }
        .vaid-dot-one { top: 24%; left: 19%; } .vaid-dot-two { top: 17%; right: 23%; width: 7px; height: 7px; } .vaid-dot-three { bottom: 20%; left: 29%; width: 6px; height: 6px; }
        .vaid-visual-caption { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; white-space: nowrap; color: #6B847B; font-size: 11px; font-weight: 600; letter-spacing: .04em; border: 1px solid rgba(255,255,255,.8); background: rgba(255,255,255,.45); padding: 8px 13px; border-radius: 999px; backdrop-filter: blur(12px); }
        @keyframes vaidDnaRotate { 0% { transform: rotateY(0deg) rotateZ(-2deg); } 50% { transform: rotateY(180deg) rotateZ(2deg); } 100% { transform: rotateY(360deg) rotateZ(-2deg); } }
        @keyframes vaidDnaFloat { 0%, 100% { transform: translateY(0) rotateZ(-1deg); } 50% { transform: translateY(-11px) rotateZ(1deg); } }
        @keyframes vaidCardFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes vaidReveal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1023px) { .vaid-dna-wrap { display: none; } .vaid-visual-halo { display: none; } }
        @media (prefers-reduced-motion: reduce) { .vaid-reveal, .vaid-dna-helix, .vaid-dna-wrap, .vaid-glass-card { animation: none !important; } }
      `}</style>
    </section>
  );
}
