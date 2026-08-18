'use client';

import OrganizationPartnershipManager from '@/components/shared/OrganizationPartnershipManager';
import { clinicApi } from '@/lib/api';

export default function ClinicPartnershipsPage() {
    return (
        <OrganizationPartnershipManager
            title="Clinic Network Partnerships"
            subtitle="Manage two-way organizational partnerships with Hospitals, Pharmacies, and Diagnostic Centers."
            currentOrgType="clinic"
            availableTargetTypes={[
                { value: 'hospital', label: 'Hospital' },
                { value: 'pharmacy', label: 'Pharmacy' },
                { value: 'diagnostic_center', label: 'Diagnostic Center' }
            ]}
            fetchPartnerships={clinicApi.getPartnerships}
            sendInvite={clinicApi.invitePartnership}
            respondRequest={clinicApi.respondPartnership}
            requestChanges={clinicApi.requestChangesPartnership}
            acceptChanges={clinicApi.acceptChangesPartnership}
            terminatePartnership={clinicApi.terminatePartnership}
        />
    );
}
