import Link from "next/link";
import { ArrowUpRight, Quote, ShieldCheck, Star } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Patient",
    text: "I booked an appointment and had a video consultation within hours. The entire experience felt simple, clear, and genuinely thoughtful.",
    avatar: "/images/avatar_rahul.png",
    featured: true,
  },
  {
    name: "Priya Patel",
    role: "Mother of two",
    text: "I can consult a pediatrician from home without rearranging my whole day. Vaididea has made family healthcare much easier.",
    avatar: "/images/avatar_priya.png",
  },
  {
    name: "Amit Desai",
    role: "Patient",
    text: "The doctor was professional, the video quality was excellent, and my prescribed medicines arrived the next day.",
    avatar: "/images/avatar_amit.png",
  },
  {
    name: "Dr. Sneha Rao",
    role: "Verified Doctor",
    text: "The provider portal lets me manage my schedule and patient records securely without getting in the way of care.",
    avatar: "/images/avatar_sneha.png",
  },
];

function Rating() {
  return (
    <div className="flex items-center gap-1 text-[#D9A441]" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative overflow-hidden bg-[#F5F8F7] py-16 font-sans sm:py-24 lg:py-28">
      <div className="absolute left-[-12rem] top-20 h-96 w-96 rounded-full bg-[#CFE8DE]/60 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-[-12rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#E7DDF5]/50 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-8">
        <div className="mb-12 grid gap-8 lg:mb-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2B6A60]/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2B6A60]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Trusted by our community
            </div>
            <h2 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-[#173B34] sm:text-5xl lg:text-6xl">
              Care that feels
              <span className="block font-serif italic font-medium text-[#2B6A60]">personal.</span>
            </h2>
          </div>
          <div className="max-w-lg lg:justify-self-end">
            <p className="text-base leading-relaxed text-[#61756E] sm:text-lg">
              From the first search to the next follow-up, people choose Vaididea for healthcare that is easier to access and easier to trust.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-[#173B34]">4.9</span>
                  <Rating />
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#84948E]">Average experience rating</p>
              </div>
              <div className="h-10 w-px bg-[#C9DCD5]" />
              <div>
                <p className="text-2xl font-extrabold text-[#173B34]">25k+</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#84948E]">Care journeys started</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <article className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[2.5rem] bg-[#1E5B53] p-7 text-white shadow-[0_20px_50px_rgba(30,91,83,0.18)] sm:p-9 lg:col-span-7">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[30px] border-white/[0.07]" aria-hidden="true" />
            <div className="relative z-10 flex items-start justify-between">
              <Quote className="h-12 w-12 text-[#A9DED0]" aria-hidden="true" />
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">Patient story</span>
            </div>
            <p className="relative z-10 mt-8 max-w-2xl text-2xl font-medium leading-[1.35] sm:text-3xl">
              “{testimonials[0].text}”
            </p>
            <div className="relative z-10 mt-auto flex items-center gap-3 pt-8">
              <img src={testimonials[0].avatar} alt={testimonials[0].name} className="h-12 w-12 rounded-full border-2 border-white/30 object-cover" />
              <div>
                <p className="font-bold">{testimonials[0].name}</p>
                <p className="text-sm text-white/60">{testimonials[0].role}</p>
              </div>
              <Rating />
            </div>
          </article>

          <article className="flex min-h-[340px] flex-col rounded-[2.5rem] border border-white bg-white p-7 shadow-sm sm:p-9 lg:col-span-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#E4F6F0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2B6A60]">For families</span>
              <Quote className="h-9 w-9 text-[#B9D8CF]" aria-hidden="true" />
            </div>
            <p className="mt-8 text-xl font-semibold leading-relaxed text-[#29443D]">“{testimonials[1].text}”</p>
            <div className="mt-auto flex items-center gap-3 border-t border-[#E6EFEC] pt-7">
              <img src={testimonials[1].avatar} alt={testimonials[1].name} className="h-11 w-11 rounded-full object-cover" />
              <div>
                <p className="text-sm font-bold text-[#173B34]">{testimonials[1].name}</p>
                <p className="text-xs text-[#84948E]">{testimonials[1].role}</p>
              </div>
              <div className="ml-auto"><Rating /></div>
            </div>
          </article>

          {testimonials.slice(2).map((testimonial) => (
            <article key={testimonial.name} className="flex min-h-[250px] flex-col rounded-[2rem] border border-[#DCEAE5] bg-white/75 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg sm:p-8 lg:col-span-4">
              <div className="flex items-center justify-between">
                <Rating />
                <Quote className="h-7 w-7 text-[#B9D8CF]" aria-hidden="true" />
              </div>
              <p className="mt-6 text-base leading-relaxed text-[#61756E]">“{testimonial.text}”</p>
              <div className="mt-auto flex items-center gap-3 pt-7">
                <img src={testimonial.avatar} alt={testimonial.name} className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-bold text-[#173B34]">{testimonial.name}</p>
                  <p className="text-xs text-[#84948E]">{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}

          <div className="flex min-h-[250px] flex-col justify-between rounded-[2rem] border border-[#BFDCD2] bg-[#E4F6F0] p-6 sm:p-8 lg:col-span-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2B6A60] shadow-sm">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-2xl font-bold leading-tight text-[#173B34]">Your experience could be next.</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#61756E]">Find care that fits your life and start your journey with Vaididea.</p>
              <Link href="/doctors" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#2B6A60] hover:text-[#173B34]">
                Find care <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
