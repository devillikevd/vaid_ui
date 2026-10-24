import Link from "next/link";
import { Activity, ArrowUpRight, BookOpen, HeartPulse, Stethoscope } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CanvaFooter from "@/components/landing/CanvaFooter";
import BlogExplorer from "@/components/blogs/BlogExplorer";

export default function BlogsPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#20372F]">
      <Navbar />
      <div className="px-4 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-16">
        <BlogExplorer />
        <section className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-[1.5rem] border border-[#DDE8E3] bg-[#EEF4F0] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:p-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[#47766B]">
              <BookOpen className="h-5 w-5" />
              More than information
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#29463D] sm:text-4xl">
              Better understanding leads to better healthcare.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#6C8179]">
              Use the Vaididea Health Library for approachable health education,
              then take the next step with trusted care when you need it.
            </p>
          </div>
          <Link
            href="/health-library"
            className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#47766B] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#35675D] lg:mt-0"
          >
            Visit Health Library <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
        <section className="mx-auto mt-6 flex max-w-6xl flex-col gap-5 rounded-[1.5rem] border border-[#DDE8E3] bg-[#355F56] p-7 text-white sm:p-9 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 min-w-[7.25rem] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-white/15 px-2">
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 sm:h-5 sm:w-5" />
                <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </span>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">
                Are you a healthcare provider?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-white/75">
                Join a connected healthcare experience that helps patients
                discover your services and take the next step with confidence.
              </p>
            </div>
          </div>
          <Link
            href="/providers"
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#F4F8F5] px-5 py-3 text-sm font-bold text-[#355F56] transition hover:bg-white"
          >
            Join Vaididea <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
      <CanvaFooter />
    </main>
  );
}
