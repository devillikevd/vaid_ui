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

    const [isEditing, setIsEditing] = useState(false);

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
        if (result.ok) {
            setIsEditing(false);
        }
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
        setIsEditing(false);
    };

    return (
        <SettingsSection
            id="location"
            title="Location"
            description="Where your clinic is located. Patients see this on the map in the app."
            icon={<MapPin className="h-5 w-5" />}
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
                        Edit Location
                    </Button>
                )
            }
        >
            <div className="space-y-5">
                <StatusMessage status={status} />

                {!isEditing ? (
                    /* ── Read-Only View Mode ── */
                    <div className="space-y-4 text-xs">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2">
                            <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block">Full Address</span>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {draft.address || 'No street address specified'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {[draft.city, draft.state, draft.pincode].filter(Boolean).join(', ') || 'City, State, Pincode not set'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">City / Region</span>
                                <span className="text-gray-800 dark:text-gray-200 font-bold">{draft.city || '—'}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Postal Code (PIN)</span>
                                <span className="text-gray-800 dark:text-gray-200 font-bold">{draft.pincode || '—'}</span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block">GPS Coordinates</span>
                                <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                                    {draft.latitude != null && draft.longitude != null
                                        ? `${draft.latitude.toFixed(5)}° N, ${draft.longitude.toFixed(5)}° E`
                                        : 'Not pinned on map'}
                                </span>
                            </div>
                            {draft.latitude != null && draft.longitude != null && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
                                    Map Pinned
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── Edit Mode ── */
                    <>
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
                    </>
                )}
            </div>
        </SettingsSection>
    );
}
