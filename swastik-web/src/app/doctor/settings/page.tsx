/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useState, useEffect } from 'react';
import {
    Save, Loader2, User, Stethoscope, ShieldCheck, Video,
    Bell, Lock, ChevronRight, CheckCircle2, AlertCircle, Edit3, X,
    Palette, Globe, EyeOff, Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { VideoUpload } from '@/components/shared/VideoUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import { SecuritySettings } from './SecuritySettings';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi, authApi } from '@/lib/api';
import { loadDoctorNotificationSettings, saveDoctorNotificationSettings } from '@/lib/doctorNotificationSettings';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';
import { useTheme } from '@/components/shared/ThemeProvider';
import { OnboardingChecklist } from '@/components/doctor/OnboardingChecklist';
import type { DoctorProfile } from '@/stores/doctorStore';

// Standardized specialization list — must match backend utils/specializations.js
const SPECIALIZATIONS = [
    'General Physician', 'Family Medicine', 'Gynecology', 'Obstetrics', 'Dermatology',
    'Pediatrics', 'Dentistry', 'Ophthalmology', 'ENT', 'Psychiatry', 'Psychology',
    'Orthopedics', 'Neurology', 'Neurosurgery', 'Urology', 'Nephrology', 'Pulmonology',
    'Cardiology', 'Cardiac Surgery', 'Gastroenterology', 'Endocrinology', 'Diabetology',
    'Oncology', 'General Surgery', 'Plastic Surgery', 'Vascular Surgery', 'Physiotherapy',
    'Radiology', 'Pathology', 'Anesthesiology', 'Emergency Medicine', 'Infectious Disease',
    'Rheumatology', 'Allergy & Immunology', 'Hematology', 'Geriatrics', 'Sports Medicine',
    'Pain Management', 'Nutrition & Dietetics', 'Ayurveda', 'Homeopathy', 'Other',
];

type TabId = 'personal' | 'professional' | 'compliance' | 'video' | 'notifications' | 'security' | 'appearance' | 'language' | 'privacy';

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'personal',      label: 'Personal Info',  icon: User,        desc: 'Name, photo & contact' },
    { id: 'professional',  label: 'Professional',   icon: Stethoscope, desc: 'Specialty, fee & experience' },
    { id: 'compliance',    label: 'Registration',   icon: ShieldCheck, desc: 'License & documents' },
    { id: 'video',         label: 'Intro Video',    icon: Video,       desc: '15-sec profile reel' },
    { id: 'notifications', label: 'Notifications',  icon: Bell,        desc: 'Email & SMS alerts' },
    { id: 'security',      label: 'Security',       icon: Lock,        desc: 'Change password' },
    { id: 'appearance',    label: 'Appearance',     icon: Palette,     desc: 'Theme & colors' },
    { id: 'language',      label: 'Language',       icon: Globe,       desc: 'App languages' },
    { id: 'privacy',       label: 'Privacy',        icon: EyeOff,      desc: 'Profile visibility' },
];

function SectionDivider({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3 mt-5 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">{title}</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>
    );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

function ViewRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
    return (
        <div>
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
            <div className={`text-sm text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : 'font-medium'} break-all`}>
                {value || <span className="text-gray-400 dark:text-gray-600 italic font-normal">Not provided</span>}
            </div>
        </div>
    );
}

function ProfileAvatar({ src, name, size = 'md' }: { src?: string | null; name?: string; size?: 'sm' | 'md' | 'lg' }) {
    const [errored, setErrored] = useState(false);
    const clean = (name || '').replace(/^(Dr\.|Dr|Prof\.|Prof)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase() || 'DC';
    const sz = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
    const textSz = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm';
    if (!src || errored) {
        return (
            <div className={`${sz} rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-200 dark:border-emerald-800/50 ${textSz}`}>
                {initials}
            </div>
        );
    }
    return <img src={src} alt="Profile" className={`${sz} rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0`} onError={() => setErrored(true)} />;
}

function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        >
            {children}
        </select>
    );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onChange}
            disabled={disabled}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${checked ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-6' : ''}`} />
        </button>
    );
}

