'use client';

import FacilityAssociationManager from '@/components/shared/FacilityAssociationManager';
import { hospitalApi } from '@/lib/api';

export default function HospitalPharmaciesPage() {
    return (
        <FacilityAssociationManager
            title="Associated Pharmacies"
            subtitle="Invite and manage pharmacies linked to this hospital. Only basic profile details are shown here."
            providerLabel="Pharmacy"
            accentClass="text-orange-600"
            emptyStateTitle="No pharmacies linked yet"
            emptyStateDescription="Invite a pharmacy owner by email. The pharmacy must accept before it appears here."
            inviteHint="Use the email of an approved pharmacy owner account. Once accepted, this page only shows reference details while medicines, inventory, orders, and patient workflows continue from the pharmacy portal."
            fetchAssociations={hospitalApi.getAssociatedPharmacies}
            sendInvite={hospitalApi.invitePharmacy}
            unlinkAssociation={hospitalApi.unlinkPharmacy}
        />
    );
}
