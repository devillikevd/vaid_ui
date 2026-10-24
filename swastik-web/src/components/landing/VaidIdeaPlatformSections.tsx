import Link from "next/link";
import {
  Accessibility,
  Activity,
  Ambulance,
  ArrowRight,
  Check,
  CloudOff,
  FileLock2,
  Globe2,
  HeartPulse,
  MapPinned,
  ShieldCheck,
  Syringe,
  Users,
  Video,
} from "lucide-react";

const careSteps = [
  {
    number: "01",
    title: "Find the right care",
    description: "Discover verified doctors, clinics, hospitals, labs, and pharmacies near you.",
    icon: MapPinned,
  },
  {
    number: "02",
    title: "Consult your way",
    description: "Choose a clinic visit, secure video consultation, or private chat based on your needs.",
    icon: Video,
  },
  {
    number: "03",
    title: "Continue with confidence",
    description: "Receive digital prescriptions, order medicines, and book diagnostic tests in one journey.",
    icon: Syringe,
  },
  {
    number: "04",
    title: "Keep care connected",
    description: "Store your health history securely and make follow-up care easier for you and your family.",
    icon: FileLock2,
  },
];

const platformBenefits = [
  {
    title: "One connected ecosystem",
    description: "Patients and providers work together across consultations, prescriptions, diagnostics, pharmacies, and follow-ups.",
    icon: Users,
  },
  {
    title: "Designed for real India",
    description: "Low-bandwidth experiences, multilingual foundations, and offline-ready workflows help care reach beyond major cities.",
    icon: Globe2,
  },
  {
    title: "Privacy at the centre",
    description: "Secure authentication, encrypted health information, and role-based access help keep personal care private.",
    icon: ShieldCheck,
  },
];

export default function VaidIdeaPlatformSections() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#173B34] py-16 font-sans text-white sm:py-24 lg:py-28">
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#4BAE91]/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-32 h-[24rem] w-[24rem] rounded-full bg-[#A48AE9]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#B9E6D6]">
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              Why Vaididea exists
            </div>
            <h2 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Healthcare should feel connected, not complicated.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              Finding a doctor, managing a prescription, booking a test, and reaching emergency care often means switching between disconnected services. Vaididea brings the journey together in one trusted place.
            </p>
            <Link
              href="/vision"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#173B34] transition hover:-translate-y-0.5 hover:bg-[#E4F6F0]"
            >
              Learn about our vision
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 sm:col-span-2 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B9E6D6]/15 text-[#B9E6D6]">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold">From fragmented care to one continuous journey</h3>
              </div>
              <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                {["Consultation", "Prescription & tests", "Follow-up care"].map((item, index) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B9E6D6] text-xs font-bold text-[#173B34]">{index + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {platformBenefits.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6">
                <Icon className="mb-5 h-6 w-6 text-[#B9E6D6]" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F8F7] py-16 font-sans sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <div className="mb-12 max-w-2xl sm:mb-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#2B6A60]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B6A60]">
              <Check className="h-4 w-4" aria-hidden="true" />
              Simple by design
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-[#173B34] sm:text-5xl">
              One care journey,
              <span className="block font-serif italic font-medium text-[#2B6A60]">step by step.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#61756E] sm:text-lg">
              Vaididea helps you move from finding care to staying on top of your health without losing context along the way.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {careSteps.map(({ number, title, description, icon: Icon }, index) => (
              <div key={number} className="relative rounded-[2rem] border border-white bg-white p-6 shadow-sm md:p-7">
                {index < careSteps.length - 1 && <div className="absolute right-[-1.25rem] top-14 z-10 hidden h-px w-8 bg-[#B9D8CF] md:block" />}
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm font-extrabold tracking-widest text-[#2B6A60]">{number}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E4F6F0] text-[#2B6A60]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-[#173B34]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#61756E]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#EAF3F0] py-16 font-sans sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#A9253A] to-[#701D32] p-7 text-white shadow-xl sm:p-10 lg:p-12">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[24px] border-white/10" />
            <div className="relative">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Ambulance className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/70">When every second matters</p>
              <h2 className="max-w-lg text-3xl font-bold leading-tight sm:text-4xl">Emergency support that brings the right people together.</h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                A single SOS can share your location and alert the response network, helping connect patients, guardians, ambulance teams, hospitals, and doctors faster.
              </p>
              <div className="mt-7 grid gap-3 text-sm font-medium sm:grid-cols-2">
                {["One-tap SOS workflow", "GPS location sharing", "Nearby hospital alerts", "Guardian notifications"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#FFC6CF]" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[2.5rem] border border-white bg-white p-7 shadow-sm sm:p-8">
              <CloudOff className="mb-5 h-7 w-7 text-[#2B6A60]" aria-hidden="true" />
              <h3 className="mb-3 text-xl font-bold text-[#173B34]">Built for every connection</h3>
              <p className="text-sm leading-relaxed text-[#61756E]">Offline-ready workflows, compressed media, and audio or chat fallbacks help you stay connected even when networks are unreliable.</p>
            </div>
            <div className="rounded-[2.5rem] border border-white bg-white p-7 shadow-sm sm:p-8">
              <Accessibility className="mb-5 h-7 w-7 text-[#2B6A60]" aria-hidden="true" />
              <h3 className="mb-3 text-xl font-bold text-[#173B34]">Care that includes more people</h3>
              <p className="text-sm leading-relaxed text-[#61756E]">A multilingual foundation and privacy-conscious options make healthcare more accessible across urban, semi-urban, and rural communities.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
