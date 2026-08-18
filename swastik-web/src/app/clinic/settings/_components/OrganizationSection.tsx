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

    const [isEditing, setIsEditing] = useState(false);

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
        if (result.ok) {
            setIsEditing(false);
        }
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
        setIsEditing(false);
    };

    const specializationsList = parseList(draft.specializations);
    const accreditationsList = parseList(draft.accreditations);
    const insuranceList = parseList(draft.insuranceAccepted);

    return (
        <SettingsSection
            id="organization"
            title="Organization Details"
            description="Regulatory identifiers and service tags used across your public profile."
            icon={<Building className="h-5 w-5" />}
            actions={
                isEditing ? (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancel} leftIcon={<X className="h-4 w-4" />}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => void handleSave()} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                            Save Changes
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        Edit Organization
                    </Button>
                )
            }
        >
            <div className="space-y-5">
                <StatusMessage status={status} />

                {!isEditing ? (
                    /* ── Read-Only View Mode ── */
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Registration Number</span>
                                <span className="text-gray-800 dark:text-gray-200 font-bold">{draft.registrationNumber || 'Not specified'}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">License Number</span>
                                <span className="text-gray-800 dark:text-gray-200 font-bold">{draft.licenseNumber || 'Not specified'}</span>
                            </div>
                        </div>

                        <div>
                            <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">Specializations</span>
                            {specializationsList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {specializationsList.map((spec) => (
                                        <span key={spec} className="px-2.5 py-1 rounded-lg font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                                            {spec}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">No specializations specified.</p>
                            )}
                        </div>

                        <div>
                            <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">Accreditations & Certifications</span>
                            {accreditationsList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {accreditationsList.map((acc) => (
                                        <span key={acc} className="px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                                            {acc}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">No accreditations added.</p>
                            )}
                        </div>

                        <div>
                            <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">Accepted Insurance Providers</span>
                            {insuranceList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {insuranceList.map((ins) => (
                                        <span key={ins} className="px-2.5 py-1 rounded-lg font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                                            {ins}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">No insurance providers listed.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── Edit Mode ── */
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
                )}
            </div>
        </SettingsSection>
    );
}
