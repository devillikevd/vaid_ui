'use client';

import { useState, useEffect } from 'react';
import {
    Save, Loader2, Building2, MapPin, Clock, ShieldCheck, Edit2, X, Plus,
    CheckCircle2, Truck, Shield, Lock, Phone, Mail, Globe, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { diagnosticCenterApi, authApi } from '@/lib/api';
import { refreshAuthenticatedUser } from '@/lib/authSession';
import { cn } from '@/lib/utils';
import { SettingsNavigation } from '@/components/shared/settings/SettingsNavigation';
import { EmptyValue } from '@/components/shared/settings/EmptyValue';

/* ─── Nav categories ──────────────────────────────────────────── */
const NAV_CATEGORIES = [
    {
        name: 'CENTER',
        items: [
            { id: 'profile',    label: 'Center Profile',              icon: Building2  },
            { id: 'location',   label: 'Contact & Location',          icon: MapPin     },
        ],
    },
    {
        name: 'OPERATIONS',
        items: [
            { id: 'operations',       label: 'Operations',       icon: Clock  },
            { id: 'home-collection',  label: 'Home Collection',  icon: Truck  },
        ],
    },
    {
        name: 'COMPLIANCE',
        items: [
            { id: 'compliance', label: 'Registration & Accreditation', icon: ShieldCheck },
        ],
    },
    {
        name: 'ACCOUNT',
        items: [
            { id: 'security', label: 'Security', icon: Shield },
        ],
    },
];

/* ─── Reusable sub-components ─────────────────────────────────── */

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            'bg-white dark:bg-[#0B1020] rounded-2xl border border-gray-200 dark:border-gray-700/70 dark:border-gray-800/60 shadow-md shadow-gray-200/40 dark:shadow-none overflow-hidden',
            className
        )}>
            {children}
        </div>
    );
}

/** Section header row: icon + title/description + action buttons */
function SectionHeader({
    icon: Icon,
    title,
    description,
    accentBg,
    accentText,
    actions,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    accentBg: string;
    accentText: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn('p-2 rounded-xl shrink-0', accentBg)}>
                    <Icon className={cn('h-4 w-4', accentText)} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-tight">{title}</h2>
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Compact field label + value display */
function FieldView({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value || <EmptyValue />}</p>
        </div>
    );
}

/** Edit / Save-Cancel button set */
function EditButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className="h-8 gap-1.5 rounded-lg border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 shadow-none font-medium transition-colors"
        >
            <Edit2 className="h-3 w-3" /> Edit
        </Button>
    );
}

