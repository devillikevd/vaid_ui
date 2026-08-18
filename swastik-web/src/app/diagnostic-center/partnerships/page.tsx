'use client';

import OrganizationPartnershipManager from '@/components/shared/OrganizationPartnershipManager';
import { api } from '@/lib/api';

export default function DiagnosticCenterPartnershipsPage() {
    return (
        <OrganizationPartnershipManager
            title="Diagnostic Center Network Partnerships"
            subtitle="Manage organizational partnerships with Clinics and Hospitals."
            currentOrgType="diagnostic_center"
            availableTargetTypes={[
                { value: 'clinic', label: 'Clinic' },
                { value: 'hospital', label: 'Hospital' }
            ]}
            fetchPartnerships={api.diagnosticCenter.getPartnerships}
            sendInvite={api.diagnosticCenter.invitePartnership}
            respondRequest={api.diagnosticCenter.respondPartnership}
            requestChanges={api.diagnosticCenter.requestChangesPartnership}
            acceptChanges={api.diagnosticCenter.acceptChangesPartnership}
            terminatePartnership={api.diagnosticCenter.terminatePartnership}
        />
    );
}
