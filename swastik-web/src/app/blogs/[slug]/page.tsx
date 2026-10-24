import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import CanvaFooter from "@/components/landing/CanvaFooter";
import BlogArticleView from "@/components/blogs/BlogArticleView";
import { blogArticles, getBlogArticle } from "@/components/blogs/blog-data";
import { buildJsonLdString } from "@/lib/sanitize";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/blogs/${article.slug}` },
    openGraph: {
      title: `${article.title} | Vaididea`,
      description: article.excerpt,
      url: `https://www.vaididea.in/blogs/${article.slug}`,
      siteName: "Vaididea",
      locale: "en_IN",
      type: "article",
      publishedTime: article.publishedAt,
      authors: ["Vaididea Editorial Team"],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: BlogArticlePageProps) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: {
      "@type": "Organization",
      name: "Vaididea Editorial Team",
      url: "https://www.vaididea.in",
    },
    publisher: {
      "@type": "Organization",
      name: "Vaididea",
      url: "https://www.vaididea.in",
    },
    mainEntityOfPage: `https://www.vaididea.in/blogs/${article.slug}`,
  };

  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#20372F]">
      <script type="application/ld+json">
        {buildJsonLdString(articleJsonLd)}
      </script>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-16">
        <BlogArticleView article={article} />
      </div>
      <CanvaFooter />
    </main>
  );
}
