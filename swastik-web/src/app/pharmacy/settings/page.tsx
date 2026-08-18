'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import {
    Save,
    Loader2,
    MapPin,
    ShieldCheck,
    User,
    Key,
    Palette,
    Store,
    Truck,
    Clock,
    AlertCircle,
    CheckCircle2,
    Edit3,
    X,
    Lock,
    Phone,
    Mail,
    Search,
    ShieldAlert,
    ExternalLink,
    FileText,
    Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { pharmacyApi, authApi } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/components/shared/ThemeProvider';

interface PharmacyProfileState {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
    profileImage: string | null;
    approvalStatus?: string;
    pharmacyId?: string;

    openingHours: string;
    openingTime: string;
    closingTime: string;
    is24Hours: boolean;
    isOpen: boolean;
    offersDelivery: boolean;
    deliveryRadiusKm: string;

    licenseNumber: string;
    drugLicenseNumber: string;
    licenseDocumentUrl: string;
}

const DEFAULT_PROFILE: PharmacyProfileState = {
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
    profileImage: null,
    approvalStatus: 'approved',
    pharmacyId: '',

    openingHours: '',
    openingTime: '',
    closingTime: '',
    is24Hours: false,
    isOpen: true,
    offersDelivery: false,
    deliveryRadiusKm: '',

    licenseNumber: '',
    drugLicenseNumber: '',
    licenseDocumentUrl: '',
};

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isOwner = user?.role === 'pharmacy_owner';
    const { theme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);
    const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'profile');
    const [searchQuery, setSearchQuery] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    // Profile State & Baseline
    const [profile, setProfile] = useState<PharmacyProfileState>(DEFAULT_PROFILE);
    const [originalProfile, setOriginalProfile] = useState<PharmacyProfileState>(DEFAULT_PROFILE);

    // Active Section in Edit Mode (null = ALL READ-ONLY)
    const [activeEditSection, setActiveEditSection] = useState<string | null>(null);
    const [savingSection, setSavingSection] = useState<string | null>(null);

    // Toast Feedback
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Password Form State
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4500);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const cat = searchParams.get('category');
        if (cat) setActiveCategory(cat);
    }, [searchParams]);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setFetchError(false);
        try {
            const res = await pharmacyApi.getProfile();
            if (res.success) {
                const p = (res.data as any)?.pharmacy || (res.data as any)?.profile || (res.data as any) || {};
                const loaded: PharmacyProfileState = {
                    name: p.name || user?.name || '',
                    phone: p.phone || '',
                    email: p.email || user?.email || '',
                    address: p.address || '',
                    city: p.city || '',
                    state: p.state || '',
                    pincode: p.pincode || '',
                    latitude: typeof p.latitude === 'number' ? p.latitude : null,
                    longitude: typeof p.longitude === 'number' ? p.longitude : null,
                    profileImage: p.profile_image_url || p.profile_image || p.image_url || null,
                    approvalStatus: p.approval_status || p.status || 'approved',
                    pharmacyId: p.id || '',

                    openingHours: p.opening_hours || '',
                    openingTime: p.opening_time || '',
                    closingTime: p.closing_time || '',
                    is24Hours: Boolean(p.is_24_hours || p.is24Hours),
                    isOpen: p.is_open !== false,
                    offersDelivery: Boolean(p.offers_delivery || p.delivery_available || p.deliveryAvailable),
                    deliveryRadiusKm: p.delivery_radius_km ? String(p.delivery_radius_km) : '',

                    licenseNumber: p.license_number || p.licenseNumber || '',
                    drugLicenseNumber: p.drug_license_number || p.drugLicenseNumber || '',
                    licenseDocumentUrl: p.license_document_url || p.licenseDocumentUrl || '',
                };
                setProfile(loaded);
                setOriginalProfile(loaded);
            } else {
                setFetchError(true);
            }
        } catch (err) {
            console.error('Failed to load pharmacy profile:', err);
            setFetchError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) loadProfile();
    }, [user, loadProfile]);

    // Handle Field Updates for Draft State
    const handleFieldChange = (key: keyof PharmacyProfileState, value: any) => {
        setProfile((prev) => ({ ...prev, [key]: value }));
    };

    // Begin Editing a Specific Section
    const handleStartEdit = (sectionId: string) => {
        if (activeEditSection && activeEditSection !== sectionId) {
            if (!confirm('You have unsaved changes in another section. Discard them and edit this section?')) {
                return;
            }
            // Restore previous section values
            setProfile(originalProfile);
        }
        setActiveEditSection(sectionId);
    };

    // Cancel Editing a Specific Section
    const handleCancelEdit = (sectionId: string) => {
        // Discard draft changes for this section from original baseline
        setProfile((prev) => ({
            ...prev,
            ...originalProfile,
        }));
        if (sectionId === 'security') {
            setPasswords({ current: '', new: '', confirm: '' });
        }
        setActiveEditSection(null);
    };

    // Save Changes for a Specific Section
    const handleSaveSection = async (sectionId: string) => {
        setSavingSection(sectionId);
        try {
            let payload: Record<string, any> = {};

            if (sectionId === 'identity') {
                if (!profile.name.trim()) throw new Error('Pharmacy name is required.');
                payload = {
                    name: profile.name.trim(),
                    profile_image_url: profile.profileImage || undefined,
                };
            } else if (sectionId === 'contact') {
                if (profile.phone && !/^\+?[0-9\s-]{8,15}$/.test(profile.phone.trim())) {
                    throw new Error('Please enter a valid contact phone number.');
                }
                payload = {
                    phone: profile.phone.trim(),
                };
            } else if (sectionId === 'location') {
                if (profile.pincode && !/^\d{6}$/.test(profile.pincode.trim())) {
                    throw new Error('Pincode must be a 6-digit number.');
                }
                payload = {
                    address: profile.address.trim(),
                    city: profile.city.trim(),
                    state: profile.state.trim(),
                    pincode: profile.pincode.trim(),
                };
                if (profile.latitude != null) payload.latitude = profile.latitude;
                if (profile.longitude != null) payload.longitude = profile.longitude;
            } else if (sectionId === 'hours') {
                payload = {
                    is_24_hours: profile.is24Hours,
                    is_open: profile.isOpen,
                    opening_time: profile.is24Hours ? '' : profile.openingTime,
                    closing_time: profile.is24Hours ? '' : profile.closingTime,
                    opening_hours: profile.openingHours.trim(),
                };
            } else if (sectionId === 'delivery') {
                if (profile.offersDelivery && profile.deliveryRadiusKm && (isNaN(Number(profile.deliveryRadiusKm)) || Number(profile.deliveryRadiusKm) <= 0)) {
                    throw new Error('Delivery radius must be a positive number.');
                }
                payload = {
                    offers_delivery: profile.offersDelivery,
                    delivery_available: profile.offersDelivery,
                    delivery_radius_km: profile.offersDelivery && profile.deliveryRadiusKm ? Number(profile.deliveryRadiusKm) : null,
                };
            } else if (sectionId === 'compliance') {
                payload = {
                    license_number: profile.licenseNumber.trim(),
                    drug_license_number: profile.drugLicenseNumber.trim(),
                    license_document_url: profile.licenseDocumentUrl || undefined,
                };
            }

            const res = await pharmacyApi.updateProfile(payload);
            if (res.success) {
                showFeedback('Settings updated successfully.');
                setOriginalProfile({ ...profile });
                setActiveEditSection(null);
            } else {
                showFeedback(res.message || 'Unable to save changes. Please try again.', 'error');
            }
        } catch (err: unknown) {
            console.error(`Save error on section ${sectionId}:`, err);
            showFeedback((err as Error).message || 'Unable to save changes. Please try again.', 'error');
        } finally {
            setSavingSection(null);
        }
    };

    // Save Password
    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwords.current) {
            showFeedback('Current password is required.', 'error');
            return;
        }
        if (passwords.new.length < 6) {
            showFeedback('New password must be at least 6 characters.', 'error');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            showFeedback('New passwords do not match.', 'error');
            return;
        }

        setSavingSection('security');
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) {
                showFeedback('Password updated successfully.');
                setPasswords({ current: '', new: '', confirm: '' });
                setActiveEditSection(null);
            } else {
                showFeedback((res as any)?.message || (res as any)?.error || 'Failed to update password.', 'error');
            }
        } catch (err: unknown) {
            showFeedback((err as Error).message || 'Unable to update password. Please try again.', 'error');
        } finally {
            setSavingSection(null);
        }
    };

    // Switch Category Navigation
    const handleCategorySelect = (category: string) => {
        if (activeEditSection) {
            if (!confirm('You have unsaved changes. Discard them and switch tabs?')) return;
            setProfile(originalProfile);
            setActiveEditSection(null);
        }
        setActiveCategory(category);
        router.replace(`/pharmacy/settings?category=${category}`);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                <p className="text-sm font-medium text-gray-500">Loading settings...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Store className="w-12 h-12 text-gray-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Unable to load settings</h2>
                <p className="text-sm text-gray-500 max-w-sm text-center">
                    There was a problem communicating with the server. Please check your connection and try again.
                </p>
                <Button onClick={loadProfile} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                    Retry
                </Button>
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 w-16 h-16 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Restricted</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pharmacy profile and operational settings are restricted to the <strong>Pharmacy Owner</strong>.
                </p>
                <div className="pt-2">
                    <Link href="/pharmacy/dashboard">
                        <Button variant="primary">Return to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const navCategories = [
        { id: 'profile', label: 'Profile & Location', icon: User, desc: 'Pharmacy identity, contacts and storefront location' },
        { id: 'operations', label: 'Operations & Delivery', icon: Truck, desc: 'Store opening hours and home delivery radius' },
        { id: 'compliance', label: 'Licensing & Compliance', icon: ShieldCheck, desc: 'Pharmacy drug licenses and verification' },
        { id: 'security', label: 'Security', icon: Key, desc: 'Password and account credentials' },
        { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme and visual preferences' },
    ];

    const filteredNav = navCategories.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()));
    const activeNav = navCategories.find((c) => c.id === activeCategory) || navCategories[0];
    const ActiveIcon = activeNav.icon;

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-in fade-in duration-300">
            {/* Feedback Alert */}
            {feedback && (
                <div
                    className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-lg border flex items-center gap-2.5 text-sm font-medium animate-in slide-in-from-bottom-3 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                    }`}
                >
                    {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your pharmacy profile, operational parameters, licenses, and account preferences.
                    </p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search settings..."
                        className="pl-9 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-xs"
                    />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-72 shrink-0">
                    <div className="sticky top-24 space-y-1">
                        <div className="px-3 pb-3">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Settings Categories
                            </p>
                        </div>
                        {filteredNav.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all group ${
                                    activeCategory === cat.id
                                        ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-semibold'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                            activeCategory === cat.id
                                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                                        }`}
                                    >
                                        <cat.icon className="w-4 h-4 shrink-0" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold">{cat.label}</p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{cat.desc}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 space-y-6">
                    {/* Category Header Banner */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                            <ActiveIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{activeNav.label}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activeNav.desc}</p>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* CATEGORY 1: PROFILE & LOCATION                                            */}
                    {/* ========================================================================= */}
                    {activeCategory === 'profile' && (
                        <div className="space-y-6">
                            {/* SECTION 1.1: Pharmacy Identity */}
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Store className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Pharmacy Identity
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'identity' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('identity')}
                                                    disabled={savingSection === 'identity'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('identity')}
                                                    disabled={savingSection === 'identity'}
                                                    leftIcon={savingSection === 'identity' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'identity' ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('identity')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Pharmacy Identity"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'identity' ? (
                                        /* EDIT MODE: Identity */
                                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                                            <div className="shrink-0 flex flex-col items-center gap-2">
                                                <ProfileImageUpload
                                                    currentImage={profile.profileImage}
                                                    name={profile.name}
                                                    onUploadComplete={(url: string) => handleFieldChange('profileImage', url)}
                                                    accentColor="orange"
                                                />
                                                <span className="text-[11px] text-gray-400">Click to upload new logo</span>
                                            </div>
                                            <div className="flex-1 w-full space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Pharmacy Display Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        value={profile.name}
                                                        onChange={(e) => handleFieldChange('name', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                        placeholder="e.g. MedStore Koramangala"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Identity */
                                        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                                            <div className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                                                {profile.profileImage ? (
                                                    <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-3 text-center sm:text-left">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Pharmacy Name</p>
                                                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                                                        {profile.name || 'Unnamed Pharmacy'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                                                        <Check className="w-3 h-3" /> Approved Facility
                                                    </span>
                                                    {profile.pharmacyId && (
                                                        <span className="text-[11px] text-gray-400 font-mono">
                                                            ID: {profile.pharmacyId.slice(0, 8)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* SECTION 1.2: Contact Information */}
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Contact Information
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'contact' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('contact')}
                                                    disabled={savingSection === 'contact'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('contact')}
                                                    disabled={savingSection === 'contact'}
                                                    leftIcon={savingSection === 'contact' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'contact' ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('contact')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Contact Information"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'contact' ? (
                                        /* EDIT MODE: Contact */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    Contact Phone Number
                                                </label>
                                                <Input
                                                    value={profile.phone}
                                                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                    placeholder="+91 98765 43210"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Email Address
                                                    </label>
                                                    <span className="text-[10px] text-gray-400 font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800">
                                                        Read only
                                                    </span>
                                                </div>
                                                <Input
                                                    value={profile.email}
                                                    readOnly
                                                    disabled
                                                    className="h-10 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-700"
                                                />
                                                <p className="text-[10px] text-gray-400">Account login email cannot be edited directly.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Contact */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Contact Phone</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.phone || <span className="text-gray-400 italic">Not provided</span>}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Account Email</p>
                                                    <span className="text-[10px] text-gray-400 font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                                                        Read only
                                                    </span>
                                                </div>
                                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.email || <span className="text-gray-400 italic">Not provided</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* SECTION 1.3: Storefront Location */}
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Address & Location Details
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'location' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('location')}
                                                    disabled={savingSection === 'location'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('location')}
                                                    disabled={savingSection === 'location'}
                                                    leftIcon={savingSection === 'location' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'location' ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('location')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Location Details"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'location' ? (
                                        /* EDIT MODE: Location */
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Street Address</label>
                                                <Input
                                                    value={profile.address}
                                                    onChange={(e) => handleFieldChange('address', e.target.value)}
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                    placeholder="Shop No, Building, Street name"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
                                                    <Input
                                                        value={profile.city}
                                                        onChange={(e) => handleFieldChange('city', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">State</label>
                                                    <Input
                                                        value={profile.state}
                                                        onChange={(e) => handleFieldChange('state', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pincode</label>
                                                    <Input
                                                        value={profile.pincode}
                                                        onChange={(e) => handleFieldChange('pincode', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                        placeholder="6-digit pincode"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 pt-2">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Map Pinpoint (GPS)</label>
                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-[260px]">
                                                    <LocationPicker
                                                        latitude={profile.latitude}
                                                        longitude={profile.longitude}
                                                        onLocationChange={(lat: number, lng: number) => {
                                                            handleFieldChange('latitude', lat);
                                                            handleFieldChange('longitude', lng);
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-gray-400">Drag pin to calibrate exact store front for dispatch routing.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Location */
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 sm:col-span-2">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Full Address</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                                        {profile.address
                                                            ? `${profile.address}, ${profile.city}, ${profile.state} - ${profile.pincode}`
                                                            : <span className="text-gray-400 italic">No street address configured</span>}
                                                    </p>
                                                </div>
                                                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">City & State</p>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                                        {profile.city && profile.state ? `${profile.city}, ${profile.state}` : <span className="text-gray-400 italic">Not provided</span>}
                                                    </p>
                                                </div>
                                                <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">GPS Coordinates</p>
                                                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                                                        {profile.latitude != null && profile.longitude != null
                                                            ? `${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)}`
                                                            : <span className="text-gray-400 italic">Not set</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CATEGORY 2: OPERATIONS & DELIVERY                                         */}
                    {/* ========================================================================= */}
                    {activeCategory === 'operations' && (
                        <div className="space-y-6">
                            {/* SECTION 2.1: Operating Hours */}
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Store Schedule & Operating Hours
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'hours' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('hours')}
                                                    disabled={savingSection === 'hours'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('hours')}
                                                    disabled={savingSection === 'hours'}
                                                    leftIcon={savingSection === 'hours' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'hours' ? 'Saving...' : 'Save Hours'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('hours')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Operating Hours"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'hours' ? (
                                        /* EDIT MODE: Hours */
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <label className={`flex items-center gap-3.5 p-3.5 border rounded-xl cursor-pointer transition-colors ${profile.is24Hours ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.is24Hours}
                                                        onChange={(e) => handleFieldChange('is24Hours', e.target.checked)}
                                                        className="rounded text-orange-600 focus:ring-orange-500"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Open 24/7</p>
                                                        <p className="text-[10px] text-gray-500">Pharmacy operates continuously</p>
                                                    </div>
                                                </label>

                                                <label className={`flex items-center gap-3.5 p-3.5 border rounded-xl cursor-pointer transition-colors ${profile.isOpen ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={profile.isOpen}
                                                        onChange={(e) => handleFieldChange('isOpen', e.target.checked)}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Currently Open</p>
                                                        <p className="text-[10px] text-gray-500">Live operational status toggle</p>
                                                    </div>
                                                </label>
                                            </div>

                                            {!profile.is24Hours && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Daily Opening Time</label>
                                                        <Input
                                                            type="time"
                                                            value={profile.openingTime}
                                                            onChange={(e) => handleFieldChange('openingTime', e.target.value)}
                                                            className="h-10 text-xs rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Daily Closing Time</label>
                                                        <Input
                                                            type="time"
                                                            value={profile.closingTime}
                                                            onChange={(e) => handleFieldChange('closingTime', e.target.value)}
                                                            className="h-10 text-xs rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Schedule Description (Optional)</label>
                                                <Input
                                                    value={profile.openingHours}
                                                    onChange={(e) => handleFieldChange('openingHours', e.target.value)}
                                                    placeholder="e.g. Mon-Sat: 9:00 AM - 10:00 PM, Sunday: Closed"
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Hours */
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Live Store Status</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${profile.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {profile.isOpen ? 'Open Now' : 'Temporarily Closed'}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">24/7 Continuous</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.is24Hours ? 'Yes (Open 24 Hours)' : 'No (Standard Schedule)'}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Daily Working Hours</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.is24Hours
                                                        ? 'Continuous 24 Hours'
                                                        : profile.openingTime && profile.closingTime
                                                        ? `${profile.openingTime} - ${profile.closingTime}`
                                                        : profile.openingHours || <span className="text-gray-400 italic">Not set</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* SECTION 2.2: Delivery Settings */}
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Home Delivery Fulfillment
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'delivery' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('delivery')}
                                                    disabled={savingSection === 'delivery'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('delivery')}
                                                    disabled={savingSection === 'delivery'}
                                                    leftIcon={savingSection === 'delivery' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'delivery' ? 'Saving...' : 'Save Settings'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('delivery')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Delivery Settings"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'delivery' ? (
                                        /* EDIT MODE: Delivery */
                                        <div className="space-y-4">
                                            <label className={`flex items-start gap-3.5 p-4 border rounded-xl cursor-pointer transition-colors ${profile.offersDelivery ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={profile.offersDelivery}
                                                    onChange={(e) => handleFieldChange('offersDelivery', e.target.checked)}
                                                    className="rounded text-orange-600 focus:ring-orange-500 mt-1"
                                                />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Enable Home Delivery</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        Allow patients to place online doorstep medicine delivery orders.
                                                    </p>
                                                </div>
                                            </label>

                                            {profile.offersDelivery && (
                                                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 max-w-xs space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Maximum Delivery Radius (KM)
                                                    </label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.5"
                                                            value={profile.deliveryRadiusKm}
                                                            onChange={(e) => handleFieldChange('deliveryRadiusKm', e.target.value)}
                                                            className="h-10 text-xs rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 pr-10"
                                                            placeholder="e.g. 5"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">km</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Delivery */
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Delivery Capability</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.offersDelivery ? 'Enabled (Accepting Orders)' : 'Disabled (In-Store Pickup Only)'}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fulfillment Radius</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.offersDelivery && profile.deliveryRadiusKm
                                                        ? `${profile.deliveryRadiusKm} KM from storefront`
                                                        : <span className="text-gray-400 italic">No delivery limit specified</span>}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CATEGORY 3: LICENSING & COMPLIANCE                                        */}
                    {/* ========================================================================= */}
                    {activeCategory === 'compliance' && (
                        <div className="space-y-6">
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Pharmacy Licensing & Regulatory Compliance
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection === 'compliance' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('compliance')}
                                                    disabled={savingSection === 'compliance'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleSaveSection('compliance')}
                                                    disabled={savingSection === 'compliance'}
                                                    leftIcon={savingSection === 'compliance' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'compliance' ? 'Saving...' : 'Save Licenses'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('compliance')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Edit Licensing"
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6 space-y-6">
                                    {activeEditSection === 'compliance' ? (
                                        /* EDIT MODE: Compliance */
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        General Pharmacy License Number
                                                    </label>
                                                    <Input
                                                        value={profile.licenseNumber}
                                                        onChange={(e) => handleFieldChange('licenseNumber', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                        placeholder="e.g. DL-KA-2024-8849"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        Drug License Number (Form 20/21)
                                                    </label>
                                                    <Input
                                                        value={profile.drugLicenseNumber}
                                                        onChange={(e) => handleFieldChange('drugLicenseNumber', e.target.value)}
                                                        className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                        placeholder="e.g. DL-20B-991"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <ComplianceDocumentUpload
                                                    label="Pharmacy License Document"
                                                    providerType="pharmacy"
                                                    value={profile.licenseDocumentUrl}
                                                    onChange={(url: string) => handleFieldChange('licenseDocumentUrl', url)}
                                                    description="Upload PDF or clear image scan of state pharmacy council certificate."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        /* READ-ONLY MODE: Compliance */
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Pharmacy License</p>
                                                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.licenseNumber || <span className="text-gray-400 italic font-sans">Not provided</span>}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Drug License (20/21)</p>
                                                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.drugLicenseNumber || <span className="text-gray-400 italic font-sans">Not provided</span>}
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Certificate Document</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                                    {profile.licenseDocumentUrl ? (
                                                        <a
                                                            href={profile.licenseDocumentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 font-semibold text-xs"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" /> View Uploaded Document
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No document uploaded</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CATEGORY 4: SECURITY                                                      */}
                    {/* ========================================================================= */}
                    {activeCategory === 'security' && (
                        <div className="space-y-6">
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Key className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Account Security & Password
                                        </h3>
                                    </div>
                                    <div>
                                        {activeEditSection !== 'security' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit('security')}
                                                leftIcon={<Edit3 className="h-3.5 w-3.5 text-orange-500" />}
                                                aria-label="Change Password"
                                            >
                                                Change Password
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    {activeEditSection === 'security' ? (
                                        /* EDIT MODE: Password */
                                        <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    Current Password <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    type="password"
                                                    required
                                                    value={passwords.current}
                                                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    New Password <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    type="password"
                                                    required
                                                    value={passwords.new}
                                                    onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                    placeholder="Minimum 6 characters"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    Confirm New Password <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    type="password"
                                                    required
                                                    value={passwords.confirm}
                                                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                                                    className="h-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelEdit('security')}
                                                    disabled={savingSection === 'security'}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="primary"
                                                    disabled={savingSection === 'security'}
                                                    leftIcon={savingSection === 'security' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                                                >
                                                    {savingSection === 'security' ? 'Updating...' : 'Update Password'}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        /* READ-ONLY MODE: Password */
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 max-w-lg">
                                            <div>
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Account Password</p>
                                                <p className="text-sm font-mono text-gray-400 mt-0.5">••••••••••••</p>
                                            </div>
                                            <span className="text-[11px] text-gray-400">Encrypted</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* CATEGORY 5: APPEARANCE                                                    */}
                    {/* ========================================================================= */}
                    {activeCategory === 'appearance' && (
                        <div className="space-y-6">
                            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Palette className="w-4 h-4 text-orange-500" />
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                            Theme & Display Mode
                                        </h3>
                                    </div>
                                </div>

                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {(['light', 'dark', 'system'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={`p-4 rounded-xl border text-left transition-all ${
                                                    theme === t
                                                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/20'
                                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <p className="text-xs font-bold capitalize">{t} Mode</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {t === 'light'
                                                        ? 'Clean bright interface'
                                                        : t === 'dark'
                                                        ? 'Low-glare dark console'
                                                        : 'Follows operating system'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default function PharmacySettingsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                </div>
            }
        >
            <SettingsContent />
        </Suspense>
    );
}
