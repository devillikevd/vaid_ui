import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blogs & Healthcare Insights",
  description:
    "Explore practical healthcare guidance, patient education, provider insights, wellness ideas, and the Vaididea vision.",
  alternates: {
    canonical: "/blogs",
  },
  openGraph: {
    title: "Vaididea Blogs — Healthcare, Explained Simply",
    description:
      "Practical healthcare insights for patients, families, providers, and communities.",
    url: "https://www.vaididea.in/blogs",
    siteName: "Vaididea",
    locale: "en_IN",
    type: "website",
  },
};

export default function BlogsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
