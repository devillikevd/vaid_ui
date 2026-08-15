'use client';

import { useEffect, useState } from 'react';
import { Building, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SettingsSection, StatusMessage, type SectionStatus } from './SettingsSection';
import type { ClinicProfile } from './types';

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

interface OrganizationSectionProps {
    clinic: ClinicProfile | null;
    onSave: SaveProfile;
    onDirtyChange: (dirty: boolean) => void;
}

const toCommaList = (value: string[]) => value.join(', ');
const parseList = (value: string) =>
    value.split(',').map((item) => item.trim()).filter(Boolean);

export function OrganizationSection({ clinic, onSave, onDirtyChange }: OrganizationSectionProps) {
    const [draft, setDraft] = useState({
        registrationNumber: '',
        licenseNumber: '',
        specializations: '',
        accreditations: '',
        insuranceAccepted: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);

    useEffect(() => {
        if (!clinic) return;
        setDraft({
            registrationNumber: clinic.registrationNumber,
            licenseNumber: clinic.licenseNumber,
            specializations: toCommaList(clinic.specializations),
            accreditations: toCommaList(clinic.accreditations),
            insuranceAccepted: toCommaList(clinic.insuranceAccepted),
        });
        setStatus(null);
    }, [clinic]);

    const baseline = clinic
        ? {
            registrationNumber: clinic.registrationNumber,
            licenseNumber: clinic.licenseNumber,
            specializations: toCommaList(clinic.specializations),
            accreditations: toCommaList(clinic.accreditations),
            insuranceAccepted: toCommaList(clinic.insuranceAccepted),
        }
        : null;

    const dirty = !!baseline && JSON.stringify(draft) !== JSON.stringify(baseline);
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);

    const set = (key: keyof typeof draft, value: string) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus(null);
        const result = await onSave(
            {
                registration_number: draft.registrationNumber.trim() || undefined,
                license_number: draft.licenseNumber.trim() || undefined,
                specializations: parseList(draft.specializations),
                accreditations: parseList(draft.accreditations),
                insurance_accepted: parseList(draft.insuranceAccepted),
            },
            'Organization details updated!'
        );
        setStatus({ type: result.ok ? 'success' : 'error', message: result.message });
        setIsSaving(false);
    };

    const handleCancel = () => {
        if (clinic) {
            setDraft({
                registrationNumber: clinic.registrationNumber,
                licenseNumber: clinic.licenseNumber,
                specializations: toCommaList(clinic.specializations),
                accreditations: toCommaList(clinic.accreditations),
                insuranceAccepted: toCommaList(clinic.insuranceAccepted),
            });
        }
        setStatus(null);
    };

    return (
        <SettingsSection
            id="organization"
            title="Organization Details"
            description="Regulatory identifiers and service tags used across your public profile."
            icon={<Building className="h-5 w-5" />}
            actions={
                dirty && (
                    <>
                        <Button variant="outline" size="sm" onClick={handleCancel} leftIcon={<X className="h-4 w-4" />}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => void handleSave()} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                            Save Changes
                        </Button>
                    </>
                )
            }
        >
            <div className="space-y-5">
                <StatusMessage status={status} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                        label="Registration Number"
                        value={draft.registrationNumber}
                        onChange={(e) => set('registrationNumber', e.target.value)}
                        placeholder="Clinic registration number"
                    />
                    <Input
                        label="License Number"
                        value={draft.licenseNumber}
                        onChange={(e) => set('licenseNumber', e.target.value)}
                        placeholder="Clinic license number"
                    />
                    <Input
                        label="Specializations"
                        value={draft.specializations}
                        onChange={(e) => set('specializations', e.target.value)}
                        placeholder="General Medicine, Pediatrics, Cardiology"
                    />
                    <Input
                        label="Accreditations"
                        value={draft.accreditations}
                        onChange={(e) => set('accreditations', e.target.value)}
                        placeholder="NABH, ISO 9001"
                    />
                    <div className="md:col-span-2">
                        <Input
                            label="Insurance Accepted"
                            value={draft.insuranceAccepted}
                            onChange={(e) => set('insuranceAccepted', e.target.value)}
                            placeholder="Star Health, ICICI Lombard, Max Bupa, CGHS, ECHS"
                        />
                        <p className="mt-1 text-xs text-gray-400">Comma-separated list of insurance providers accepted.</p>
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
}
