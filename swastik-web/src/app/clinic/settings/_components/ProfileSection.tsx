'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Calendar, Check, Clock, Globe, Image as ImageIcon, Loader2, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { uploadApi } from '@/lib/api';
import { SettingsSection, StatusMessage, type SectionStatus } from './SettingsSection';
import type { ClinicProfile } from './types';

export const FACILITY_OPTIONS = [
    'Parking', 'Pharmacy', 'Canteen', 'Wheelchair Access', 'ICU',
    'NICU', 'Blood Bank', 'Ambulance', 'Wi-Fi', 'Waiting Lounge',
    'Lab', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Dialysis',
    'Operation Theatre', 'Ventilator', 'Oxygen Supply', 'Elevator',
];

type SaveProfile = (fields: Record<string, unknown>, successMessage: string) => Promise<{
    ok: boolean;
    message: string;
    next: ClinicProfile | null;
}>;

interface ProfileSectionProps {
    clinic: ClinicProfile | null;
    onSave: SaveProfile;
    onDirtyChange: (dirty: boolean) => void;
}

export function ProfileSection({ clinic, onSave, onDirtyChange }: ProfileSectionProps) {
    const [draft, setDraft] = useState({
        name: '',
        email: '',
        phone: '',
        websiteUrl: '',
        establishedYear: '',
        description: '',
        facilities: [] as string[],
        galleryUrls: [] as string[],
        virtualTourUrl: '',
        is24Hours: false,
        profileImageUrl: null as string | null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);
    const [galleryUploading, setGalleryUploading] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!clinic) return;
        setDraft({
            name: clinic.name,
            email: clinic.email,
            phone: clinic.phone,
            websiteUrl: clinic.websiteUrl,
            establishedYear: clinic.establishedYear,
            description: clinic.description,
            facilities: clinic.facilities,
            galleryUrls: clinic.galleryUrls,
            virtualTourUrl: clinic.virtualTourUrl,
            is24Hours: clinic.is24Hours,
            profileImageUrl: clinic.profileImageUrl,
        });
        setStatus(null);
    }, [clinic]);

    const baseline = clinic
        ? {
            name: clinic.name,
            email: clinic.email,
            phone: clinic.phone,
            websiteUrl: clinic.websiteUrl,
            establishedYear: clinic.establishedYear,
            description: clinic.description,
            facilities: clinic.facilities,
            galleryUrls: clinic.galleryUrls,
            virtualTourUrl: clinic.virtualTourUrl,
            is24Hours: clinic.is24Hours,
            profileImageUrl: clinic.profileImageUrl,
        }
        : null;

    const dirty = !!baseline && JSON.stringify(draft) !== JSON.stringify(baseline);
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);

    const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const toggleFacility = (facility: string) => {
        setDraft((prev) => ({
            ...prev,
            facilities: prev.facilities.includes(facility)
                ? prev.facilities.filter((f) => f !== facility)
                : [...prev.facilities, facility],
        }));
    };

    const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setGalleryUploading(true);
        setStatus(null);
        try {
            for (const file of Array.from(files)) {
                const res = await uploadApi.uploadFile(file, 'clinic-gallery');
                const url = (res as any).url || (res as any).data?.url || (res as any).data?.storageUrl || (res as any).storageUrl || '';
                if (res.success && url) {
                    setDraft((prev) => ({ ...prev, galleryUrls: [...prev.galleryUrls, String(url)] }));
                }
            }
        } catch {
            setStatus({ type: 'error', message: 'Failed to upload gallery image.' });
        }
        setGalleryUploading(false);
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const removeGalleryImage = (index: number) => {
        setDraft((prev) => ({ ...prev, galleryUrls: prev.galleryUrls.filter((_, i) => i !== index) }));
    };

    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async () => {
        if (!draft.name.trim()) {
            setStatus({ type: 'error', message: 'Clinic name is required.' });
            return;
        }
        if (!draft.phone.trim()) {
            setStatus({ type: 'error', message: 'Phone number is required.' });
            return;
        }
        setIsSaving(true);
        setStatus(null);
        const result = await onSave(
            {
                name: draft.name.trim(),
                email: draft.email.trim() || undefined,
                phone: draft.phone.trim(),
                website_url: draft.websiteUrl.trim() || undefined,
                established_year: Number(draft.establishedYear) || undefined,
                description: draft.description.trim() || undefined,
                facilities: draft.facilities.length > 0 ? draft.facilities : undefined,
                gallery_urls: draft.galleryUrls.length > 0 ? draft.galleryUrls : undefined,
                virtual_tour_url: draft.virtualTourUrl.trim() || undefined,
                is_24_hours: draft.is24Hours,
                profile_image_url: draft.profileImageUrl || undefined,
            },
            'Clinic profile updated!'
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
                name: clinic.name,
                email: clinic.email,
                phone: clinic.phone,
                websiteUrl: clinic.websiteUrl,
                establishedYear: clinic.establishedYear,
                description: clinic.description,
                facilities: clinic.facilities,
                galleryUrls: clinic.galleryUrls,
                virtualTourUrl: clinic.virtualTourUrl,
                is24Hours: clinic.is24Hours,
                profileImageUrl: clinic.profileImageUrl,
            });
        }
        setStatus(null);
        setIsEditing(false);
    };

    return (
        <SettingsSection
            id="profile"
            title="Clinic Profile"
            description="Public name, contact details, about text and media shown to patients."
            icon={<Building2 className="h-5 w-5" />}
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
                        Edit Profile
                    </Button>
                )
            }
        >
            <div className="space-y-5">
                <StatusMessage status={status} />

                {!isEditing ? (
                    /* ── Read-Only View Mode ── */
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                            {draft.profileImageUrl ? (
                                <img src={draft.profileImageUrl} alt={draft.name} className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-700" />
                            ) : (
                                <div className="h-16 w-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-xl">
                                    {draft.name?.slice(0, 2).toUpperCase() || 'CL'}
                                </div>
                            )}
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {draft.name || 'Untitled Clinic'}
                                    {draft.is24Hours && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            24/7 Open
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {draft.email || 'No email provided'} • {draft.phone || 'No phone provided'}
                                </p>
                                {draft.websiteUrl && (
                                    <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                                        {draft.websiteUrl}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Established</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{draft.establishedYear || 'Not specified'}</span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Operating Model</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{draft.is24Hours ? '24 Hours / Round the clock' : 'Standard Scheduled Hours'}</span>
                            </div>
                        </div>

                        {draft.description && (
                            <div>
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">About Clinic</span>
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                    {draft.description}
                                </p>
                            </div>
                        )}

                        <div>
                            <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-1.5">Facilities & Amenities</span>
                            {draft.facilities && draft.facilities.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {draft.facilities.map((fac) => (
                                        <span key={fac} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-300 border border-pink-100 dark:border-pink-900/40">
                                            {fac}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No facilities added yet.</p>
                            )}
                        </div>

                        {draft.galleryUrls && draft.galleryUrls.length > 0 && (
                            <div>
                                <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px] block mb-2">Clinic Gallery ({draft.galleryUrls.length} photos)</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {draft.galleryUrls.map((url, i) => (
                                        <div key={i} className="aspect-video overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                                            <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Edit Mode ── */
                    <>
                        <ProfileImageUpload
                            currentImage={draft.profileImageUrl}
                            name={draft.name}
                            onUploadComplete={(url) => set('profileImageUrl', url)}
                            accentColor="pink"
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                label="Clinic Name *"
                                value={draft.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="e.g. Swastik Multispeciality Clinic"
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={draft.email}
                                onChange={(e) => set('email', e.target.value)}
                                placeholder="clinic@example.com"
                            />
                            <Input
                                label="Phone *"
                                value={draft.phone}
                                onChange={(e) => set('phone', e.target.value)}
                                placeholder="+91 98765 43210"
                            />
                            <Input
                                label="Website URL"
                                value={draft.websiteUrl}
                                onChange={(e) => set('websiteUrl', e.target.value)}
                                placeholder="https://www.yourclinic.com"
                                leftIcon={<Globe className="h-4 w-4" />}
                            />
                            <Input
                                label="Established Year"
                                type="number"
                                value={draft.establishedYear}
                                onChange={(e) => set('establishedYear', e.target.value)}
                                placeholder="e.g. 1995"
                                min={1800}
                                max={new Date().getFullYear()}
                                leftIcon={<Calendar className="h-4 w-4" />}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                                About / Description
                            </label>
                            <textarea
                                value={draft.description}
                                onChange={(e) => set('description', e.target.value)}
                                placeholder="Tell patients about your clinic — its mission, specialties, and what makes it unique..."
                                rows={4}
                                maxLength={2000}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">{draft.description.length}/2000</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                                Facilities & Amenities
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select all facilities available at your clinic.</p>
                            <div className="flex flex-wrap gap-2">
                                {FACILITY_OPTIONS.map((facility) => {
                                    const selected = draft.facilities.includes(facility);
                                    return (
                                        <button
                                            key={facility}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => toggleFacility(facility)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                                                selected
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                                            }`}
                                        >
                                            {selected && <Check className="h-3.5 w-3.5" />}
                                            {facility}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                                360° Virtual Tour URL
                            </label>
                            <Input
                                value={draft.virtualTourUrl}
                                onChange={(e) => set('virtualTourUrl', e.target.value)}
                                placeholder="https://my.matterport.com/show/?m=..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Embedded inside the patient app for premium engagement.</p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Open 24 Hours</p>
                                <p className="text-xs text-gray-500 mt-0.5">Toggle if your clinic operates round the clock</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={draft.is24Hours}
                                aria-label="Open 24 hours"
                                onClick={() => set('is24Hours', !draft.is24Hours)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    draft.is24Hours ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        draft.is24Hours ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5">
                                <ImageIcon className="h-4 w-4 text-primary-600" />
                                Clinic Gallery
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                Photos of your clinic — reception, rooms, OPD area, facilities.
                            </p>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {draft.galleryUrls.map((url, i) => (
                                    <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                        <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            aria-label="Remove image"
                                            onClick={() => removeGalleryImage(i)}
                                            className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    disabled={galleryUploading}
                                    className="flex aspect-video flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 transition-colors hover:border-primary-500 hover:text-primary-600"
                                >
                                    {galleryUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                                    <span className="mt-1 text-xs">{galleryUploading ? 'Uploading...' : 'Add Photo'}</span>
                                </button>
                            </div>
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleGalleryUpload}
                                className="hidden"
                            />
                        </div>
                    </>
                )}
            </div>
        </SettingsSection>
    );
}
