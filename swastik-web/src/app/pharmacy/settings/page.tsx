/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Plus, X, Globe, Calendar, Clock, Image as ImageIcon, Shield, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { pharmacyApi, authApi, uploadApi } from '@/lib/api';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';

const FACILITY_OPTIONS = [
    'Home Delivery', '24x7 Open', 'OTC Medicines', 'Generic Medicines',
    'Compounding', 'Blood Pressure Monitoring', 'Diabetes Care', 'Baby Care',
    'Personal Care', 'Ayurvedic', 'Surgical Items', 'Prescription Delivery',
];

export default function PharmacySettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        licenseNumber: '',
        licenseDocumentUrl: '',
        accreditations: '',
        profileImage: '' as string | null,
        latitude: null as number | null,
        longitude: null as number | null,
        description: '',
        openingHours: '',
        websiteUrl: '',
        establishedYear: '',
        facilities: [] as string[],
        galleryUrls: [] as string[],
        insuranceAccepted: '',
        virtualTourUrl: '',
    });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [galleryUploading, setGalleryUploading] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await pharmacyApi.getProfile();
                if (res.success) {
                    const p = (res.data as any)?.pharmacy || (res.data as any)?.profile || (res.data as any) || {};
                    setProfile({
                        name: p.name || user?.name || '',
                        email: p.email || user?.email || '',
                        phone: p.phone || '',
                        address: p.address || '',
                        licenseNumber: p.license_number || '',
                        licenseDocumentUrl: p.license_document_url || '',
                        accreditations: Array.isArray(p.accreditations) ? p.accreditations.join(', ') : '',
                        profileImage: p.profile_image_url || p.profile_image || p.profileImage || p.image_url || p.avatar_url || null,
                        latitude: p.latitude ?? null,
                        longitude: p.longitude ?? null,
                        description: p.description || '',
                        openingHours: p.opening_hours || '',
                        websiteUrl: p.website_url || '',
                        establishedYear: p.established_year?.toString() || '',
                        facilities: Array.isArray(p.facilities) ? p.facilities : [],
                        galleryUrls: Array.isArray(p.gallery_urls) ? p.gallery_urls : [],
                        insuranceAccepted: Array.isArray(p.insurance_accepted) ? p.insurance_accepted.join(', ') : '',
                        virtualTourUrl: p.virtual_tour_url || '',
                    });
                }
            } catch { /* use defaults */ }
            setIsLoading(false);
        })();
    }, []);

    const toggleFacility = (facility: string) => {
        setProfile(p => ({
            ...p,
            facilities: p.facilities.includes(facility)
                ? p.facilities.filter(f => f !== facility)
                : [...p.facilities, facility],
        }));
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setGalleryUploading(true);
        try {
            for (const file of Array.from(files)) {
                const res = await uploadApi.uploadFile(file, 'pharmacy-gallery');
                if (res.success && res.url) {
                    const url = res.url as string;
                    setProfile(p => ({ ...p, galleryUrls: [...p.galleryUrls, url] }));
                }
            }
        } catch { setSaveStatus({ type: 'error', message: 'Failed to upload gallery image' }); }
        setGalleryUploading(false);
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const removeGalleryImage = (index: number) => {
        setProfile(p => ({ ...p, galleryUrls: p.galleryUrls.filter((_, i) => i !== index) }));
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        const previousApprovalStatus = user?.approval_status;
        if (!profile.phone.trim()) {
            setSaveStatus({ type: 'error', message: 'Phone is required for approval and patient contact.' });
            setIsSaving(false);
            return;
        }
        if (profile.latitude == null || profile.longitude == null) {
            setSaveStatus({ type: 'error', message: 'Location is required so patients can find your pharmacy on map.' });
            setIsSaving(false);
            return;
        }
        try {
            const res = await pharmacyApi.updateProfile({
                name: profile.name, email: profile.email, phone: profile.phone, address: profile.address,
                license_number: profile.licenseNumber.trim() || undefined,
                license_document_url: profile.licenseDocumentUrl.trim() || undefined,
                accreditations: profile.accreditations
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                profile_image_url: profile.profileImage || undefined,
                ...(profile.latitude != null && profile.longitude != null ? { latitude: profile.latitude, longitude: profile.longitude } : {}),
                description: profile.description.trim() || undefined,
                opening_hours: profile.openingHours.trim() || undefined,
                website_url: profile.websiteUrl.trim() || undefined,
                established_year: Number(profile.establishedYear) || undefined,
                facilities: profile.facilities.length > 0 ? profile.facilities : undefined,
                gallery_urls: profile.galleryUrls.length > 0 ? profile.galleryUrls : undefined,
                insurance_accepted: profile.insuranceAccepted
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                virtual_tour_url: profile.virtualTourUrl.trim() || undefined,
            });
            if (res.success) {
                const refreshedUser = await refreshAuthenticatedUser();
                setSaveStatus({
                    type: 'success',
                    message: getResubmissionSuccessMessage(previousApprovalStatus, refreshedUser?.approval_status, 'Pharmacy profile updated!'),
                });
            } else {
                setSaveStatus({ type: 'error', message: res.error || 'Failed to update profile' });
            }
        } catch { setSaveStatus({ type: 'error', message: 'Network error.' }); }
        setIsSaving(false);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) { setSaveStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
        if (passwords.new.length < 6) { setSaveStatus({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
        setIsSaving(true);
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) { setSaveStatus({ type: 'success', message: 'Password changed!' }); setPasswords({ current: '', new: '', confirm: '' }); }
            else { setSaveStatus({ type: 'error', message: (res as any).error || 'Failed' }); }
        } catch { setSaveStatus({ type: 'error', message: 'Network error.' }); }
        setIsSaving(false);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Pharmacy configuration</p></div>

            {saveStatus && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${saveStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{saveStatus.message}</div>
            )}

            {/* Basic Information */}
            <Card>
                <CardHeader><CardTitle>Pharmacy Information</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <ProfileImageUpload
                            currentImage={profile.profileImage}
                            name={profile.name}
                            onUploadComplete={(url) => setProfile(p => ({ ...p, profileImage: url }))}
                            accentColor="orange"
                        />
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name</label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="pharmacy@example.com" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91..." /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label><Input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="Full address" /></div>
                        <LocationPicker
                            latitude={profile.latitude}
                            longitude={profile.longitude}
                            address={profile.address}
                            onLocationChange={(lat, lng) => {
                                if (lat === 0 && lng === 0) {
                                    setProfile(p => ({ ...p, latitude: null, longitude: null }));
                                } else {
                                    setProfile(p => ({ ...p, latitude: lat, longitude: lng }));
                                }
                            }}
                            accentColor="orange"
                            label="Pharmacy Location"
                            height="250px"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* About & Details */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-orange-600" />About & Details</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / About Us</label>
                            <textarea
                                value={profile.description}
                                onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                                placeholder="Tell patients about your pharmacy — its mission, specialties, and what makes it unique..."
                                rows={4}
                                maxLength={2000}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">{profile.description.length}/2000</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Globe className="inline h-4 w-4 mr-1 text-orange-600" />Website URL
                                </label>
                                <Input value={profile.websiteUrl} onChange={e => setProfile(p => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://www.yourpharmacy.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Calendar className="inline h-4 w-4 mr-1 text-orange-600" />Established Year
                                </label>
                                <Input type="number" value={profile.establishedYear} onChange={e => setProfile(p => ({ ...p, establishedYear: e.target.value }))} placeholder="e.g. 1995" min="1800" max={new Date().getFullYear()} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Clock className="inline h-4 w-4 mr-1 text-orange-600" />Opening Hours
                            </label>
                            <Input value={profile.openingHours} onChange={e => setProfile(p => ({ ...p, openingHours: e.target.value }))} placeholder="Mon-Sat: 9:00 AM - 9:00 PM, Sun: 10:00 AM - 2:00 PM" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Facilities */}
            <Card>
                <CardHeader><CardTitle>Facilities & Amenities</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select all facilities available at your pharmacy</p>
                    <div className="flex flex-wrap gap-2">
                        {FACILITY_OPTIONS.map(facility => (
                            <button
                                key={facility}
                                type="button"
                                onClick={() => toggleFacility(facility)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                    profile.facilities.includes(facility)
                                        ? 'bg-orange-600 text-white border-orange-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-400'
                                }`}
                            >
                                {profile.facilities.includes(facility) && '✓ '}{facility}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Premium Features */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-orange-600" />Premium Pharmacy Features</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                360° Virtual Tour URL (Matterport, Kuula, etc.)
                            </label>
                            <Input 
                                value={profile.virtualTourUrl} 
                                onChange={e => setProfile(p => ({ ...p, virtualTourUrl: e.target.value }))} 
                                placeholder="https://my.matterport.com/show/?m=..." 
                            />
                            <p className="text-xs text-gray-500 mt-1">Embedded directly inside the Patient App for premium engagement.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gallery */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-orange-600" />Pharmacy Gallery</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Upload photos of your pharmacy — reception, rooms, OPD area, facilities. Patients see these on the app.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {profile.galleryUrls.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
                                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeGalleryImage(i)}
                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={galleryUploading}
                            className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors text-gray-400 hover:text-orange-600"
                        >
                            {galleryUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                            <span className="text-xs mt-1">{galleryUploading ? 'Uploading...' : 'Add Photo'}</span>
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
                </CardContent>
            </Card>

            {/* Credentials & Compliance */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-orange-600" />Credentials & Compliance</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label><Input value={profile.licenseNumber} onChange={e => setProfile(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="Pharmacy license number" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accreditations</label><Input value={profile.accreditations} onChange={e => setProfile(p => ({ ...p, accreditations: e.target.value }))} placeholder="NABH, ISO 9001, JCI" /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Accepted</label>
                            <Input value={profile.insuranceAccepted} onChange={e => setProfile(p => ({ ...p, insuranceAccepted: e.target.value }))} placeholder="Star Health, ICICI Lombard, Max Bupa, CGHS, ECHS" />
                            <p className="text-xs text-gray-400 mt-1">Comma-separated list of insurance providers accepted</p>
                        </div>
                        <ComplianceDocumentUpload
                            label="Pharmacy License Document"
                            providerType="pharmacy"
                            value={profile.licenseDocumentUrl}
                            onChange={(url) => setProfile((prev) => ({ ...prev, licenseDocumentUrl: url }))}
                            description="Upload the pharmacy license or paste a hosted document URL for admin review."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save All Changes</Button>
            </div>

            {/* Change Password */}
            <Card>
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label><Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label><Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label><Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} /></div>
                        <Button variant="outline" onClick={handleChangePassword} isLoading={isSaving}>Change Password</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
