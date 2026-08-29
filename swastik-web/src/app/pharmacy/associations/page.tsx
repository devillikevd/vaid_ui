import { redirect } from 'next/navigation';

/**
 * Legacy route: /pharmacy/associations
 * Redirected to the unified My Network hub.
 * Existing bookmarks and direct links continue to work.
 */
export default function PharmacyAssociationsLegacyPage() {
    redirect('/pharmacy/network');
}

