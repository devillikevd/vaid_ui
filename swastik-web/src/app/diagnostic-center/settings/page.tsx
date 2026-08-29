/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDiagnosticCenterStore, type DiagnosticCenterProfile } from '@/stores/diagnosticCenterStore';
import { authApi, uploadApi } from '@/lib/api';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { useTheme } from '@/components/shared/ThemeProvider';
import { refreshAuthenticatedUser, getResubmissionSuccessMessage } from '@/lib/authSession';
import {
    loadDiagnosticQuickActions,
    saveDiagnosticQuickActions,
    DIAGNOSTIC_ACTIONS_CATALOG,
    type QuickActionConfigItem,
} from '@/lib/diagnosticQuickActions';
import {
    User,
    Microscope,
    Clock,
    ShieldCheck,
    Lock,
    Palette,
    Edit3,
    Save,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Mail,
    Phone,
    MapPin,
    ExternalLink,
    Award,
    Sun,
    Moon,
    Monitor,
    Key,
    Check,
    Sliders,
    Sparkles,
    Eye,
    EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type SettingsCategory = 'account' | 'diagnosis' | 'operations' | 'compliance' | 'security' | 'preferences';

const CATEGORIES: { id: SettingsCategory; label: string; icon: typeof User; description: string }[] = [
    { id: 'account', label: 'Account', icon: User, description: 'User profile, contact details and account status' },
    { id: 'diagnosis', label: 'Diagnosis Details', icon: Microscope, description: 'Center identity, branding and location details' },
    { id: 'operations', label: 'Operations & Services', icon: Clock, description: 'Working hours, sample collection & logistics' },
    { id: 'compliance', label: 'Licensing & Compliance', icon: ShieldCheck, description: 'Accreditations, medical registration & documents' },
    { id: 'security', label: 'Security', icon: Lock, description: 'Password change and account protection' },
    { id: 'preferences', label: 'Preferences & Appearance', icon: Palette, description: 'Theme switching & dashboard quick actions' },
];

function DiagnosticSettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const user = useAuthStore((s) => s.user);
    const { theme, setTheme } = useTheme();
    const { profile, loadingProfile, fetchProfile, updateProfile } = useDiagnosticCenterStore();

    // Category routing
    const categoryParam = (searchParams.get('category') || 'account').toLowerCase() as SettingsCategory;
    const activeCategory: SettingsCategory = CATEGORIES.some((c) => c.id === categoryParam) ? categoryParam : 'account';

    // Editable draft form state
    const [draft, setDraft] = useState<Partial<DiagnosticCenterProfile>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Security Form State
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [securitySaving, setSecuritySaving] = useState(false);

    // Quick Actions Preferences State
    const [quickActions, setQuickActions] = useState<QuickActionConfigItem[]>([]);
    const [preferencesSaved, setPreferencesSaved] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4500);
    };

    // Load Profile
    useEffect(() => {
        if (user) {
            void fetchProfile();
        }
    }, [user, fetchProfile]);

    // Load Quick Actions Preferences
    useEffect(() => {
        if (user) {
            setQuickActions(loadDiagnosticQuickActions(user.id));
        }
    }, [user]);

    // Sync draft with loaded profile
    const resetDraftToCurrent = useCallback(() => {
        if (profile) {
            setDraft({ ...profile });
        } else if (user) {
            setDraft({
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                latitude: null,
                longitude: null,
                opening_hours: '08:00 AM - 08:00 PM',
                is_24_hours: false,
                sample_collection_available: true,
                home_collection_available: false,
                home_collection_fee: null,
                registration_number: '',
                license_number: '',
                nabl_accreditation: false,
                accreditations: '',
                description: '',
                profile_image: null,
                profile_image_url: null,
            });
        }
        setIsEditing(false);
        setErrors({});
    }, [profile, user]);

    useEffect(() => {
        resetDraftToCurrent();
    }, [resetDraftToCurrent]);

    const handleCategoryChange = (cat: SettingsCategory) => {
        if (isEditing) {
            if (!confirm('You have unsaved changes. Discard changes and switch category?')) {
                return;
            }
            resetDraftToCurrent();
        }
        router.replace(`/diagnosis/settings?category=${cat}`, { scroll: false });
    };

    const validateActiveCategory = () => {
        const errs: Record<string, string> = {};

        if (activeCategory === 'diagnosis') {
            if (!draft.name?.trim()) errs.name = 'Diagnostic center name is required';
            if (!draft.phone?.trim()) {
                errs.phone = 'Phone number is required';
            } else if (!/^[0-9+\s-]{8,15}$/.test(draft.phone.trim())) {
                errs.phone = 'Valid phone number is required (8-15 digits)';
            }
            if (draft.pincode && !/^\d{6}$/.test(draft.pincode.trim())) {
                errs.pincode = 'Pincode must be exactly 6 digits';
            }
        }

        if (activeCategory === 'operations') {
            if (draft.home_collection_available && draft.home_collection_fee !== undefined && draft.home_collection_fee !== null && draft.home_collection_fee !== '') {
                const fee = Number(draft.home_collection_fee);
                if (isNaN(fee) || fee < 0) {
                    errs.home_collection_fee = 'Home collection fee must be a positive number';
                }
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSaveDraft = async () => {
        if (!validateActiveCategory()) {
            showToast('Please resolve validation errors before saving.', 'error');
            return;
        }

        setIsSaving(true);
        const previousApprovalStatus = user?.approval_status;

        const payload: Record<string, unknown> = {
            name: draft.name?.trim(),
            phone: draft.phone?.trim(),
            email: draft.email?.trim() || undefined,
            emergency_phone: draft.emergency_phone?.trim() || undefined,
            website_url: draft.website_url?.trim() || draft.website?.trim() || undefined,
            address: draft.address?.trim() || undefined,
            city: draft.city?.trim() || undefined,
            state: draft.state?.trim() || undefined,
            pincode: draft.pincode?.trim() || undefined,
            opening_hours: draft.opening_hours?.trim() || undefined,
            is_24_hours: draft.is_24_hours,
            sample_collection_available: draft.sample_collection_available,
            home_collection_available: draft.home_collection_available,
            home_collection_fee: draft.home_collection_fee !== undefined && draft.home_collection_fee !== null && draft.home_collection_fee !== ''
                ? Number(draft.home_collection_fee)
                : null,
            registration_number: draft.registration_number?.trim() || undefined,
            license_number: draft.license_number?.trim() || undefined,
            license_document_url: draft.license_document_url?.trim() || undefined,
            nabl_accreditation: draft.nabl_accreditation,
            accreditations: typeof draft.accreditations === 'string'
                ? draft.accreditations.split(',').map((s) => s.trim()).filter(Boolean)
                : draft.accreditations,
            description: draft.description?.trim() || undefined,
            profile_image: draft.profile_image_url || draft.profile_image || undefined,
            profile_image_url: draft.profile_image_url || draft.profile_image || undefined,
        };

        if (draft.latitude !== null && draft.latitude !== undefined && draft.longitude !== null && draft.longitude !== undefined) {
            payload.latitude = draft.latitude;
            payload.longitude = draft.longitude;
        }

        const res = await updateProfile(payload);
        setIsSaving(false);

        if (res.success) {
            const refreshedUser = await refreshAuthenticatedUser();
            showToast(
                getResubmissionSuccessMessage(
                    previousApprovalStatus,
                    refreshedUser?.approval_status,
                    'Settings saved successfully!'
                ),
                'success'
            );
            setIsEditing(false);
            void fetchProfile();
        } else {
            showToast(res.error || 'Failed to update settings. Please try again.', 'error');
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.current) {
            showToast('Current password is required.', 'error');
            return;
        }
        if (passwords.new.length < 6) {
            showToast('New password must be at least 6 characters.', 'error');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            showToast('New passwords do not match.', 'error');
            return;
        }

        setSecuritySaving(true);
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) {
                showToast('Password changed successfully!', 'success');
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                showToast((res as any).error || (res as any).message || 'Failed to change password.', 'error');
            }
        } catch {
            showToast('Failed to change password due to network error.', 'error');
        } finally {
            setSecuritySaving(false);
        }
    };

    const handleToggleQuickAction = (id: string) => {
        const updated = quickActions.map((item) =>
            item.id === id ? { ...item, enabled: !item.enabled } : item
        );
        setQuickActions(updated);
        saveDiagnosticQuickActions(user?.id, updated);
        setPreferencesSaved(true);
        setTimeout(() => setPreferencesSaved(false), 3000);
    };

    if (loadingProfile && !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
                <Loader2 className="w-9 h-9 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading diagnostic settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Feedback Toast */}
            {feedback && (
                <div
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all backdrop-blur-md animate-in fade-in slide-in-from-top-4 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Microscope className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                        <span>Diagnosis Settings</span>
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure diagnostic facility details, operational workflows, and security.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/diagnosis/profile">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-semibold"
                        >
                            View Live Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Mobile / Tablet Horizontal Category Scroll */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100 dark:border-gray-800">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all duration-150',
                                isActive
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            )}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Desktop 2-Column SaaS Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Sidebar Category Navigation */}
                <div className="hidden lg:block lg:col-span-4 space-y-2">
                    <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] p-2.5 rounded-2xl">
                        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Settings Categories
                        </div>
                        <nav className="space-y-1">
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategoryChange(cat.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all duration-150 group',
                                            isActive
                                                ? 'bg-purple-600 text-white font-bold shadow-md'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:hover:text-purple-300'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'p-2 rounded-lg shrink-0 transition-colors',
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold truncate leading-tight">{cat.label}</div>
                                            <div
                                                className={cn(
                                                    'text-[11px] truncate mt-0.5',
                                                    isActive ? 'text-purple-100' : 'text-gray-400 dark:text-gray-500'
                                                )}
                                            >
                                                {cat.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </Card>
                </div>

                {/* Right Content Panel — ONLY ONE CATEGORY RENDERED AT A TIME */}
                <div className="lg:col-span-8 space-y-6">
                    {/* 1. ACCOUNT SETTINGS */}
                    {activeCategory === 'account' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Account Settings
                                    </CardTitle>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Manage owner credentials, account identification, and verified status.
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Provider Role</span>
                                            <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                {(user?.role || 'diagnostic_center_owner').replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Account Status</span>
                                            <span
                                                className={`font-bold text-xs px-2.5 py-0.5 rounded-full border ${
                                                    user?.approval_status === 'approved' || profile?.is_approved
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                                }`}
                                            >
                                                {(user?.approval_status || profile?.approval_status || 'PENDING').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Member Since</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-semibold text-xs">
                                                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Account Email
                                                </label>
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">READ ONLY</span>
                                            </div>
                                            <Input
                                                value={user?.email || profile?.email || ''}
                                                disabled
                                                className="bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 cursor-not-allowed rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Provider ID
                                                </label>
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">READ ONLY</span>
                                            </div>
                                            <Input
                                                value={profile?.id || user?.id || ''}
                                                disabled
                                                className="font-mono text-xs bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 cursor-not-allowed rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Owner / Contact Person
                                                </label>
                                            </div>
                                            <Input
                                                value={user?.name || ''}
                                                disabled
                                                className="bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 2. DIAGNOSIS DETAILS SETTINGS */}
                    {activeCategory === 'diagnosis' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Microscope className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Diagnosis Center Details
                                    </CardTitle>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Center profile, contact numbers, address, and interactive map location.
                                    </p>
                                </div>
                                {!isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Details
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={resetDraftToCurrent}
                                            variant="outline"
                                            size="sm"
                                            disabled={isSaving}
                                            className="rounded-xl text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveDraft}
                                            disabled={isSaving}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                        >
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Profile Image */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Center Logo / Branding
                                    </label>
                                    {isEditing ? (
                                        <ProfileImageUpload
                                            currentImage={draft.profile_image_url || draft.profile_image || null}
                                            name={draft.name || 'Diagnostic Center'}
                                            onUploadComplete={(url: string) => setDraft((d) => ({ ...d, profile_image_url: url, profile_image: url }))}
                                            accentColor="purple"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                                                {draft.profile_image_url || draft.profile_image ? (
                                                    <img src={draft.profile_image_url || draft.profile_image || ''} alt="Center Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Microscope className="w-8 h-8 text-purple-400" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                This logo represents your diagnostic laboratory across patient search results.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Center Name <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            value={draft.name || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                            disabled={!isEditing}
                                            className="rounded-xl"
                                        />
                                        {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Primary Phone <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                value={draft.phone || ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                                                disabled={!isEditing}
                                                className="rounded-xl"
                                            />
                                            {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Emergency Contact Phone
                                            </label>
                                            <Input
                                                value={draft.emergency_phone || ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, emergency_phone: e.target.value }))}
                                                disabled={!isEditing}
                                                placeholder="e.g. +91 9876543211"
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Website URL
                                        </label>
                                        <Input
                                            value={draft.website_url || draft.website || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, website_url: e.target.value }))}
                                            disabled={!isEditing}
                                            placeholder="https://yourdiagnosticcenter.com"
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Street Address
                                        </label>
                                        <Input
                                            value={draft.address || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                                            disabled={!isEditing}
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">City</label>
                                            <Input
                                                value={draft.city || ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                                                disabled={!isEditing}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">State</label>
                                            <Input
                                                value={draft.state || ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                                                disabled={!isEditing}
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Pincode</label>
                                            <Input
                                                value={draft.pincode || ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, pincode: e.target.value }))}
                                                disabled={!isEditing}
                                                maxLength={6}
                                                className="rounded-xl"
                                            />
                                            {errors.pincode && <p className="text-xs text-rose-500 mt-1">{errors.pincode}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Location Coordinates (Map Placement)
                                        </label>
                                        {isEditing ? (
                                            <LocationPicker
                                                latitude={draft.latitude ?? null}
                                                longitude={draft.longitude ?? null}
                                                onLocationChange={(lat: number, lng: number) => setDraft((d) => ({ ...d, latitude: lat, longitude: lng }))}
                                            />
                                        ) : (
                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                                                <span className="font-mono text-gray-700 dark:text-gray-300">
                                                    {draft.latitude && draft.longitude
                                                        ? `${Number(draft.latitude).toFixed(4)}, ${Number(draft.longitude).toFixed(4)}`
                                                        : 'No GPS location set'}
                                                </span>
                                                {draft.latitude && draft.longitude && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${draft.latitude},${draft.longitude}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" /> View Map
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Description / About Center
                                        </label>
                                        <textarea
                                            value={draft.description || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                            disabled={!isEditing}
                                            rows={3}
                                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-800/40 disabled:text-gray-600 dark:disabled:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 3. OPERATIONS & SERVICES */}
                    {activeCategory === 'operations' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Operations & Services
                                    </CardTitle>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Opening schedule, 24-hour availability, and home sample collection fees.
                                    </p>
                                </div>
                                {!isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Operations
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={resetDraftToCurrent}
                                            variant="outline"
                                            size="sm"
                                            disabled={isSaving}
                                            className="rounded-xl text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveDraft}
                                            disabled={isSaving}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                        >
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Opening Hours
                                        </label>
                                        <Input
                                            value={draft.opening_hours || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, opening_hours: e.target.value }))}
                                            disabled={!isEditing || Boolean(draft.is_24_hours)}
                                            placeholder="08:00 AM - 08:00 PM"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(draft.is_24_hours)}
                                                onChange={(e) => setDraft((d) => ({ ...d, is_24_hours: e.target.checked }))}
                                                disabled={!isEditing}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Open 24 Hours</span>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 bg-gray-50/60 dark:bg-gray-800/40">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Home Sample Collection</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Allow patients to book doorstep sample collection by phlebotomists.
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(draft.home_collection_available)}
                                                onChange={(e) => setDraft((d) => ({ ...d, home_collection_available: e.target.checked }))}
                                                disabled={!isEditing}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>

                                    {draft.home_collection_available && (
                                        <div className="pt-2">
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Home Sample Collection Fee (₹)
                                            </label>
                                            <Input
                                                type="number"
                                                value={draft.home_collection_fee !== undefined && draft.home_collection_fee !== null ? String(draft.home_collection_fee) : ''}
                                                onChange={(e) => setDraft((d) => ({ ...d, home_collection_fee: e.target.value }))}
                                                disabled={!isEditing}
                                                placeholder="0 for Free collection"
                                                className="rounded-xl max-w-xs"
                                            />
                                            {errors.home_collection_fee && <p className="text-xs text-rose-500 mt-1">{errors.home_collection_fee}</p>}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. LICENSING & COMPLIANCE */}
                    {activeCategory === 'compliance' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Licensing & Compliance
                                    </CardTitle>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Medical license registration, NABL accreditation, and compliance documents.
                                    </p>
                                </div>
                                {!isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Compliance
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={resetDraftToCurrent}
                                            variant="outline"
                                            size="sm"
                                            disabled={isSaving}
                                            className="rounded-xl text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveDraft}
                                            disabled={isSaving}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                                        >
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Registration Number
                                        </label>
                                        <Input
                                            value={draft.registration_number || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, registration_number: e.target.value }))}
                                            disabled={!isEditing}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Diagnostic License Number
                                        </label>
                                        <Input
                                            value={draft.license_number || ''}
                                            onChange={(e) => setDraft((d) => ({ ...d, license_number: e.target.value }))}
                                            disabled={!isEditing}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(draft.nabl_accreditation)}
                                                onChange={(e) => setDraft((d) => ({ ...d, nabl_accreditation: e.target.checked }))}
                                                disabled={!isEditing}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">NABL Accredited Facility</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Other Accreditations (comma-separated)
                                        </label>
                                        <Input
                                            value={Array.isArray(draft.accreditations) ? draft.accreditations.join(', ') : (draft.accreditations || '')}
                                            onChange={(e) => setDraft((d) => ({ ...d, accreditations: e.target.value }))}
                                            disabled={!isEditing}
                                            placeholder="e.g. NABL, CAP, ISO 15189"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                        Diagnostic License Certificate
                                    </label>
                                    {isEditing ? (
                                        <ComplianceDocumentUpload
                                            label="Upload Diagnostic License Document"
                                            providerType="diagnostic_center"
                                            value={draft.license_document_url}
                                            onChange={(url) => setDraft((d) => ({ ...d, license_document_url: url }))}
                                            description="Upload a certified PDF or image of your diagnostic license."
                                        />
                                    ) : (
                                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {draft.license_document_url ? 'Diagnostic License Uploaded' : 'No license document uploaded yet'}
                                            </span>
                                            {draft.license_document_url && (
                                                <a
                                                    href={draft.license_document_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" /> View Document
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 5. SECURITY SETTINGS */}
                    {activeCategory === 'security' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Security & Password
                                </CardTitle>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Update your login credentials. Passwords are encrypted and never logged.
                                </p>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={passwords.current}
                                                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                                                placeholder="Enter current password"
                                                className="rounded-xl pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={passwords.new}
                                                onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                                                placeholder="At least 6 characters"
                                                className="rounded-xl pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Confirm New Password
                                        </label>
                                        <Input
                                            type="password"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                                            placeholder="Re-enter new password"
                                            className="rounded-xl"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleChangePassword}
                                        disabled={securitySaving || !passwords.current || !passwords.new}
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md font-semibold text-xs min-w-[140px]"
                                    >
                                        {securitySaving ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Updating...
                                            </>
                                        ) : (
                                            <>
                                                <Key className="w-3.5 h-3.5 mr-1.5" /> Update Password
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 6. PREFERENCES & APPEARANCE */}
                    {activeCategory === 'preferences' && (
                        <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020] rounded-2xl overflow-hidden animate-in fade-in duration-200">
                            <CardHeader className="border-b border-gray-100 dark:border-gray-800/80 p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Preferences & Appearance
                                </CardTitle>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Theme mode settings and dashboard customization.
                                </p>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                {/* Theme Switcher */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">
                                        Interface Theme
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3 max-w-md">
                                        {[
                                            { id: 'light', label: 'Light', icon: Sun },
                                            { id: 'dark', label: 'Dark', icon: Moon },
                                            { id: 'system', label: 'System', icon: Monitor },
                                        ].map((t) => {
                                            const Icon = t.icon;
                                            const isActive = theme === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id as any)}
                                                    className={cn(
                                                        'flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-150',
                                                        isActive
                                                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold shadow-sm ring-2 ring-purple-600/20'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                                    )}
                                                >
                                                    <Icon className="w-6 h-6 mb-2" />
                                                    <span className="text-xs">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Dashboard Quick Actions Customizer */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                                Dashboard Quick Actions
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Select which shortcuts appear on your diagnostic dashboard.
                                            </p>
                                        </div>
                                        {preferencesSaved && (
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                                <Check className="w-3.5 h-3.5" /> Saved
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {DIAGNOSTIC_ACTIONS_CATALOG.map((item) => {
                                            const Icon = item.icon;
                                            const isEnabled = quickActions.find((q) => q.id === item.id)?.enabled ?? true;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleToggleQuickAction(item.id)}
                                                    className={cn(
                                                        'p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                                                        isEnabled
                                                            ? 'border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 text-gray-900 dark:text-white'
                                                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-400 opacity-60'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'p-2 rounded-lg',
                                                            isEnabled ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                                                        )}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold">{item.label}</p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.description}</p>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isEnabled}
                                                        onChange={() => {}} // Handled by container onClick
                                                        className="rounded text-purple-600 focus:ring-purple-500 pointer-events-none"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DiagnosticSettingsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>}>
            <DiagnosticSettingsContent />
        </Suspense>
    );
}
