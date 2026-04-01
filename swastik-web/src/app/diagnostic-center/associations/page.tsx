'use client';

import ProviderAssociationsInbox from '@/components/shared/ProviderAssociationsInbox';
import { diagnosticCenterApi } from '@/lib/api';

export default function DiagnosticCenterAssociationsPage() {
    return (
        <ProviderAssociationsInbox
            title="Facility Associations"
            subtitle="Accept hospital and clinic invites that want to reference this diagnostic center."
            providerLabel="Diagnostic Center"
            accentClass="text-purple-600"
            fetchInvites={diagnosticCenterApi.getAssociationInvites}
            fetchAssociations={diagnosticCenterApi.getAssociations}
            respondToInvite={diagnosticCenterApi.respondToAssociationInvite}
        />
    );
}
