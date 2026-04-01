'use client';

import FacilityAssociationManager from '@/components/shared/FacilityAssociationManager';
import { clinicApi } from '@/lib/api';

export default function ClinicPharmaciesPage() {
    return (
        <FacilityAssociationManager
            title="Associated Pharmacies"
            subtitle="Invite and manage pharmacies linked to this clinic. Only basic profile details are shown here."
            providerLabel="Pharmacy"
            accentClass="text-orange-600"
            emptyStateTitle="No pharmacies linked yet"
            emptyStateDescription="Invite a pharmacy owner by email. The pharmacy must accept before it appears here."
            inviteHint="Use the email of an approved pharmacy owner account. Once accepted, this page stays informational while medicines, inventory, orders, and patient-facing workflows continue from the pharmacy portal."
            fetchAssociations={clinicApi.getAssociatedPharmacies}
            sendInvite={clinicApi.invitePharmacy}
            unlinkAssociation={clinicApi.unlinkPharmacy}
        />
    );
}