export default function DoctorSettingsPage() {
    const user = useAuthStore(s => s.user);
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabId>('personal');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [showFullBio, setShowFullBio] = useState(false);

    const [rawDoctorProfile, setRawDoctorProfile] = useState<DoctorProfile | null>(null);
    const [profile, setProfile] = useState({
        name: '', phone: '', specialization: '', experience: '',
        qualification: '', consultationFee: '', languages: '', bio: '',
        registrationNumber: '', licenseNumber: '',
        licenseDocumentUrl: '', degreeCertificateUrl: '',
        profileImage: '' as string | null,
        introVideoUrl: '' as string | null,
        awards: '',
        consultationTypes: [] as string[],
        isPublicProfile: true,
        showPhoneNumber: false,
    });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [settings, setSettings] = useState({ emailNotifications: true, smsNotifications: true });
    const [savingNotifications, setSavingNotifications] = useState(false);

    const loadProfileData = async () => {
        try {
            const [profileRes, notifRes] = await Promise.all([
                doctorApi.getProfile(),
                loadDoctorNotificationSettings(user?.id),
            ]);
            if (profileRes.success) {
                const d = profileRes.data as any;
                const p = d?.profile || d?.data || d || {};
                setRawDoctorProfile(p);
                setProfile({
                    name: p.name || user?.name || '',
                    phone: p.phone || p.user?.phone || '',
                    specialization: p.specialization || '',
                    experience: p.experience_years?.toString() || p.experience?.toString() || '',
                    qualification: Array.isArray(p.qualifications) ? p.qualifications.join(', ') : (p.qualification || ''),
                    consultationFee: p.consultation_fee?.toString() || p.consultationFee?.toString() || '',
                    languages: Array.isArray(p.languages) ? p.languages.join(', ') : '',
                    bio: p.bio || '',
                    registrationNumber: p.registration_number || '',
                    licenseNumber: p.license_number || '',
                    licenseDocumentUrl: p.license_document_url || '',
                    degreeCertificateUrl: p.degree_certificate_url || '',
                    profileImage: p.profile_image_url || p.profile_image || p.profileImage || p.avatar_url || null,
                    introVideoUrl: p.intro_video_url || null,
                    awards: Array.isArray(p.awards) ? p.awards.join(', ') : (p.awards || ''),
                    consultationTypes: Array.isArray(p.consultation_types) ? p.consultation_types : ['In-Person', 'Video'],
                    isPublicProfile: p.is_public_profile ?? true,
                    showPhoneNumber: p.show_phone_number ?? false,
                });
            }
            if (notifRes.success) {
                setSettings({
                    emailNotifications: notifRes.settings.emailNotifications,
                    smsNotifications: notifRes.settings.smsNotifications,
                });
            }
        } catch { /* use defaults */ }
        setIsLoading(false);
    };

    useEffect(() => {
        loadProfileData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showStatus = (type: 'success' | 'error', message: string) => {
        setSaveStatus({ type, message });
        setTimeout(() => setSaveStatus(null), 4000);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        const previousApprovalStatus = user?.approval_status;
        
        // Only validate if we are actually editing. If we are just viewing, this shouldn't be called, but just in case.
        if (isEditing) {
            if (!profile.specialization.trim() || !profile.registrationNumber.trim() || !profile.licenseNumber.trim() || !profile.qualification.trim() || profile.experience.trim() === '' || profile.consultationFee.trim() === '') {
                showStatus('error', 'Please fill specialization, registration, license, qualification, experience, and consultation fee.');
                setIsSaving(false);
                return;
            }
            const experienceNumber = Number(profile.experience);
            const consultationFeeNumber = Number(profile.consultationFee);
            if (!Number.isFinite(experienceNumber) || experienceNumber < 0 || !Number.isFinite(consultationFeeNumber) || consultationFeeNumber < 0) {
                showStatus('error', 'Experience and consultation fee must be valid non-negative numbers.');
                setIsSaving(false);
                return;
            }
        }

        try {
            const authRes = await authApi.updateProfile({ name: profile.name, phone: profile.phone || undefined });
            if (!authRes.success) { showStatus('error', authRes.error || 'Failed to update account profile'); setIsSaving(false); return; }
            
            const experienceNumber = Number(profile.experience);
            const consultationFeeNumber = Number(profile.consultationFee);
            
            const res = await doctorApi.updateProfile({
                name: profile.name, specialization: profile.specialization,
                experience: experienceNumber,
                qualifications: profile.qualification.split(',').map(s => s.trim()).filter(Boolean),
                consultation_fee: consultationFeeNumber,
                languages: profile.languages.split(',').map(s => s.trim()).filter(Boolean),
                bio: profile.bio.trim() || undefined,
                registration_number: profile.registrationNumber.trim() || undefined,
                license_number: profile.licenseNumber.trim() || undefined,
                license_document_url: profile.licenseDocumentUrl.trim() || undefined,
                degree_certificate_url: profile.degreeCertificateUrl.trim() || undefined,
                profile_image: profile.profileImage || undefined,
                intro_video_url: profile.introVideoUrl || undefined,
                awards: profile.awards.split(',').map(s => s.trim()).filter(Boolean),
                consultation_types: profile.consultationTypes,
            });
            if (res.success) {
                const refreshedUser = await refreshAuthenticatedUser();
                showStatus('success', getResubmissionSuccessMessage(previousApprovalStatus, refreshedUser?.approval_status, 'Profile updated successfully!'));
                setIsEditing(false); // Go back to view mode on successful save
                loadProfileData(); // Reload to ensure we have latest saved data
            } else {
                showStatus('error', res.error || 'Failed to update profile');
            }
        } catch { showStatus('error', 'Network error. Please try again.'); }
        setIsSaving(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Reload profile data to discard unsaved changes
        loadProfileData();
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) { showStatus('error', 'New passwords do not match.'); return; }
        if (passwords.new.length < 6) { showStatus('error', 'Password must be at least 6 characters.'); return; }
        setIsSaving(true);
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) {
                showStatus('success', 'Password changed successfully!');
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                showStatus('error', (res as any).error || 'Failed to change password');
            }
        } catch { showStatus('error', 'Network error.'); }
        setIsSaving(false);
    };

    const handleNotificationToggle = async (key: 'emailNotifications' | 'smsNotifications') => {
        const newVal = !settings[key];
        const updated = { ...settings, [key]: newVal };
        setSettings(updated);
        setSavingNotifications(true);
        try {
            const res = await saveDoctorNotificationSettings(user?.id, updated);
            if (res.success) {
                showStatus('success', res.message || `${key === 'emailNotifications' ? 'Email' : 'SMS'} notifications ${newVal ? 'enabled' : 'disabled'}`);
            } else {
                setSettings(prev => ({ ...prev, [key]: !newVal }));
                showStatus('error', res.error || 'Failed to update notification settings');
            }
        } catch {
            setSettings(prev => ({ ...prev, [key]: !newVal }));
            showStatus('error', 'Network error');
        }
        setSavingNotifications(false);
    };

    const handlePrivacyToggle = async (key: 'isPublicProfile' | 'showPhoneNumber') => {
        const newVal = !profile[key];
        setProfile(p => ({ ...p, [key]: newVal }));
        try {
            const apiPayload = key === 'isPublicProfile' ? { is_public_profile: newVal } : { show_phone_number: newVal };
            const res = await doctorApi.updateProfile(apiPayload);
            if (res.success) {
                showStatus('success', 'Privacy settings updated successfully');
            } else {
                setProfile(p => ({ ...p, [key]: !newVal }));
                showStatus('error', res.error || 'Failed to update privacy settings');
            }
        } catch {
            setProfile(p => ({ ...p, [key]: !newVal }));
            showStatus('error', 'Network error');
        }
    };

    const toggleConsultationType = (type: string) => {
        if (!isEditing) return;
        const set = new Set(profile.consultationTypes);
        if (set.has(type)) set.delete(type); else set.add(type);
        setProfile(p => ({ ...p, consultationTypes: Array.from(set) }));
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
    );

    const isEditableTab = ['personal', 'professional', 'compliance', 'video'].includes(activeTab);
    const displaySpec = profile.specialization || 'Specialization not provided';
    const BIO_LIMIT = 280;
    const isLongBio = profile.bio && profile.bio.length > BIO_LIMIT;
    const bioDisplay = profile.bio && !showFullBio && isLongBio ? profile.bio.slice(0, BIO_LIMIT) + '...' : profile.bio;

    const switchTab = (id: TabId) => {
        if (isEditing && isEditableTab) {
            if (confirm('You have unsaved changes. Switch tabs?')) {
                setActiveTab(id); setIsEditing(false); loadProfileData();
            }
        } else { setActiveTab(id); setIsEditing(false); }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-5">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account, practice info &amp; preferences</p>
            </div>

            {saveStatus && (
                <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium mb-4 border ${saveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                    {saveStatus.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {saveStatus.message}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Sidebar */}
                <aside className="lg:w-56 shrink-0">
                    {/* Mobile: horizontal scroll */}
                    <div className="flex lg:hidden gap-1 overflow-x-auto pb-2">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => switchTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <Icon className="h-3.5 w-3.5" />{tab.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Desktop: vertical nav */}
                    <nav className="hidden lg:block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => switchTab(tab.id)}
                                    className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-gray-100 dark:border-gray-800/60 last:border-0 ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-r" />}
                                    <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>{tab.label}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{tab.desc}</p>
                                    </div>
                                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{TABS.find(t => t.id === activeTab)?.label}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{TABS.find(t => t.id === activeTab)?.desc}</p>
                            </div>
                            {isEditableTab && (
                                !isEditing ? (
                                    <button type="button" onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors">
                                        <Edit3 className="h-3.5 w-3.5" /> Edit
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleCancelEdit}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors">
                                        <X className="h-3.5 w-3.5" /> Cancel
                                    </button>
                                )
                            )}
                        </div>

                        <div className="p-5 space-y-4">

                            {/* PERSONAL INFO */}
                            {activeTab === 'personal' && (
                                <div className="space-y-4">
                                    {!isEditing && (
                                        <div className="flex items-center gap-4">
                                            <ProfileAvatar src={profile.profileImage} name={profile.name} size="lg" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{profile.name || 'Doctor Name'}</h3>
                                                    {user?.approval_status === 'approved' && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{displaySpec}</p>
                                                {user?.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="flex justify-center py-2">
                                            <ProfileImageUpload
                                                currentImage={profile.profileImage}
                                                name={profile.name}
                                                onUploadComplete={url => setProfile(p => ({ ...p, profileImage: url }))}
                                                accentColor="emerald"
                                            />
                                        </div>
                                    )}

                                    {rawDoctorProfile && !isEditing && (
                                        <OnboardingChecklist profile={rawDoctorProfile} variant="card" />
                                    )}

                                    <SectionDivider title="Basic Information" />
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FieldRow label="Full Name" required>
                                                <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Full Name" />
                                            </FieldRow>
                                            <FieldRow label="Email Address">
                                                <Input value={user?.email || ''} readOnly className="opacity-60 cursor-not-allowed" />
                                            </FieldRow>
                                            <FieldRow label="Phone Number">
                                                <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                                            <ViewRow label="Full Name" value={profile.name} />
                                            <ViewRow label="Email" value={user?.email} />
                                            <ViewRow label="Phone" value={profile.phone} />
                                        </div>
                                    )}

                                    <SectionDivider title="Profile Summary" />
                                    {isEditing ? (
                                        <FieldRow label="About / Bio">
                                            <textarea
                                                value={profile.bio}
                                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                                placeholder="Short clinical background, areas of focus, and patient-care approach..."
                                                rows={4}
                                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition-all"
                                            />
                                        </FieldRow>
                                    ) : (
                                        <div>
                                            {profile.bio ? (
                                                <>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{bioDisplay}</p>
                                                    {isLongBio && (
                                                        <button type="button" onClick={() => setShowFullBio(v => !v)}
                                                            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 hover:underline">
                                                            {showFullBio ? 'Show less' : 'Show more'}
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                                    No bio provided.{' '}
                                                    <button type="button" onClick={() => setIsEditing(true)} className="text-emerald-600 dark:text-emerald-400 not-italic font-semibold hover:underline">Add Summary</button>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Personal Info</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PROFESSIONAL */}
                            {activeTab === 'professional' && (
                                <div className="space-y-4">
                                    <SectionDivider title="Medical Expertise" />
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FieldRow label="Specialization" required>
                                                <SelectField value={profile.specialization} onChange={v => setProfile(p => ({ ...p, specialization: v }))}>
                                                    <option value="">Select specialization</option>
                                                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </SelectField>
                                            </FieldRow>
                                            <FieldRow label="Years of Experience" required>
                                                <Input type="number" min="0" value={profile.experience} onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))} placeholder="e.g. 8" />
                                            </FieldRow>
                                            <div className="sm:col-span-2">
                                                <FieldRow label="Qualifications / Degrees" required>
                                                    <Input value={profile.qualification} onChange={e => setProfile(p => ({ ...p, qualification: e.target.value }))} placeholder="MBBS, MD Internal Medicine" />
                                                </FieldRow>
                                            </div>
                                            <FieldRow label="Languages Spoken">
                                                <Input value={profile.languages} onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))} placeholder="Hindi, English, Marathi" />
                                            </FieldRow>
                                            <FieldRow label="Awards & Achievements">
                                                <Input value={profile.awards} onChange={e => setProfile(p => ({ ...p, awards: e.target.value }))} placeholder="Best Doctor Award 2022..." />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                            <ViewRow label="Specialization" value={profile.specialization || displaySpec} />
                                            <ViewRow label="Years of Experience" value={profile.experience ? `${profile.experience} yrs` : ''} />
                                            <div className="sm:col-span-2"><ViewRow label="Qualifications" value={profile.qualification} /></div>
                                            <ViewRow label="Languages" value={profile.languages} />
                                            <ViewRow label="Awards" value={profile.awards} />
                                        </div>
                                    )}

                                    <SectionDivider title="Practice & Fees" />
                                    {isEditing ? (
                                        <div className="max-w-xs">
                                            <FieldRow label="Consultation Fee (₹)" required>
                                                <Input type="number" value={profile.consultationFee} onChange={e => setProfile(p => ({ ...p, consultationFee: e.target.value }))} placeholder="e.g. 500" />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <ViewRow label="Consultation Fee" value={profile.consultationFee ? `₹${profile.consultationFee}` : ''} />
                                    )}

                                    <SectionDivider title="Consultation Types" />
                                    <div className="flex flex-wrap gap-2">
                                        {['In-Person', 'Video'].map(type => {
                                            const active = profile.consultationTypes.includes(type);
                                            if (!isEditing && !active) return null;
                                            return (
                                                <button key={type} type="button" onClick={() => toggleConsultationType(type)} disabled={!isEditing}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'} ${!isEditing ? 'cursor-default' : ''}`}>
                                                    {active && <Check className="h-3.5 w-3.5" />}
                                                    {type === 'In-Person' ? '🏥' : '📹'} {type}
                                                </button>
                                            );
                                        })}
                                        {!isEditing && profile.consultationTypes.length === 0 && <span className="text-sm text-gray-400 italic">None selected</span>}
                                    </div>

                                    {isEditing && (
                                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Professional Info</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* REGISTRATION */}
                            {activeTab === 'compliance' && (
                                <div className="space-y-4">
                                    <SectionDivider title="Registration Details" />
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FieldRow label="Medical Council Registration No." required>
                                                <Input value={profile.registrationNumber} onChange={e => setProfile(p => ({ ...p, registrationNumber: e.target.value }))} placeholder="MCI/State council registration number" />
                                            </FieldRow>
                                            <FieldRow label="Medical License Number" required>
                                                <Input value={profile.licenseNumber} onChange={e => setProfile(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="License number" />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                            <ViewRow label="Registration No." value={profile.registrationNumber} mono />
                                            <ViewRow label="License Number" value={profile.licenseNumber} mono />
                                        </div>
                                    )}

                                    <SectionDivider title="Compliance Documents" />
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <ComplianceDocumentUpload label="Medical License Document" providerType="doctor" value={profile.licenseDocumentUrl}
                                                onChange={url => setProfile(prev => ({ ...prev, licenseDocumentUrl: url }))}
                                                description="Upload the medical license document for admin review." />
                                            <ComplianceDocumentUpload label="Degree Certificate (MBBS / MD)" providerType="doctor" value={profile.degreeCertificateUrl}
                                                onChange={url => setProfile(prev => ({ ...prev, degreeCertificateUrl: url }))}
                                                description="Upload your MBBS/MD degree certificate." />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {[
                                                { label: 'Medical License Document', url: profile.licenseDocumentUrl },
                                                { label: 'Degree Certificate (MBBS / MD)', url: profile.degreeCertificateUrl },
                                            ].map(doc => (
                                                <div key={doc.label} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.label}</p>
                                                        {doc.url
                                                            ? <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>
                                                            : <span className="text-xs text-amber-500 font-semibold flex items-center gap-1 mt-0.5"><AlertCircle className="w-3 h-3" /> Pending</span>}
                                                    </div>
                                                    {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View</a>}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Registration Info</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* INTRO VIDEO */}
                            {activeTab === 'video' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">A short <strong>15-second intro video</strong> helps patients build trust before booking. Doctors with intro videos get up to 3× more bookings.</p>
                                    {!isEditing && profile.introVideoUrl ? (
                                        <div className="flex justify-center py-2">
                                            <div className="aspect-[9/16] w-full max-w-[240px] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow">
                                                <video src={profile.introVideoUrl} controls className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    ) : isEditing ? (
                                        <VideoUpload currentVideo={profile.introVideoUrl} onUploadComplete={url => { setProfile(p => ({ ...p, introVideoUrl: url })); handleSaveProfile(); }} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center gap-3">
                                            <Video className="h-8 w-8 text-gray-400" />
                                            <p className="text-sm font-medium text-gray-500">No intro video uploaded yet</p>
                                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Upload Video</Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NOTIFICATIONS */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-1">
                                    <SectionDivider title="Alert Preferences" />
                                    {([
                                        { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Appointment confirmations and updates via email' },
                                        { key: 'smsNotifications' as const, label: 'SMS Notifications', desc: 'Real-time SMS alerts for new bookings and cancellations' },
                                    ]).map(item => (
                                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                                            </div>
                                            <Toggle checked={settings[item.key]} onChange={() => handleNotificationToggle(item.key)} disabled={savingNotifications} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* SECURITY */}
                            {activeTab === 'security' && <SecuritySettings showStatus={showStatus} />}

                            {/* APPEARANCE */}
                            {activeTab === 'appearance' && (
                                <div className="space-y-3">
                                    <SectionDivider title="Theme" />
                                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                                        <button onClick={() => setTheme('dark')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Dark</button>
                                        <button onClick={() => setTheme('light')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>Light</button>
                                    </div>
                                    <p className="text-xs text-gray-400">Choose your preferred portal theme. This setting is saved per device.</p>
                                </div>
                            )}

                            {/* LANGUAGE */}
                            {activeTab === 'language' && (
                                <div className="space-y-3">
                                    <SectionDivider title="Language Settings" />
                                    <div className="max-w-xs">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Interface Language</label>
                                        <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                                            <option>English (US)</option>
                                            <option>Hindi (India)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* PRIVACY */}
                            {activeTab === 'privacy' && (
                                <div className="space-y-1">
                                    <SectionDivider title="Profile Visibility" />
                                    {([
                                        { key: 'isPublicProfile' as const, label: 'Public Profile', desc: 'Allow patients to find you in search.' },
                                        { key: 'showPhoneNumber' as const, label: 'Show Phone Number', desc: 'Display your direct contact number on your profile.' },
                                    ]).map(item => (
                                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                                            </div>
                                            <Toggle checked={profile[item.key]} onChange={() => handlePrivacyToggle(item.key)} />
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
