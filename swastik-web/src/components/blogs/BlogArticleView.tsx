import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import type { BlogArticle } from "./blog-data";

export default function BlogArticleView({ article }: { article: BlogArticle }) {
  return (
    <article>
      <Link
        href="/blogs"
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#668078] transition hover:text-[#35675D]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all insights
      </Link>
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#D0E0D8] bg-[#EAF2EE] p-7 text-[#29463D] shadow-[0_12px_35px_rgba(35,73,65,0.08)] sm:p-12">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#D1E2DA]" />
        <div className="relative flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#668078]">
          <span className="rounded-full border border-[#C9DDD5] bg-white/70 px-3 py-1.5">{article.category}</span>
          <span>{article.readTime}</span>
          <span>{article.dateLabel}</span>
        </div>
        <h1 className="relative mt-7 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="relative mt-5 max-w-3xl text-base leading-8 text-[#668078] sm:text-lg">
          {article.excerpt}
        </p>
        <div className="relative mt-8 flex items-center gap-3 text-sm font-semibold text-[#668078]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9DDD5] bg-white/70">
            <HeartPulse className="h-4 w-4 text-[#47766B]" />
          </span>
          Vaididea Editorial Team
        </div>
      </header>

      <div className="mx-auto mt-10 grid max-w-4xl gap-10 lg:grid-cols-[1fr_260px]">
        <div className="space-y-9">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold tracking-tight text-[#29463D] sm:text-3xl">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-8 text-[#61766D]">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-5 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-base leading-7 text-[#61766D]">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#6E9A8D]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div className="rounded-[1.5rem] border border-[#D4E3DB] bg-[#EEF5F1] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#47766B]">
              Key takeaway
            </p>
            <p className="mt-3 text-lg font-semibold leading-8 text-[#355F56]">
              {article.takeaway}
            </p>
          </div>
          {article.disclaimer && (
            <div className="flex gap-3 rounded-2xl border border-[#E8DDD0] bg-[#FBF6EE] p-5 text-sm leading-7 text-[#735F4A]">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#A47E46]" />
              <p>{article.disclaimer}</p>
            </div>
          )}
        </div>
        <aside className="h-fit rounded-[1.5rem] border border-[#DCE8E0] bg-white p-6 shadow-[0_10px_35px_rgba(15,95,80,0.05)] lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8C9E96]">
            Continue your journey
          </p>
          <p className="mt-3 text-sm leading-7 text-[#6C8179]">
            Find the next step that fits your healthcare needs.
          </p>
          <Link
            href={article.ctaHref}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#47766B] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#35675D]"
          >
            {article.ctaLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </article>
  );
}
