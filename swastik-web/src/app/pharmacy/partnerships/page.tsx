'use client';

import OrganizationPartnershipManager from '@/components/shared/OrganizationPartnershipManager';
import { api } from '@/lib/api';

export default function PharmacyPartnershipsPage() {
    return (
        <OrganizationPartnershipManager
            title="Pharmacy Network Partnerships"
            subtitle="Manage organizational partnerships with Clinics and Hospitals."
            currentOrgType="pharmacy"
            availableTargetTypes={[
                { value: 'clinic', label: 'Clinic' },
                { value: 'hospital', label: 'Hospital' }
            ]}
            fetchPartnerships={api.pharmacy.getPartnerships}
            sendInvite={api.pharmacy.invitePartnership}
            respondRequest={api.pharmacy.respondPartnership}
            requestChanges={api.pharmacy.requestChangesPartnership}
            acceptChanges={api.pharmacy.acceptChangesPartnership}
            terminatePartnership={api.pharmacy.terminatePartnership}
        />
    );
}