function SaveCancelButtons({
    onSave,
    onCancel,
    isSaving,
}: {
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    return (
        <>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving} className="h-8 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300">
                Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm font-medium">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
        </>
    );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function DiagnosticSettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [originalProfile, setOriginalProfile] = useState<any>(null);

    const [profileForm, setProfileForm] = useState({
        name: '', description: '', profile_image: '' as string | null,
    });
    const [complianceForm, setComplianceForm] = useState({
        registration_number: '', license_number: '', nabl_accreditation: '', accreditations: [] as string[],
    });
    const [locationForm, setLocationForm] = useState({
        email: '', phone: '', emergency_phone: '', website: '',
        address: '', city: '', state: '', pincode: '',
        latitude: null as number | null, longitude: null as number | null,
    });
    const [operationsForm, setOperationsForm] = useState({ is_24_hours: false });
    const [homeCollectionForm, setHomeCollectionForm] = useState({
        home_collection_available: false, home_collection_fee: '',
    });
    const [securityForm, setSecurityForm] = useState({ current: '', new: '', confirm: '' });

    const [editMode, setEditMode] = useState({
        profile: false, compliance: false, location: false,
        operations: false, homeCollection: false, security: false,
    });
    const [activeSection, setActiveSection] = useState('profile');
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [newAccreditation, setNewAccreditation] = useState('');
    const [imgError, setImgError] = useState(false);

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const res = await diagnosticCenterApi.getProfile();
            if (res.success && res.data) {
                setOriginalProfile(res.data);
                syncForms(res.data);
            }
        } catch { /* silent */ }
        setIsLoading(false);
    };

    const syncForms = (p: any) => {
        setImgError(false);
        setProfileForm({
            name: p.name || '',
            description: p.description || '',
            profile_image: p.profile_image_url || p.profile_image || p.image_url || null,
        });
        setComplianceForm({
            registration_number: p.registration_number || '',
            license_number: p.license_number || '',
            nabl_accreditation: p.nabl_accreditation || '',
            accreditations: Array.isArray(p.accreditations) ? p.accreditations : [],
        });
        setLocationForm({
            email: p.email || '', phone: p.phone || '',
            emergency_phone: p.emergency_phone || '', website: p.website || '',
            address: p.address || '', city: p.city || '',
            state: p.state || '', pincode: p.pincode || '',
            latitude: p.latitude ?? null, longitude: p.longitude ?? null,
        });
        setOperationsForm({ is_24_hours: !!p.is_24_hours });
        setHomeCollectionForm({
            home_collection_available: !!p.home_collection_available,
            home_collection_fee: p.home_collection_fee?.toString() || '0',
        });
        setSecurityForm({ current: '', new: '', confirm: '' });
    };

    const handleCancel = (section: keyof typeof editMode) => {
        setEditMode(p => ({ ...p, [section]: false }));
        if (originalProfile) syncForms(originalProfile);
    };

    const saveUpdates = async (section: string, payload: any) => {
        setSavingSection(section);
        setSaveStatus(null);
        try {
            const res = await diagnosticCenterApi.updateProfile(payload);
            if (res.success) {
                setSaveStatus({ type: 'success', message: 'Changes saved successfully.' });
                setOriginalProfile(res.data);
                syncForms(res.data);
                setEditMode(p => ({ ...p, [section]: false }));
                refreshAuthenticatedUser();
            } else {
                setSaveStatus({ type: 'error', message: res.error || 'Unable to save changes.' });
            }
        } catch {
            setSaveStatus({ type: 'error', message: 'Network error. Unable to save changes.' });
        }
        setSavingSection(null);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    const saveProfile     = () => saveUpdates('profile',     { name: profileForm.name, description: profileForm.description, profile_image_url: profileForm.profile_image });
    const saveCompliance  = () => saveUpdates('compliance',  { registration_number: complianceForm.registration_number, license_number: complianceForm.license_number, nabl_accreditation: complianceForm.nabl_accreditation, accreditations: complianceForm.accreditations });
    const saveLocation    = () => saveUpdates('location',    { email: locationForm.email, phone: locationForm.phone, emergency_phone: locationForm.emergency_phone, website: locationForm.website, address: locationForm.address, city: locationForm.city, state: locationForm.state, pincode: locationForm.pincode, latitude: locationForm.latitude, longitude: locationForm.longitude });
    const saveOperations  = () => saveUpdates('operations',  { is_24_hours: operationsForm.is_24_hours });
    const saveHomeCollection = () => saveUpdates('homeCollection', { home_collection_available: homeCollectionForm.home_collection_available, home_collection_fee: Number(homeCollectionForm.home_collection_fee) || 0 });

    const saveSecurity = async () => {
        setSaveStatus(null);
        if (securityForm.new !== securityForm.confirm) { setSaveStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
        if (securityForm.new.length < 6) { setSaveStatus({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
        setSavingSection('security');
        try {
            const res = await authApi.changePassword(securityForm.current, securityForm.new);
            if (res.success) {
                setSaveStatus({ type: 'success', message: 'Password changed successfully!' });
                setSecurityForm({ current: '', new: '', confirm: '' });
                setEditMode(p => ({ ...p, security: false }));
            } else {
                setSaveStatus({ type: 'error', message: (res as any).error || 'Failed to update password.' });
            }
        } catch { setSaveStatus({ type: 'error', message: 'Network error.' }); }
        setSavingSection(null);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    const addAccreditation = () => {
        if (newAccreditation.trim() && !complianceForm.accreditations.includes(newAccreditation.trim())) {
            setComplianceForm(p => ({ ...p, accreditations: [...p.accreditations, newAccreditation.trim()] }));
            setNewAccreditation('');
        }
    };
    const removeAccreditation = (acc: string) =>
        setComplianceForm(p => ({ ...p, accreditations: p.accreditations.filter(a => a !== acc) }));

    /* ── Avatar initials helper ─────────────────────────────── */
    const avatarInitial = profileForm.name
        ? profileForm.name.trim().charAt(0).toUpperCase()
        : (user?.email ? user.email.charAt(0).toUpperCase() : 'D');

    /* ── Loading / access guard ─────────────────────────────── */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (user?.role === 'lab_technician') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <ShieldCheck className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">You do not have permission to manage center settings.</p>
            </div>
        );
    }

    /* ─────────────────── RENDER ──────────────────────────────── */
    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-800/50/60 dark:bg-[#070D1A]">

            {/* ── Page header ──────────────────────────────── */}
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700/60 dark:border-gray-800/60 bg-white dark:bg-[#0B1020]">
                <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your diagnostic center profile, operations and account.</p>
                    </div>
                    {saveStatus && (
                        <div className={cn(
                            'px-4 py-2 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 shrink-0',
                            saveStatus.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                        )}>
                            {saveStatus.message}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobile nav ─────────────────────────────── */}
            <div className="lg:hidden px-4 pt-4 pb-0 max-w-[1200px] mx-auto">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {NAV_CATEGORIES.flatMap(g => g.items).map(item => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0',
                                    isActive
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-purple-300 hover:text-purple-700'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Workspace (nav + content) ───────────────── */}
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

                    {/* Left nav — hidden on mobile */}
                    <div className="hidden lg:block w-[230px] shrink-0 sticky top-6">
                        <SettingsNavigation
                            categories={NAV_CATEGORIES}
                            activeSection={activeSection}
                            onSectionSelect={setActiveSection}
                            accentColor="purple"
                            variant="premium-box"
                        />
                    </div>

                    {/* Right content panel */}
                    <div className="flex-1 min-w-0">

                        {/* ══ CENTER PROFILE ══════════════════════════════ */}
                        {activeSection === 'profile' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={Building2}
                                    title="Center Profile"
                                    description="Your diagnostic center's public identity and contact summary."
                                    accentBg="bg-purple-50 dark:bg-purple-900/20"
                                    accentText="text-purple-600 dark:text-purple-400"
                                    actions={
                                        editMode.profile
                                            ? <SaveCancelButtons onSave={saveProfile} onCancel={() => handleCancel('profile')} isSaving={savingSection === 'profile'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, profile: true }))} />
                                    }
                                />

                                {editMode.profile ? (
                                    <div className="px-6 py-6 space-y-6">
                                        <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
                                            <ProfileImageUpload
                                                currentImage={profileForm.profile_image}
                                                name={profileForm.name}
                                                onUploadComplete={(url) => setProfileForm(p => ({ ...p, profile_image: url }))}
                                                accentColor="purple"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Center Name</label>
                                                <Input value={profileForm.name} onChange={(e: any) => setProfileForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Description / About</label>
                                                <Input value={profileForm.description} onChange={(e: any) => setProfileForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Hero */}
                                        <div className="px-6 py-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center border-b border-gray-100 dark:border-gray-800/60">
                                            <div className="shrink-0">
                                                {profileForm.profile_image && !imgError ? (
                                                    <img
                                                        src={profileForm.profile_image}
                                                        alt="Profile Image"
                                                        onError={() => setImgError(true)}
                                                        className="h-20 w-20 rounded-full object-cover ring-4 ring-purple-50 dark:ring-purple-900/20 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="h-20 w-20 rounded-full bg-purple-600 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-purple-100 dark:ring-purple-900/20 shadow-sm select-none">
                                                        {avatarInitial}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                                                    {profileForm.name || 'Diagnostic Center'}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-0.5 rounded-md">
                                                        Diagnostic Center
                                                    </span>
                                                    {complianceForm.license_number && <span className="text-xs text-gray-500 dark:text-gray-400">Lic: {complianceForm.license_number}</span>}
                                                    {complianceForm.registration_number && <span className="text-xs text-gray-500 dark:text-gray-400">Reg: {complianceForm.registration_number}</span>}
                                                    {complianceForm.nabl_accreditation && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                                                            <CheckCircle2 className="h-3 w-3" /> {complianceForm.nabl_accreditation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact summary grid */}
                                        <div className="px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                                            <FieldView label="Email"     value={locationForm.email} />
                                            <FieldView label="Phone"     value={locationForm.phone} />
                                            <FieldView label="Emergency" value={locationForm.emergency_phone} />
                                            <FieldView label="Website"   value={
                                                locationForm.website
                                                    ? <a href={locationForm.website} target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline truncate block">{locationForm.website}</a>
                                                    : null
                                            } />
                                        </div>

                                        {/* About */}
                                        <div className="px-6 pb-6 pt-0 border-t border-gray-100 dark:border-gray-800/60 mt-0">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pt-5">About Center</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                {profileForm.description || <EmptyValue text="No description provided" />}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </SectionCard>
                        )}

                        {/* ══ CONTACT & LOCATION ══════════════════════════ */}
                        {activeSection === 'location' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={MapPin}
                                    title="Contact & Location"
                                    description="Phone numbers, email, website and physical address."
                                    accentBg="bg-purple-50 dark:bg-purple-900/20"
                                    accentText="text-purple-600 dark:text-purple-400"
                                    actions={
                                        editMode.location
                                            ? <SaveCancelButtons onSave={saveLocation} onCancel={() => handleCancel('location')} isSaving={savingSection === 'location'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, location: true }))} />
                                    }
                                />

                                {editMode.location ? (
                                    <div className="px-6 py-6 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label><Input value={locationForm.email} onChange={(e: any) => setLocationForm(p => ({ ...p, email: e.target.value }))} type="email" className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label><Input value={locationForm.phone} onChange={(e: any) => setLocationForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Emergency Phone</label><Input value={locationForm.emergency_phone} onChange={(e: any) => setLocationForm(p => ({ ...p, emergency_phone: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Website</label><Input value={locationForm.website} onChange={(e: any) => setLocationForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Address</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="md:col-span-2"><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Street Address</label><Input value={locationForm.address} onChange={(e: any) => setLocationForm(p => ({ ...p, address: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">City</label><Input value={locationForm.city} onChange={(e: any) => setLocationForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">State</label><Input value={locationForm.state} onChange={(e: any) => setLocationForm(p => ({ ...p, state: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                                <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Pincode</label><Input value={locationForm.pincode} onChange={(e: any) => setLocationForm(p => ({ ...p, pincode: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            </div>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/60 dark:border-gray-800">
                                            <LocationPicker
                                                latitude={locationForm.latitude}
                                                longitude={locationForm.longitude}
                                                address={locationForm.address}
                                                onLocationChange={(lat, lng) => setLocationForm(p => ({ ...p, latitude: lat === 0 ? null : lat, longitude: lng === 0 ? null : lng }))}
                                                accentColor="purple"
                                                label="Diagnostic Center Location on Map"
                                                height="280px"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Contact row */}
                                        <div className="px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                                            <FieldView label="Email"     value={locationForm.email} />
                                            <FieldView label="Phone"     value={locationForm.phone} />
                                            <FieldView label="Emergency" value={locationForm.emergency_phone} />
                                            <FieldView label="Website"   value={
                                                locationForm.website
                                                    ? <a href={locationForm.website} target="_blank" rel="noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline truncate block">{locationForm.website}</a>
                                                    : null
                                            } />
                                        </div>

                                        {/* Address block */}
                                        <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800/60 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                            <FieldView label="Full Address" value={locationForm.address} className="md:col-span-2" />
                                            <FieldView label="City"    value={locationForm.city} />
                                            <FieldView label="State"   value={locationForm.state} />
                                            <FieldView label="Pincode" value={locationForm.pincode} />
                                            <div className="md:col-span-2">
                                                {locationForm.latitude && locationForm.longitude ? (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                                        <MapPin className="h-3 w-3" /> Location pinned
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/40 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                                        <AlertCircle className="h-3 w-3" /> No location pinned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </SectionCard>
                        )}

                        {/* ══ OPERATIONS ══════════════════════════════════ */}
                        {activeSection === 'operations' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={Clock}
                                    title="Operations"
                                    description="Operating hours and availability settings."
                                    accentBg="bg-purple-50 dark:bg-purple-900/20"
                                    accentText="text-purple-600 dark:text-purple-400"
                                    actions={
                                        editMode.operations
                                            ? <SaveCancelButtons onSave={saveOperations} onCancel={() => handleCancel('operations')} isSaving={savingSection === 'operations'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, operations: true }))} />
                                    }
                                />

                                {editMode.operations ? (
                                    <div className="px-6 py-6">
                                        <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">24/7 Operations</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Is your center open 24 hours a day?</p>
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable</span>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-purple-600 rounded-md focus:ring-purple-500 border-gray-300 dark:border-gray-600 shadow-sm"
                                                    checked={operationsForm.is_24_hours}
                                                    onChange={(e: any) => setOperationsForm(p => ({ ...p, is_24_hours: e.target.checked }))}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={cn(
                                            'p-5 rounded-2xl border flex flex-col justify-center min-h-[90px]',
                                            operationsForm.is_24_hours
                                                ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30'
                                                : 'bg-gray-50 dark:bg-gray-800/50/50 dark:bg-[#131A2B]/30 border-gray-100 dark:border-gray-800'
                                        )}>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">24/7 Operations</p>
                                            <p className={cn('text-base font-bold', operationsForm.is_24_hours ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400')}>
                                                {operationsForm.is_24_hours ? 'Open 24/7' : 'Not 24/7'}
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50/50 dark:bg-[#131A2B]/30 flex flex-col justify-center min-h-[90px]">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Working Hours</p>
                                            <p className="text-base font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400">Not configured</p>
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        )}

                        {/* ══ HOME COLLECTION ═════════════════════════════ */}
                        {activeSection === 'home-collection' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={Truck}
                                    title="Home Collection"
                                    description="Sample collection service at patient's home."
                                    accentBg="bg-purple-50 dark:bg-purple-900/20"
                                    accentText="text-purple-600 dark:text-purple-400"
                                    actions={
                                        editMode.homeCollection
                                            ? <SaveCancelButtons onSave={saveHomeCollection} onCancel={() => handleCancel('homeCollection')} isSaving={savingSection === 'homeCollection'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, homeCollection: true }))} />
                                    }
                                />

                                {editMode.homeCollection ? (
                                    <div className="px-6 py-6 space-y-4">
                                        <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Home Collection</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Do you offer sample collection at patient's home?</p>
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable</span>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-purple-600 rounded-md focus:ring-purple-500 border-gray-300 dark:border-gray-600 shadow-sm"
                                                    checked={homeCollectionForm.home_collection_available}
                                                    onChange={(e: any) => setHomeCollectionForm(p => ({ ...p, home_collection_available: e.target.checked }))}
                                                />
                                            </label>
                                        </div>
                                        {homeCollectionForm.home_collection_available && (
                                            <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-2xl">
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Home Collection Fee (₹)</label>
                                                <Input type="number" min="0" value={homeCollectionForm.home_collection_fee} onChange={(e: any) => setHomeCollectionForm(p => ({ ...p, home_collection_fee: e.target.value }))} className="max-w-[200px] rounded-xl" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="px-6 py-5">
                                        <div className={cn(
                                            'p-5 rounded-2xl border flex flex-col justify-center min-h-[90px]',
                                            homeCollectionForm.home_collection_available
                                                ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30'
                                                : 'bg-gray-50 dark:bg-gray-800/50/50 dark:bg-[#131A2B]/30 border-gray-100 dark:border-gray-800'
                                        )}>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Home Collection</p>
                                            <p className={cn('text-base font-bold', homeCollectionForm.home_collection_available ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400')}>
                                                {homeCollectionForm.home_collection_available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                                            </p>
                                            {homeCollectionForm.home_collection_available && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Fee: ₹{homeCollectionForm.home_collection_fee || '0'}</p>
                                            )}
                                            {!homeCollectionForm.home_collection_available && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Home sample collection is not enabled.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        )}

                        {/* ══ COMPLIANCE ══════════════════════════════════ */}
                        {activeSection === 'compliance' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={ShieldCheck}
                                    title="Registration & Accreditation"
                                    description="Legal registrations, licenses and quality certifications."
                                    accentBg="bg-purple-50 dark:bg-purple-900/20"
                                    accentText="text-purple-600 dark:text-purple-400"
                                    actions={
                                        editMode.compliance
                                            ? <SaveCancelButtons onSave={saveCompliance} onCancel={() => handleCancel('compliance')} isSaving={savingSection === 'compliance'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, compliance: true }))} />
                                    }
                                />

                                {editMode.compliance ? (
                                    <div className="px-6 py-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Registration Number</label><Input value={complianceForm.registration_number} onChange={(e: any) => setComplianceForm(p => ({ ...p, registration_number: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">License Number</label><Input value={complianceForm.license_number} onChange={(e: any) => setComplianceForm(p => ({ ...p, license_number: e.target.value }))} className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">NABL Accreditation</label><Input value={complianceForm.nabl_accreditation} onChange={(e: any) => setComplianceForm(p => ({ ...p, nabl_accreditation: e.target.value }))} placeholder="e.g. MC-1234" className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50" /></div>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Other Accreditations</label>
                                            <div className="flex gap-2 max-w-md">
                                                <Input
                                                    value={newAccreditation}
                                                    onChange={(e: any) => setNewAccreditation(e.target.value)}
                                                    placeholder="e.g. ISO 9001"
                                                    onKeyDown={(e: any) => e.key === 'Enter' && (e.preventDefault(), addAccreditation())}
                                                    className="rounded-xl bg-gray-50 dark:bg-gray-800/50/50"
                                                />
                                                <Button type="button" onClick={addAccreditation} variant="outline" className="rounded-xl shrink-0"><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            {complianceForm.accreditations.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {complianceForm.accreditations.map(acc => (
                                                        <span key={acc} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                                                            {acc}
                                                            <button type="button" onClick={() => removeAccreditation(acc)} className="hover:text-red-600 ml-1 rounded">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                            <FieldView label="Registration Number" value={complianceForm.registration_number} />
                                            <FieldView label="License Number"      value={complianceForm.license_number} />
                                            <FieldView label="NABL Accreditation"  value={complianceForm.nabl_accreditation} />
                                        </div>
                                        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800/60">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pt-5">Other Accreditations</p>
                                            <div className="flex flex-wrap gap-2">
                                                {complianceForm.accreditations.length > 0
                                                    ? complianceForm.accreditations.map(acc => (
                                                        <span key={acc} className="px-3 py-1.5 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-[13px] font-medium shadow-sm">
                                                            {acc}
                                                        </span>
                                                    ))
                                                    : <EmptyValue text="Not provided" />
                                                }
                                            </div>
                                        </div>
                                    </>
                                )}
                            </SectionCard>
                        )}

                        {/* ══ SECURITY ════════════════════════════════════ */}
                        {activeSection === 'security' && (
                            <SectionCard>
                                <SectionHeader
                                    icon={Shield}
                                    title="Security"
                                    description="Manage your password and account security."
                                    accentBg="bg-gray-100 dark:bg-gray-800"
                                    accentText="text-gray-600 dark:text-gray-300"
                                    actions={
                                        editMode.security
                                            ? <SaveCancelButtons onSave={saveSecurity} onCancel={() => handleCancel('security')} isSaving={savingSection === 'security'} />
                                            : <EditButton onClick={() => setEditMode(p => ({ ...p, security: true }))} />
                                    }
                                />

                                {editMode.security ? (
                                    <div className="px-6 py-6 space-y-4 max-w-sm">
                                        <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Current Password</label><Input type="password" value={securityForm.current} onChange={(e: any) => setSecurityForm(p => ({ ...p, current: e.target.value }))} className="rounded-xl" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">New Password</label><Input type="password" value={securityForm.new} onChange={(e: any) => setSecurityForm(p => ({ ...p, new: e.target.value }))} className="rounded-xl" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Confirm New Password</label><Input type="password" value={securityForm.confirm} onChange={(e: any) => setSecurityForm(p => ({ ...p, confirm: e.target.value }))} className="rounded-xl" /></div>
                                    </div>
                                ) : (
                                    <div className="px-6 py-5">
                                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                                <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Password</p>
                                                <p className="text-lg font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 tracking-widest mt-0.5">••••••••</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        )}

                    </div>{/* /right content */}
                </div>{/* /workspace flex */}
            </div>{/* /page container */}
        </div>
    );
}
