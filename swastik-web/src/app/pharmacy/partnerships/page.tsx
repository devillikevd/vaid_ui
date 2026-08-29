import { redirect } from 'next/navigation';

/**
 * Legacy route: /pharmacy/partnerships
 * Redirected to the unified My Network hub.
 * Existing bookmarks and direct links continue to work.
 */
export default function PharmacyPartnershipsLegacyPage() {
    redirect('/pharmacy/network');
}
