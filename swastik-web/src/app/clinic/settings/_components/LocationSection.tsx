'use client';

import { useEffect, useState } from 'react';
import { MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { SettingsSection, StatusMessage, type SectionStatus } from './SettingsSection';
import type { ClinicProfile } from './types';

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

interface LocationSectionProps {
    clinic: ClinicProfile | null;
    onSave: SaveProfile;
    onDirtyChange: (dirty: boolean) => void;
}

export function LocationSection({ clinic, onSave, onDirtyChange }: LocationSectionProps) {
    const [draft, setDraft] = useState({
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: null as number | null,
        longitude: null as number | null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);

    useEffect(() => {
        if (!clinic) return;
        setDraft({
            address: clinic.address,
            city: clinic.city,
            state: clinic.state,
            pincode: clinic.pincode,
            latitude: clinic.latitude,
            longitude: clinic.longitude,
        });
        setStatus(null);
    }, [clinic]);

    const baseline = clinic
        ? {
            address: clinic.address,
            city: clinic.city,
            state: clinic.state,
            pincode: clinic.pincode,
            latitude: clinic.latitude,
            longitude: clinic.longitude,
        }
        : null;

    const dirty = !!baseline && JSON.stringify(draft) !== JSON.stringify(baseline);
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);

    const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!draft.address.trim()) {
            setStatus({ type: 'error', message: 'Address is required so patients can find your clinic.' });
            return;
        }
        if (draft.latitude == null || draft.longitude == null) {
            setStatus({ type: 'error', message: 'Pin the clinic location on the map — it helps patients navigate to you.' });
            return;
        }
        setIsSaving(true);
        setStatus(null);
        const result = await onSave(
            {
                address: draft.address.trim(),
                city: draft.city.trim() || undefined,
                state: draft.state.trim() || undefined,
                pincode: draft.pincode.trim() || undefined,
                latitude: draft.latitude,
                longitude: draft.longitude,
            },
            'Clinic location updated!'
        );
        setStatus({ type: result.ok ? 'success' : 'error', message: result.message });
        setIsSaving(false);
    };

    const handleCancel = () => {
        if (clinic) {
            setDraft({
                address: clinic.address,
                city: clinic.city,
                state: clinic.state,
                pincode: clinic.pincode,
                latitude: clinic.latitude,
                longitude: clinic.longitude,
            });
        }
        setStatus(null);
    };

    return (
        <SettingsSection
            id="location"
            title="Location"
            description="Where your clinic is located. Patients see this on the map in the app."
            icon={<MapPin className="h-5 w-5" />}
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
                    <div className="md:col-span-2">
                        <Input
                            label="Address *"
                            value={draft.address}
                            onChange={(e) => set('address', e.target.value)}
                            placeholder="Full street address"
                        />
                    </div>
                    <Input
                        label="City"
                        value={draft.city}
                        onChange={(e) => set('city', e.target.value)}
                        placeholder="City"
                    />
                    <Input
                        label="State"
                        value={draft.state}
                        onChange={(e) => set('state', e.target.value)}
                        placeholder="State"
                    />
                    <Input
                        label="Pincode"
                        value={draft.pincode}
                        onChange={(e) => set('pincode', e.target.value)}
                        placeholder="e.g. 110001"
                        inputMode="numeric"
                    />
                </div>
                <LocationPicker
                    latitude={draft.latitude}
                    longitude={draft.longitude}
                    address={draft.address}
                    onLocationChange={(lat, lng) => {
                        if (lat === 0 && lng === 0) {
                            setDraft((prev) => ({ ...prev, latitude: null, longitude: null }));
                        } else {
                            setDraft((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                        }
                    }}
                    accentColor="teal"
                    label="Clinic Location"
                    height="260px"
                />
                <p className="text-xs text-gray-400">
                    Coordinates saved: {draft.latitude != null ? draft.latitude.toFixed(5) : '—'}, {draft.longitude != null ? draft.longitude.toFixed(5) : '—'}
                </p>
            </div>
        </SettingsSection>
    );
}
