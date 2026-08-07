'use client';

import { useState, useEffect } from 'react';
import {
    Save, Loader2, User, Stethoscope, ShieldCheck, Video,
    Bell, Lock, ChevronRight, CheckCircle2, AlertCircle, Edit3, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { VideoUpload } from '@/components/shared/VideoUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi, authApi } from '@/lib/api';
import { loadDoctorNotificationSettings, saveDoctorNotificationSettings } from '@/lib/doctorNotificationSettings';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';

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

type TabId = 'personal' | 'professional' | 'compliance' | 'video' | 'notifications' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'personal',      label: 'Personal Info',  icon: User,        desc: 'Name, photo & contact' },
    { id: 'professional',  label: 'Professional',   icon: Stethoscope, desc: 'Specialty, fee & experience' },
    { id: 'compliance',    label: 'Registration',   icon: ShieldCheck, desc: 'License & documents' },
    { id: 'video',         label: 'Intro Video',    icon: Video,       desc: '15-sec profile reel' },
    { id: 'notifications', label: 'Notifications',  icon: Bell,        desc: 'Email & SMS alerts' },
    { id: 'security',      label: 'Security',       icon: Lock,        desc: 'Change password' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 mt-2">
            {children}
        </p>
    );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

function ViewField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</span>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || <span className="text-gray-400 italic">Not provided</span>}</div>
        </div>
    );
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
    const [activeTab, setActiveTab] = useState<TabId>('personal');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [profile, setProfile] = useState({
        name: '', phone: '', specialization: '', experience: '',
        qualification: '', consultationFee: '', languages: '', bio: '',
        registrationNumber: '', licenseNumber: '',
        licenseDocumentUrl: '', degreeCertificateUrl: '',
        profileImage: '' as string | null,
        introVideoUrl: '' as string | null,
        awards: '',
        consultationTypes: [] as string[],
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

    const activeTabDef = TABS.find(t => t.id === activeTab)!;
    const ActiveIcon = activeTabDef.icon;
    const isEditableTab = ['personal', 'professional', 'compliance', 'video'].includes(activeTab);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account, practice info &amp; preferences</p>
            </div>

            {/* Status Toast */}
            {saveStatus && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${saveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
                    {saveStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {saveStatus.message}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <aside className="lg:w-64 shrink-0">
                    <nav className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        {TABS.map((tab, idx) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (isEditing && isEditableTab) {
                                            if (confirm('You have unsaved changes. Are you sure you want to switch tabs?')) {
                                                setActiveTab(tab.id);
                                                setIsEditing(false);
                                                loadProfileData();
                                            }
                                        } else {
                                            setActiveTab(tab.id);
                                            setIsEditing(false);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all group ${idx !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                >
                                    <span className={`flex items-center justify-center h-9 w-9 rounded-xl shrink-0 transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/30 dark:group-hover:text-emerald-400'}`}>
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>{tab.label}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{tab.desc}</p>
                                    </div>
                                    {isActive && <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content Panel */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-500 text-white shadow-md">
                                    <ActiveIcon className="h-4 w-4" />
                                </span>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{activeTabDef.label}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{activeTabDef.desc}</p>
                                </div>
                            </div>
                            {isEditableTab && (
                                <div>
                                    {!isEditing ? (
                                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                                            Edit Details
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} leftIcon={<X className="w-3.5 h-3.5" />} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            Cancel Editing
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 space-y-6">

                            {/* PERSONAL INFO */}
                            {activeTab === 'personal' && (
                                <>
                                    <div className="flex justify-center">
                                        {isEditing ? (
                                            <ProfileImageUpload
                                                currentImage={profile.profileImage}
                                                name={profile.name}
                                                onUploadComplete={url => setProfile(p => ({ ...p, profileImage: url }))}
                                                accentColor="emerald"
                                            />
                                        ) : (
                                            <div className="relative group">
                                                {profile.profileImage ? (
                                                    <img src={profile.profileImage} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md" />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-md">
                                                        {(profile.name || 'D').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <SectionLabel>Basic Information</SectionLabel>
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ViewField label="Full Name" value={profile.name} />
                                            <ViewField label="Email Address" value={user?.email || ''} />
                                            <ViewField label="Phone Number" value={profile.phone} />
                                        </div>
                                    )}
                                    <SectionLabel>Profile Summary</SectionLabel>
                                    {isEditing ? (
                                        <FieldRow label="About / Bio">
                                            <textarea
                                                value={profile.bio}
                                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                                placeholder="Short clinical background, areas of focus, and patient-care approach..."
                                                rows={4}
                                                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition-all"
                                            />
                                        </FieldRow>
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{profile.bio || <span className="text-gray-400 italic">No bio provided.</span>}</p>
                                        </div>
                                    )}
                                    
                                    {isEditing && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Personal Info</Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* PROFESSIONAL */}
                            {activeTab === 'professional' && (
                                <>
                                    <SectionLabel>Medical Expertise</SectionLabel>
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                    <Input value={profile.qualification} onChange={e => setProfile(p => ({ ...p, qualification: e.target.value }))} placeholder="MBBS, MD Internal Medicine (comma separated)" />
                                                </FieldRow>
                                            </div>
                                            <FieldRow label="Languages Spoken">
                                                <Input value={profile.languages} onChange={e => setProfile(p => ({ ...p, languages: e.target.value }))} placeholder="Hindi, English, Marathi" />
                                            </FieldRow>
                                            <FieldRow label="Awards &amp; Achievements">
                                                <Input value={profile.awards} onChange={e => setProfile(p => ({ ...p, awards: e.target.value }))} placeholder="Best Doctor Award 2022..." />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ViewField label="Specialization" value={profile.specialization} />
                                            <ViewField label="Years of Experience" value={profile.experience ? `${profile.experience} Years` : ''} />
                                            <div className="sm:col-span-2">
                                                <ViewField label="Qualifications / Degrees" value={profile.qualification} />
                                            </div>
                                            <ViewField label="Languages Spoken" value={profile.languages} />
                                            <ViewField label="Awards & Achievements" value={profile.awards} />
                                        </div>
                                    )}
                                    
                                    <SectionLabel>Practice &amp; Fees</SectionLabel>
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FieldRow label="Consultation Fee (₹)" required>
                                                <Input type="number" value={profile.consultationFee} onChange={e => setProfile(p => ({ ...p, consultationFee: e.target.value }))} placeholder="e.g. 500" />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ViewField label="Consultation Fee (₹)" value={profile.consultationFee ? `₹${profile.consultationFee}` : ''} />
                                        </div>
                                    )}

                                    <SectionLabel>Consultation Types</SectionLabel>
                                    <div className="flex flex-wrap gap-3">
                                        {['In-Person', 'Video'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => toggleConsultationType(type)}
                                                disabled={!isEditing}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${profile.consultationTypes.includes(type) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-300'} ${!isEditing && !profile.consultationTypes.includes(type) ? 'opacity-50 cursor-not-allowed' : ''} ${!isEditing ? 'cursor-default hover:border-transparent' : ''}`}
                                            >
                                                {profile.consultationTypes.includes(type) && <CheckCircle2 className="h-4 w-4" />}
                                                {type === 'In-Person' ? '🏥' : '📹'} {type}
                                            </button>
                                        ))}
                                    </div>
                                    {isEditing && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Professional Info</Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* REGISTRATION & COMPLIANCE */}
                            {activeTab === 'compliance' && (
                                <>
                                    <SectionLabel>Registration Details</SectionLabel>
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FieldRow label="Medical Council Registration No." required>
                                                <Input value={profile.registrationNumber} onChange={e => setProfile(p => ({ ...p, registrationNumber: e.target.value }))} placeholder="MCI/State council registration number" />
                                            </FieldRow>
                                            <FieldRow label="Medical License Number" required>
                                                <Input value={profile.licenseNumber} onChange={e => setProfile(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="License number" />
                                            </FieldRow>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ViewField label="Medical Council Registration No." value={profile.registrationNumber} />
                                            <ViewField label="Medical License Number" value={profile.licenseNumber} />
                                        </div>
                                    )}
                                    
                                    <SectionLabel>Compliance Documents</SectionLabel>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <ComplianceDocumentUpload
                                                label="Medical License Document"
                                                providerType="doctor"
                                                value={profile.licenseDocumentUrl}
                                                onChange={url => setProfile(prev => ({ ...prev, licenseDocumentUrl: url }))}
                                                description="Upload the medical license document for admin review."
                                            />
                                            <ComplianceDocumentUpload
                                                label="Degree Certificate (MBBS / MD)"
                                                providerType="doctor"
                                                value={profile.degreeCertificateUrl}
                                                onChange={url => setProfile(prev => ({ ...prev, degreeCertificateUrl: url }))}
                                                description="Upload your MBBS/MD degree certificate."
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                <div>
                                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Medical License Document</span>
                                                    {profile.licenseDocumentUrl ? (
                                                        <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Uploaded</span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-amber-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Pending Upload</span>
                                                    )}
                                                </div>
                                                {profile.licenseDocumentUrl && (
                                                    <a href={profile.licenseDocumentUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">View Document</a>
                                                )}
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                                <div>
                                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Degree Certificate (MBBS / MD)</span>
                                                    {profile.degreeCertificateUrl ? (
                                                        <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Uploaded</span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-amber-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Pending Upload</span>
                                                    )}
                                                </div>
                                                {profile.degreeCertificateUrl && (
                                                    <a href={profile.degreeCertificateUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">View Document</a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {isEditing && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                            <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Registration Info</Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* INTRO VIDEO */}
                            {activeTab === 'video' && (
                                <>
                                    <SectionLabel>Profile Intro Video</SectionLabel>
                                    {!isEditing && profile.introVideoUrl ? (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <div className="aspect-[9/16] w-full max-w-[280px] mx-auto bg-black rounded-xl overflow-hidden relative shadow-lg">
                                                <video src={profile.introVideoUrl} controls className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300 mb-4">
                                                📱 Upload a <strong>15-second intro video</strong> that appears as an Instagram-style story ring on your profile. Doctors with intro videos get <strong>3× more bookings</strong>.
                                            </div>
                                            {isEditing ? (
                                                <VideoUpload
                                                    currentVideo={profile.introVideoUrl}
                                                    onUploadComplete={url => {
                                                        setProfile(p => ({ ...p, introVideoUrl: url }));
                                                        handleSaveProfile();
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                                    <Video className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                    <p className="text-sm font-medium text-gray-500">No intro video uploaded yet.</p>
                                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="mt-4">Upload Video</Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* NOTIFICATIONS */}
                            {activeTab === 'notifications' && (
                                <>
                                    <SectionLabel>Alert Preferences</SectionLabel>
                                    <div className="space-y-1">
                                        {([
                                            { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive appointment confirmations and updates via email', emoji: '📧' },
                                            { key: 'smsNotifications' as const, label: 'SMS Notifications', desc: 'Get real-time SMS alerts for new bookings and cancellations', emoji: '💬' },
                                        ]).map(item => (
                                            <div key={item.key} className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{item.emoji}</span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <Toggle
                                                    checked={settings[item.key]}
                                                    onChange={() => handleNotificationToggle(item.key)}
                                                    disabled={savingNotifications}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* SECURITY */}
                            {activeTab === 'security' && (
                                <>
                                    <SectionLabel>Change Password</SectionLabel>
                                    <div className="max-w-sm space-y-4 bg-gray-50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <FieldRow label="Current Password">
                                            <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                                        </FieldRow>
                                        <FieldRow label="New Password">
                                            <Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Min. 6 characters" />
                                        </FieldRow>
                                        <FieldRow label="Confirm New Password">
                                            <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter new password" />
                                        </FieldRow>
                                        <Button variant="outline" onClick={handleChangePassword} isLoading={isSaving} leftIcon={<Lock className="h-4 w-4" />} className="w-full mt-2">Update Password</Button>
                                    </div>
                                    <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 max-w-sm">
                                        🔐 Use a strong password with letters, numbers and symbols. Never share your credentials.
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
