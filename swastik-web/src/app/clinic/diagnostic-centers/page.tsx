'use client';

import FacilityAssociationManager from '@/components/shared/FacilityAssociationManager';
import { clinicApi } from '@/lib/api';

export default function ClinicDiagnosticCentersPage() {
    return (
        <FacilityAssociationManager
            title="Associated Diagnostic Centers"
            subtitle="Invite and manage diagnostic centers linked to this clinic. Only basic profile details are shown here."
            providerLabel="Diagnostic Center"
            accentClass="text-purple-600"
            emptyStateTitle="No diagnostic centers linked yet"
            emptyStateDescription="Invite a diagnostic center owner by email. The center must accept before it appears here."
            inviteHint="Use the email of an approved diagnostic center owner account. Once accepted, this page stays informational while tests, bookings, results, and patient-facing workflows continue from the diagnostic center portal."
            fetchAssociations={clinicApi.getAssociatedDiagnosticCenters}
            sendInvite={clinicApi.inviteDiagnosticCenter}
            unlinkAssociation={clinicApi.unlinkDiagnosticCenter}
        />
    );
}
