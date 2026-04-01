'use client';

import ProviderAssociationsInbox from '@/components/shared/ProviderAssociationsInbox';
import { pharmacyApi } from '@/lib/api';

export default function PharmacyAssociationsPage() {
    return (
        <ProviderAssociationsInbox
            title="Facility Associations"
            subtitle="Accept hospital and clinic invites that want to reference this pharmacy."
            providerLabel="Pharmacy"
            accentClass="text-orange-600"
            fetchInvites={pharmacyApi.getAssociationInvites}
            fetchAssociations={pharmacyApi.getAssociations}
            respondToInvite={pharmacyApi.respondToAssociationInvite}
        />
    );
}
