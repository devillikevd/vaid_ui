'use client';

import OrganizationPartnershipManager from '@/components/shared/OrganizationPartnershipManager';
import { api } from '@/lib/api';

export default function HospitalPartnershipsPage() {
    return (
        <OrganizationPartnershipManager
            title="Hospital Network Partnerships"
            subtitle="Manage organizational partnerships with Clinics, Pharmacies, and Diagnostic Centers."
            currentOrgType="hospital"
            availableTargetTypes={[
                { value: 'clinic', label: 'Clinic' },
                { value: 'pharmacy', label: 'Pharmacy' },
                { value: 'diagnostic_center', label: 'Diagnostic Center' }
            ]}
            fetchPartnerships={api.hospital.getPartnerships}
            sendInvite={api.hospital.invitePartnership}
            respondRequest={api.hospital.respondPartnership}
            requestChanges={api.hospital.requestChangesPartnership}
            acceptChanges={api.hospital.acceptChangesPartnership}
            terminatePartnership={api.hospital.terminatePartnership}
        />
    );
}
