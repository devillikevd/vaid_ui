'use client';

import { useEffect } from 'react';
import { CreditCard, EyeOff, Plug, Stethoscope } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface ComingSoonSectionProps {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    note: string;
    onDirtyChange: (dirty: boolean) => void;
}

export function ComingSoonSection({ id, title, description, icon, note, onDirtyChange }: ComingSoonSectionProps) {
    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    return (
        <SettingsSection id={id} title={title} description={description} icon={icon} badge={<span className="text-xs font-medium text-gray-400">Coming soon</span>}>
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{note}</p>
            </div>
        </SettingsSection>
    );
}

export function ConsultationServicesSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    return (
        <ComingSoonSection
            id="services"
            title="Consultation & Services"
            description="Consent forms, consultation packages and service availability."
            icon={<Stethoscope className="h-5 w-5" />}
            note="Consultation packages and consent templates cannot be managed from settings yet. This section is reserved for a future release."
            onDirtyChange={onDirtyChange}
        />
    );
}

export function PrivacySection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    return (
        <ComingSoonSection
            id="privacy"
            title="Privacy"
            description="Data controls for your clinic profile and patient information."
            icon={<EyeOff className="h-5 w-5" />}
            note="Clinic-level privacy controls are not available yet. Patient data is always handled under the platform privacy policy."
            onDirtyChange={onDirtyChange}
        />
    );
}

export function BillingSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    return (
        <ComingSoonSection
            id="billing"
            title="Billing & Plans"
            description="Subscription, invoices and payment details for your clinic."
            icon={<CreditCard className="h-5 w-5" />}
            note="There is no clinic billing or subscription yet. Fees are negotiated directly with the platform."
            onDirtyChange={onDirtyChange}
        />
    );
}

export function ConnectedServicesSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    return (
        <ComingSoonSection
            id="connected-services"
            title="Connected Services"
            description="Integrations with third-party tools used by your clinic."
            icon={<Plug className="h-5 w-5" />}
            note="No third-party integrations are connected to the Clinic Portal yet."
            onDirtyChange={onDirtyChange}
        />
    );
}
