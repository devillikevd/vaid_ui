import { UserRound } from 'lucide-react';
import ProviderPortalCard from './ProviderPortalCard';
import { providerPortals } from './provider-portal-data';

export default function ProviderServicesGrid() {
  return (
    <section aria-labelledby="providers-heading" className="mt-5">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#c9f1df] px-3 py-1 text-sm font-bold text-[#102c24] shadow-sm">
        <UserRound size={17} fill="currentColor" />For Healthcare Providers
      </div>
      <h2 id="providers-heading" className="sr-only">Healthcare provider portals</h2>
      <p className="mt-2 px-2 text-center font-serif text-base leading-relaxed text-slate-700 sm:text-lg">Join India’s growing healthcare network and manage your services with powerful digital tools.</p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-8">
        {providerPortals.map((portal) => <ProviderPortalCard key={portal.title} portal={portal} />)}
      </div>
    </section>
  );
}
