"use client";

import { useMemo, useRef, useState } from "react";
import { Activity, BookHeart, HeartPulse, Search, SlidersHorizontal, X } from "lucide-react";
import BlogCard from "./BlogCard";
import { blogArticles, blogCategories, type BlogCategory } from "./blog-data";

const ARTICLES_PER_PAGE = 5;

export default function BlogExplorer() {
  const [activeCategory, setActiveCategory] = useState<"All" | BlogCategory>("All");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const articlesSectionRef = useRef<HTMLElement>(null);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...blogArticles]
      .filter((article) => {
        const matchesCategory =
          activeCategory === "All" || article.category === activeCategory;
        const matchesQuery =
          !normalizedQuery ||
          [article.title, article.excerpt, article.category, article.audience]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      })
      .sort(
        (first, second) =>
          new Date(second.publishedAt).getTime() -
          new Date(first.publishedAt).getTime()
      );
  }, [activeCategory, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const visibleArticles = filteredArticles.slice(
    (safePage - 1) * ARTICLES_PER_PAGE,
    safePage * ARTICLES_PER_PAGE
  );

  const changeCategory = (category: "All" | BlogCategory) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      articlesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <>
      <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#DDE8E3] bg-[#F1F6F3] px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[#D9E8E1]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full border border-[#D9E8E1]" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-[#C9DDD5] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#35675D]">
          <BookHeart className="h-3.5 w-3.5" />
          Vaididea insights
        </span>
        <h1 className="relative mt-6 text-4xl font-extrabold tracking-tight text-[#20372F] sm:text-6xl">
          Healthcare, explained <span className="font-serif italic text-[#35675D]">simply.</span>
        </h1>
        <p className="relative mx-auto mt-6 max-w-2xl text-base leading-8 text-[#6C8179] sm:text-lg">
          Practical guidance, platform stories, and thoughtful ideas for patients,
          families, healthcare professionals, and the communities they serve.
        </p>
        <div className="relative mx-auto mt-8 flex max-w-md items-center justify-center gap-2 text-[#6E8E84]">
          {[Activity, BookHeart, HeartPulse].map((Icon, index) => (
            <span key={index} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D1E2DA] bg-white/70">
              <Icon className="h-4 w-4" />
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl rounded-[1.5rem] border border-[#DDE8E3] bg-[#FCFDFC] p-4 shadow-[0_8px_26px_rgba(35,73,65,0.045)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#29463D]">
            <SlidersHorizontal className="h-4 w-4 text-[#4E7B70]" />
            Explore by topic
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#81928A]" />
            <input
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search articles"
              aria-label="Search blog articles"
              className="h-11 w-full rounded-full border border-[#DDE8E3] bg-[#F5F8F6] pl-11 pr-10 text-sm text-[#29463D] outline-none transition focus:border-[#7FA99C] focus:ring-2 focus:ring-[#7FA99C]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => changeQuery("")}
                aria-label="Clear article search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#81928A] hover:bg-[#E7F1EC] hover:text-[#0F5F50]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {blogCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => changeCategory(category)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                activeCategory === category
                  ? "bg-[#47766B] text-white shadow-sm"
                  : "bg-[#F0F5F2] text-[#668078] hover:bg-[#E2EEE8] hover:text-[#35675D]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section
        ref={articlesSectionRef}
        className="mx-auto mt-10 max-w-6xl scroll-mt-24"
        aria-live="polite"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8C9E96]">
              Latest perspectives
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#29463D] sm:text-3xl">
              Ideas for better care
            </h2>
          </div>
          <p className="text-right text-xs font-semibold text-[#81928A]">
            {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}
          </p>
        </div>
        {filteredArticles.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article, index) => (
              <BlogCard
                key={article.slug}
                article={article}
                featured={
                  safePage === 1 &&
                  index === 0 &&
                  !query &&
                  activeCategory === "All"
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[#B7D1C4] bg-white p-12 text-center">
            <h3 className="text-lg font-bold text-[#17271F]">No articles found</h3>
            <p className="mt-2 text-sm text-[#687870]">
              Try a different search term or browse all topics.
            </p>
            <button
              type="button"
              onClick={() => {
                changeCategory("All");
                changeQuery("");
              }}
              className="mt-5 rounded-full bg-[#0F5F50] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A4F42]"
            >
              Show all articles
            </button>
          </div>
        )}
        {filteredArticles.length > ARTICLES_PER_PAGE && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label="Blog pages"
          >
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="rounded-full border border-[#DDE8E3] bg-[#FCFDFC] px-4 py-2 text-sm font-bold text-[#668078] transition hover:border-[#AFCBC0] hover:text-[#35675D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  aria-current={safePage === page ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                    safePage === page
                      ? "bg-[#47766B] text-white shadow-sm"
                      : "border border-[#DDE8E3] bg-[#FCFDFC] text-[#668078] hover:border-[#AFCBC0] hover:text-[#35675D]"
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="rounded-full border border-[#DDE8E3] bg-[#FCFDFC] px-4 py-2 text-sm font-bold text-[#668078] transition hover:border-[#AFCBC0] hover:text-[#35675D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
