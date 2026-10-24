import Link from "next/link";
import {
  Activity,
  Building2,
  ClipboardPlus,
  FileHeart,
  HeartPulse,
  Leaf,
  Microscope,
  Pill,
  Route,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Store,
  Syringe,
  ArrowUpRight,
} from "lucide-react";
import type { BlogArticle } from "./blog-data";

const icons = {
  heart: HeartPulse,
  sparkles: Sparkles,
  route: Route,
  file: FileHeart,
  sos: ShieldAlert,
  leaf: Leaf,
  doctor: Stethoscope,
  building: Building2,
  service: Store,
  vision: Activity,
} as const;

const categoryIcons = {
  Vaididea: [HeartPulse, Activity, ClipboardPlus],
  Patients: [Stethoscope, FileHeart, Pill],
  Providers: [Building2, Stethoscope, ClipboardPlus],
  "Emergency Care": [ShieldAlert, Syringe, HeartPulse],
  Wellness: [Leaf, Activity, HeartPulse],
  "Healthcare Innovation": [Sparkles, Microscope, FileHeart],
} satisfies Record<BlogArticle["category"], typeof HeartPulse[]>;

const categoryHoverStyles: Record<
  BlogArticle["category"],
  { card: string; header: string; icon: string; text: string }
> = {
  Vaididea: {
    card: "hover:border-[#8FBFAE] hover:shadow-[0_18px_38px_rgba(72,124,107,0.18)]",
    header: "group-hover:bg-[#DDEEE7]",
    icon: "group-hover:border-[#A8CCBD] group-hover:bg-[#F7FCF9] group-hover:text-[#2F7564]",
    text: "group-hover:text-[#35675D]",
  },
  Patients: {
    card: "hover:border-[#9EBACB] hover:shadow-[0_18px_38px_rgba(76,125,153,0.18)]",
    header: "group-hover:bg-[#E1EEF3]",
    icon: "group-hover:border-[#AFCBD8] group-hover:bg-[#F8FCFD] group-hover:text-[#3D7188]",
    text: "group-hover:text-[#3D7188]",
  },
  Providers: {
    card: "hover:border-[#B5B4D0] hover:shadow-[0_18px_38px_rgba(108,105,157,0.18)]",
    header: "group-hover:bg-[#E8E7F2]",
    icon: "group-hover:border-[#C2C1DC] group-hover:bg-[#FBFAFF] group-hover:text-[#5D5A91]",
    text: "group-hover:text-[#5D5A91]",
  },
  "Emergency Care": {
    card: "hover:border-[#D9A5A0] hover:shadow-[0_18px_38px_rgba(169,91,83,0.18)]",
    header: "group-hover:bg-[#F5E5E2]",
    icon: "group-hover:border-[#DEB4AE] group-hover:bg-[#FFF9F8] group-hover:text-[#A95B53]",
    text: "group-hover:text-[#A95B53]",
  },
  Wellness: {
    card: "hover:border-[#B9C89D] hover:shadow-[0_18px_38px_rgba(108,135,76,0.18)]",
    header: "group-hover:bg-[#EEF3E4]",
    icon: "group-hover:border-[#C7D6AE] group-hover:bg-[#FBFDF7] group-hover:text-[#678242]",
    text: "group-hover:text-[#678242]",
  },
  "Healthcare Innovation": {
    card: "hover:border-[#B6C5D1] hover:shadow-[0_18px_38px_rgba(79,111,135,0.18)]",
    header: "group-hover:bg-[#E5EDF2]",
    icon: "group-hover:border-[#C0D0DC] group-hover:bg-[#FAFCFD] group-hover:text-[#4F7187]",
    text: "group-hover:text-[#4F7187]",
  },
};

export default function BlogCard({
  article,
  featured = false,
}: {
  article: BlogArticle;
  featured?: boolean;
}) {
  const Icon = icons[article.icon as keyof typeof icons] ?? HeartPulse;
  const supportingIcons = categoryIcons[article.category];
  const hoverStyles = categoryHoverStyles[article.category];

  return (
    <article className={`group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#DDE8E3] bg-[#FCFDFC] shadow-[0_8px_26px_rgba(35,73,65,0.055)] transition-all duration-300 hover:-translate-y-1 ${hoverStyles.card} ${featured ? "md:col-span-2 lg:col-span-2" : ""}`}>
      <div className={`relative flex ${featured ? "h-52" : "h-40"} items-center justify-center overflow-hidden bg-[#EAF2EF] transition-colors duration-300 ${hoverStyles.header}`}>
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-[#C8DDD4]" />
        <div className="absolute -bottom-24 -left-10 h-52 w-52 rounded-full border border-[#D5E5DE]" />
        <div className={`relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/80 bg-white/75 text-[#2F675C] shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${hoverStyles.icon}`}>
          <Icon className="h-10 w-10" strokeWidth={1.45} />
        </div>
        <span className="absolute left-5 top-5 rounded-full border border-[#C8DDD4] bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#35675D]">
          {article.category}
        </span>
        <div className="absolute bottom-4 right-5 flex items-center gap-1.5 text-[#5D8177]">
          {supportingIcons.map((SupportingIcon, index) => (
            <span key={index} className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/70 transition-colors duration-300 ${hoverStyles.icon}`}>
              <SupportingIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>
          ))}
        </div>
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-7 sm:p-8" : "p-5 sm:p-6"}`}>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-[#78928A]">
          <span>{article.dateLabel}</span>
          <span aria-hidden="true">•</span>
          <span>{article.readTime}</span>
        </div>
        <h2 className={`${featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"} font-bold leading-tight tracking-[-0.02em] text-[#20372F] transition-colors group-hover:text-[#2F675C]`}>
          {article.title}
        </h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-[#6C8179]">{article.excerpt}</p>
        <Link
          href={`/blogs/${article.slug}`}
          className={`mt-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-[#35675D] transition-all group-hover:gap-3 ${hoverStyles.text}`}
        >
          Read article <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
