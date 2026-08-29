/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDiagnosticCenterStore, type DiagnosticCenterProfile } from '@/stores/diagnosticCenterStore';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import LocationPicker from '@/components/shared/LocationPickerDynamic';
import { refreshAuthenticatedUser, getResubmissionSuccessMessage } from '@/lib/authSession';
import {
    Edit3,
    Loader2,
    MapPin,
    Phone,
    Mail,
    Clock,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Microscope,
    User,
    FileText,
    Building2,
    Settings,
    X,
    Save,
    ExternalLink,
    Award,
    Truck,
    Sparkles,
    Globe,
    Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function DiagnosticProfilePage() {
    const user = useAuthStore((s) => s.user);
    const { profile, loadingProfile, fetchProfile, updateProfile } = useDiagnosticCenterStore();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        emergency_phone: '',
        website_url: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: null as number | null,
        longitude: null as number | null,
        opening_hours: '',
        is_24_hours: false,
        sample_collection_available: true,
        home_collection_available: false,
        home_collection_fee: '',
        registration_number: '',
        license_number: '',
        nabl_accreditation: false,
        accreditations: '',
        description: '',
        profile_image: null as string | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4500);
    };

    useEffect(() => {
        if (user) {
            void fetchProfile();
        }
    }, [user, fetchProfile]);

    const openEditModal = () => {
        const p = profile || ({} as DiagnosticCenterProfile);
        setEditForm({
            name: p.name || user?.name || '',
            phone: p.phone || user?.phone || '',
            email: p.email || user?.email || '',
            emergency_phone: p.emergency_phone || '',
            website_url: p.website_url || p.website || '',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            pincode: p.pincode || '',
            latitude: typeof p.latitude === 'number' ? p.latitude : null,
            longitude: typeof p.longitude === 'number' ? p.longitude : null,
            opening_hours: p.opening_hours || '',
            is_24_hours: Boolean(p.is_24_hours),
            sample_collection_available: p.sample_collection_available !== false,
            home_collection_available: Boolean(p.home_collection_available),
            home_collection_fee: p.home_collection_fee !== undefined && p.home_collection_fee !== null ? String(p.home_collection_fee) : '',
            registration_number: p.registration_number || '',
            license_number: p.license_number || '',
            nabl_accreditation: Boolean(p.nabl_accreditation),
            accreditations: Array.isArray(p.accreditations) ? p.accreditations.join(', ') : (p.accreditations || ''),
            description: p.description || '',
            profile_image: p.profile_image_url || p.profile_image || p.image_url || null,
        });
        setErrors({});
        setIsEditOpen(true);
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!editForm.name.trim()) errs.name = 'Diagnostic center name is required';
        if (!editForm.phone.trim()) {
            errs.phone = 'Contact phone number is required';
        } else if (!/^[0-9+\s-]{8,15}$/.test(editForm.phone.trim())) {
            errs.phone = 'Enter a valid phone number (8-15 digits)';
        }
        if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
            errs.email = 'Enter a valid email address';
        }
        if (editForm.pincode && !/^\d{6}$/.test(editForm.pincode.trim())) {
            errs.pincode = 'Pincode must be exactly 6 digits';
        }
        if (editForm.home_collection_available && editForm.home_collection_fee) {
            const fee = Number(editForm.home_collection_fee);
            if (isNaN(fee) || fee < 0) {
                errs.home_collection_fee = 'Home collection fee must be a valid positive number';
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSaveProfile = async () => {
        if (!validateForm()) {
            showToast('Please fix the errors before saving.', 'error');
            return;
        }

        setIsSaving(true);
        const previousApprovalStatus = user?.approval_status;

        const payload: Record<string, unknown> = {
            name: editForm.name.trim(),
            phone: editForm.phone.trim(),
            email: editForm.email.trim() || undefined,
            emergency_phone: editForm.emergency_phone.trim() || undefined,
            website_url: editForm.website_url.trim() || undefined,
            address: editForm.address.trim() || undefined,
            city: editForm.city.trim() || undefined,
            state: editForm.state.trim() || undefined,
            pincode: editForm.pincode.trim() || undefined,
            opening_hours: editForm.opening_hours.trim() || undefined,
            is_24_hours: editForm.is_24_hours,
            sample_collection_available: editForm.sample_collection_available,
            home_collection_available: editForm.home_collection_available,
            home_collection_fee: editForm.home_collection_fee ? Number(editForm.home_collection_fee) : null,
            registration_number: editForm.registration_number.trim() || undefined,
            license_number: editForm.license_number.trim() || undefined,
            nabl_accreditation: editForm.nabl_accreditation,
            accreditations: editForm.accreditations
                ? editForm.accreditations.split(',').map((s) => s.trim()).filter(Boolean)
                : [],
            description: editForm.description.trim() || undefined,
            profile_image: editForm.profile_image || undefined,
            profile_image_url: editForm.profile_image || undefined,
        };

        if (editForm.latitude !== null && editForm.longitude !== null) {
            payload.latitude = editForm.latitude;
            payload.longitude = editForm.longitude;
        }

        const res = await updateProfile(payload);
        setIsSaving(false);

        if (res.success) {
            const refreshedUser = await refreshAuthenticatedUser();
            showToast(
                getResubmissionSuccessMessage(
                    previousApprovalStatus,
                    refreshedUser?.approval_status,
                    'Diagnostic Center profile updated successfully!'
                ),
                'success'
            );
            setIsEditOpen(false);
            void fetchProfile();
        } else {
            showToast(res.error || 'Failed to update profile. Please try again.', 'error');
        }
    };

    if (loadingProfile && !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <Loader2 className="w-9 h-9 animate-spin text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading diagnostic center profile...</p>
            </div>
        );
    }

    const name = profile?.name || user?.name || 'Diagnostic Center';
    const email = profile?.email || user?.email || 'No email provided';
    const phone = profile?.phone || user?.phone || 'No phone provided';
    const profileImage = profile?.profile_image_url || profile?.profile_image || profile?.image_url || null;
    const isApproved = profile?.is_approved || profile?.approval_status === 'approved' || user?.approval_status === 'approved';
    const approvalStatus = profile?.approval_status || user?.approval_status || 'pending';

    // Calculate Profile Completion Score
    const completionItems = [
        { label: 'Center Name', filled: Boolean(profile?.name || user?.name) },
        { label: 'Contact Phone', filled: Boolean(profile?.phone || user?.phone) },
        { label: 'Address & Pincode', filled: Boolean(profile?.address && profile?.pincode) },
        { label: 'GPS Map Coordinates', filled: Boolean(profile?.latitude && profile?.longitude) },
        { label: 'Diagnostic License', filled: Boolean(profile?.license_number || profile?.registration_number) },
        { label: 'Operational Hours', filled: Boolean(profile?.opening_hours || profile?.is_24_hours) },
        { label: 'Center Logo / Photo', filled: Boolean(profileImage) },
    ];
    const filledCount = completionItems.filter((i) => i.filled).length;
    const completionPercent = Math.round((filledCount / completionItems.length) * 100);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
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

            {/* Hero / Header Section */}
            <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                <div className="h-36 sm:h-44 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-500 relative p-4 flex justify-between items-start">
                    <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full text-white/90 text-xs font-medium border border-white/10">
                        <Microscope className="w-3.5 h-3.5" />
                        <span>Diagnostic Provider</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/diagnosis/settings">
                            <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur-md shadow-sm text-xs font-medium rounded-xl h-9"
                            >
                                <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            onClick={openEditModal}
                            className="bg-white text-purple-700 hover:bg-purple-50 shadow-md font-semibold text-xs rounded-xl h-9 transition-all active:scale-95"
                        >
                            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                        </Button>
                    </div>
                </div>

                <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-16 sm:-mt-20 mb-4">
                        <div className="relative">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-white dark:border-[#0B1020] bg-gray-50 dark:bg-gray-800 overflow-hidden shadow-lg shrink-0 flex items-center justify-center">
                                {profileImage ? (
                                    <img src={profileImage} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <Microscope className="w-14 h-14 text-purple-400" />
                                )}
                            </div>
                            {isApproved ? (
                                <div
                                    className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border-2 border-white dark:border-[#0B1020] shadow-sm uppercase tracking-wider flex items-center gap-1"
                                    title="Verified Provider"
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Verified
                                </div>
                            ) : (
                                <div
                                    className="absolute -bottom-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-[#0B1020] shadow-sm uppercase tracking-wider"
                                    title="Verification in progress"
                                >
                                    Pending
                                </div>
                            )}
                        </div>

                        <div className="flex-1 text-center sm:text-left space-y-1.5 mt-2 sm:mt-0 min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                                    {name}
                                </h1>
                                {profile?.nabl_accreditation && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                        <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> NABL Accredited
                                    </span>
                                )}
                            </div>

                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
                                <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                                <span>{profile?.city ? `${profile.city}, ${profile.state || ''}` : 'Location coordinates not configured'}</span>
                                {profile?.pincode && <span className="text-gray-400 dark:text-gray-500">• {profile.pincode}</span>}
                            </p>

                            {profile?.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-2xl line-clamp-2 mt-1">
                                    {profile.description}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Completion Bar */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Profile Completion</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Complete your center information to improve patient trust and discovery.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-purple-600 dark:text-purple-400">{completionPercent}%</span>
                            {completionPercent < 100 && (
                                <Button
                                    size="sm"
                                    onClick={openEditModal}
                                    variant="outline"
                                    className="text-xs border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl"
                                >
                                    Complete Profile
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grid of Profile Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* A. Provider Information */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-500" /> Provider Information
                        </CardTitle>
                        <button onClick={openEditModal} className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                            Edit
                        </button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3.5">
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Diagnostic Center</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{name}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Contact Person</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{user?.name || 'Owner / Administrator'}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Email</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right truncate max-w-[200px]" title={email}>
                                {email}
                            </span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Primary Phone</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{phone}</span>
                        </div>
                        {profile?.emergency_phone && (
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Emergency Phone</span>
                                <span className="font-semibold text-gray-900 dark:text-white text-right">{profile.emergency_phone}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Provider ID</span>
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-300 text-right truncate max-w-[180px]" title={profile?.id || user?.id}>
                                {profile?.id || user?.id || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Account Status</span>
                            <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                    isApproved
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}
                            >
                                {approvalStatus.toUpperCase()}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* B. Address & Location */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-500" /> Address & Location
                        </CardTitle>
                        <button onClick={openEditModal} className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                            Edit
                        </button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3.5">
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Street Address</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[220px]">
                                {profile?.address || 'Not specified'}
                            </span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">City</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{profile?.city || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">State</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{profile?.state || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Pincode</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">{profile?.pincode || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">GPS Coordinates</span>
                            <span className="font-mono text-xs text-gray-700 dark:text-gray-300 text-right">
                                {profile?.latitude && profile?.longitude
                                    ? `${Number(profile.latitude).toFixed(4)}, ${Number(profile.longitude).toFixed(4)}`
                                    : 'Not set'}
                            </span>
                        </div>
                        {profile?.latitude && profile?.longitude && (
                            <div className="pt-2">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> View on Google Maps
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* C. Operational Information */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" /> Operational Information
                        </CardTitle>
                        <button onClick={openEditModal} className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                            Edit
                        </button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3.5">
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Opening Hours</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-right">
                                {profile?.is_24_hours ? 'Open 24/7' : (profile?.opening_hours || '08:00 AM - 08:00 PM')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">24-Hour Availability</span>
                            <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    profile?.is_24_hours
                                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                {profile?.is_24_hours ? 'Yes, 24 Hours' : 'Standard Hours'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Walk-in Sample Collection</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Available
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Home Sample Collection</span>
                            <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    profile?.home_collection_available
                                        ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                {profile?.home_collection_available ? 'Available' : 'Not Offered'}
                            </span>
                        </div>
                        {profile?.home_collection_available && (
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Home Collection Fee</span>
                                <span className="font-semibold text-gray-900 dark:text-white text-right">
                                    {profile.home_collection_fee ? `₹${profile.home_collection_fee}` : 'Free / Included'}
                                </span>
                            </div>
                        )}
                        {profile?.website_url && (
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Website</span>
                                <a
                                    href={profile.website_url.startsWith('http') ? profile.website_url : `https://${profile.website_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline truncate max-w-[200px]"
                                >
                                    {profile.website_url}
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* D. Regulatory / Compliance */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#0B1020]">
                    <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/60 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-purple-500" /> Regulatory & Compliance
                        </CardTitle>
                        <button onClick={openEditModal} className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                            Edit
                        </button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3.5">
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Registration Number</span>
                            <span className="font-mono text-xs font-bold text-gray-900 dark:text-white text-right">
                                {profile?.registration_number || 'Not provided'}
                            </span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Diagnostic License No.</span>
                            <span className="font-mono text-xs font-bold text-gray-900 dark:text-white text-right">
                                {profile?.license_number || 'Not provided'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">NABL Accreditation</span>
                            <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    profile?.nabl_accreditation
                                        ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }`}
                            >
                                {profile?.nabl_accreditation ? 'Accredited' : 'No'}
                            </span>
                        </div>
                        {profile?.accreditations && (
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Other Certifications</span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-white text-right max-w-[200px]">
                                    {Array.isArray(profile.accreditations) ? profile.accreditations.join(', ') : profile.accreditations}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm pt-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">License Document</span>
                            {profile?.license_document_url ? (
                                <a
                                    href={profile.license_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                >
                                    <FileText className="w-3.5 h-3.5" /> View Uploaded License
                                </a>
                            ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">Not uploaded</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* EDIT PROFILE MODAL */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B1020] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                                    <Microscope className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Diagnosis Profile</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Update provider details, operational hours, and facility settings.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
                            {/* Profile Image */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Diagnostic Center Logo / Photo
                                </label>
                                <ProfileImageUpload
                                    currentImage={editForm.profile_image}
                                    name={editForm.name || 'Diagnostic Center'}
                                    onUploadComplete={(url: string) => setEditForm((f) => ({ ...f, profile_image: url }))}
                                    accentColor="purple"
                                />
                            </div>

                            {/* Section 1: Basic Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-gray-100 dark:border-gray-800 pb-1">
                                    Center Information
                                </h4>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Diagnostic Center Name <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Swastik Diagnostics & Imaging Center"
                                        className="rounded-xl"
                                    />
                                    {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Contact Phone <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                            placeholder="+91 9876543210"
                                            className="rounded-xl"
                                        />
                                        {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Emergency Contact Phone
                                        </label>
                                        <Input
                                            value={editForm.emergency_phone}
                                            onChange={(e) => setEditForm((f) => ({ ...f, emergency_phone: e.target.value }))}
                                            placeholder="+91 9876543211"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Email Address
                                        </label>
                                        <Input
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                            placeholder="center@example.com"
                                            className="rounded-xl"
                                        />
                                        {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Website URL
                                        </label>
                                        <Input
                                            value={editForm.website_url}
                                            onChange={(e) => setEditForm((f) => ({ ...f, website_url: e.target.value }))}
                                            placeholder="https://example.com"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        About / Description
                                    </label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                        rows={2}
                                        placeholder="Describe your laboratory facilities, specialized diagnostics, and test equipment..."
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Address & Location */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-gray-100 dark:border-gray-800 pb-1">
                                    Address & Map Location
                                </h4>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Street Address
                                    </label>
                                    <Input
                                        value={editForm.address}
                                        onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                                        placeholder="Shop / Unit No., Building, Street Name"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            City
                                        </label>
                                        <Input
                                            value={editForm.city}
                                            onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                                            placeholder="e.g. Mumbai"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            State
                                        </label>
                                        <Input
                                            value={editForm.state}
                                            onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                                            placeholder="e.g. Maharashtra"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Pincode
                                        </label>
                                        <Input
                                            value={editForm.pincode}
                                            onChange={(e) => setEditForm((f) => ({ ...f, pincode: e.target.value }))}
                                            placeholder="6-digit PIN"
                                            maxLength={6}
                                            className="rounded-xl"
                                        />
                                        {errors.pincode && <p className="text-xs text-rose-500 mt-1">{errors.pincode}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        GPS Location Picker
                                    </label>
                                    <LocationPicker
                                        latitude={editForm.latitude}
                                        longitude={editForm.longitude}
                                        onLocationChange={(lat: number, lng: number) => setEditForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                                    />
                                </div>
                            </div>

                            {/* Section 3: Operations & Services */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-gray-100 dark:border-gray-800 pb-1">
                                    Operations & Services
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Opening Hours
                                        </label>
                                        <Input
                                            value={editForm.opening_hours}
                                            onChange={(e) => setEditForm((f) => ({ ...f, opening_hours: e.target.value }))}
                                            placeholder="08:00 AM - 08:00 PM"
                                            disabled={editForm.is_24_hours}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.is_24_hours}
                                                onChange={(e) => setEditForm((f) => ({ ...f, is_24_hours: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Open 24 Hours</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Home Sample Collection</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Offer doorstep phlebotomist & sample collection services</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.home_collection_available}
                                                onChange={(e) => setEditForm((f) => ({ ...f, home_collection_available: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>

                                    {editForm.home_collection_available && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Home Sample Collection Fee (₹)
                                            </label>
                                            <Input
                                                type="number"
                                                value={editForm.home_collection_fee}
                                                onChange={(e) => setEditForm((f) => ({ ...f, home_collection_fee: e.target.value }))}
                                                placeholder="e.g. 100 (Leave blank or 0 for Free)"
                                                className="rounded-xl max-w-xs"
                                            />
                                            {errors.home_collection_fee && <p className="text-xs text-rose-500 mt-1">{errors.home_collection_fee}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Licensing & Compliance */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border-b border-gray-100 dark:border-gray-800 pb-1">
                                    Licensing & Compliance
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Registration Number
                                        </label>
                                        <Input
                                            value={editForm.registration_number}
                                            onChange={(e) => setEditForm((f) => ({ ...f, registration_number: e.target.value }))}
                                            placeholder="e.g. REG-DC-2024-889"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Diagnostic License Number
                                        </label>
                                        <Input
                                            value={editForm.license_number}
                                            onChange={(e) => setEditForm((f) => ({ ...f, license_number: e.target.value }))}
                                            placeholder="e.g. DL-MH-99201"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.nabl_accreditation}
                                                onChange={(e) => setEditForm((f) => ({ ...f, nabl_accreditation: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                        </label>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">NABL Accredited Facility</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Accreditations (comma-separated)
                                        </label>
                                        <Input
                                            value={editForm.accreditations}
                                            onChange={(e) => setEditForm((f) => ({ ...f, accreditations: e.target.value }))}
                                            placeholder="e.g. NABL, CAP, ISO 15189"
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                                disabled={isSaving}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md min-w-[120px]"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
