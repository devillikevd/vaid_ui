'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Save, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SettingsSection, StatusMessage, type SectionStatus } from './SettingsSection';
import type { ClinicProfile } from './types';

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

interface VerificationSectionProps {
    clinic: ClinicProfile | null;
    onSave: SaveProfile;
    onDirtyChange: (dirty: boolean) => void;
}

const formatDate = (value: string | null | undefined) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export function VerificationSection({ clinic, onSave, onDirtyChange }: VerificationSectionProps) {
    const [licenseDocumentUrl, setLicenseDocumentUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);

    useEffect(() => {
        if (!clinic) return;
        setLicenseDocumentUrl(clinic.licenseDocumentUrl);
        setStatus(null);
    }, [clinic]);

    const dirty = !!clinic && licenseDocumentUrl !== clinic.licenseDocumentUrl;
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);

    const handleSave = async () => {
        if (!clinic) return;
        setIsSaving(true);
        setStatus(null);
        const result = await onSave(
            { license_document_url: licenseDocumentUrl.trim() || undefined },
            'License document submitted for review.'
        );
        setStatus({ type: result.ok ? 'success' : 'error', message: result.message });
        setIsSaving(false);
    };

    const handleCancel = () => {
        if (clinic) setLicenseDocumentUrl(clinic.licenseDocumentUrl);
        setStatus(null);
    };

    return (
        <SettingsSection
            id="verification"
            title="Documents & Verification"
            description="Verification status and compliance documents for your clinic."
            icon={<ShieldCheck className="h-5 w-5" />}
            badge={<StatusBadge status={clinic?.approvalStatus || 'pending'} size="md" />}
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
            <div className="space-y-4">
                <StatusMessage status={status} />
                {!clinic ? null : clinic.approvalStatus === 'rejected' && clinic.approvalNotes ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <p className="font-medium">Your clinic was rejected</p>
                            <p className="mt-1">{clinic.approvalNotes}</p>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Approval status</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {String(clinic?.approvalStatus || 'pending').replace(/_/g, ' ')}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Approved on</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(clinic?.approvedAt) || '—'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Last updated</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(clinic?.updatedAt) || '—'}
                        </p>
                    </div>
                </div>

                <ComplianceDocumentUpload
                    label="Clinic License Document"
                    providerType="clinic"
                    value={licenseDocumentUrl}
                    onChange={setLicenseDocumentUrl}
                    description="Upload the clinic license or paste a hosted document URL for admin review. Changes resubmit your clinic for approval."
                />
                <p className="text-xs text-gray-400">
                    {clinic?.approvalStatus === 'approved'
                        ? 'You are verified. Editing profile details below may resubmit your clinic for a fresh review.'
                        : 'While pending review, your clinic stays visible to you but may be hidden from public listings.'}
                </p>
            </div>
        </SettingsSection>
    );
}
