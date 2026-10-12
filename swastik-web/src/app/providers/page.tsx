import ProviderNavbar from '@/components/providers/ProviderNavbar';
import ProviderHero from '@/components/providers/ProviderHero';
import PatientPortalBanner from '@/components/providers/PatientPortalBanner';
import ProviderServicesGrid from '@/components/providers/ProviderServicesGrid';
import VaidideaAIBanner from '@/components/providers/VaidideaAIBanner';
import CanvaFooter from "@/components/landing/CanvaFooter";

export default function ProvidersPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f2f6f6] text-[#101b19]">
      <ProviderNavbar />
      <ProviderHero />
      <div className="relative mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-10">
        {/* Decorative watermark, intentionally behind the content. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 select-none overflow-hidden text-center text-[clamp(8rem,27vw,25rem)] font-black leading-none tracking-[-0.1em] text-[#0e7868]/[0.035]">
          VAIDIDEA
        </div>
        <div className="relative z-10">
          <PatientPortalBanner />
          <ProviderServicesGrid />
          <VaidideaAIBanner />
          <div className="mt-16" />
          <CanvaFooter />
        </div>
      </div>
    </main>
  );
}
