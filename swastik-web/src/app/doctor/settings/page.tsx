'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfileImageUpload } from '@/components/shared/ProfileImageUpload';
import { ComplianceDocumentUpload } from '@/components/shared/ComplianceDocumentUpload';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi, authApi } from '@/lib/api';
import { loadDoctorNotificationSettings, saveDoctorNotificationSettings } from '@/lib/doctorNotificationSettings';
import { getResubmissionSuccessMessage, refreshAuthenticatedUser } from '@/lib/authSession';

export default function DoctorSettingsPage() {
    const user = useAuthStore((s) => s.user);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        specialization: '',
        consultationFee: '',
        registrationNumber: '',
        licenseNumber: '',
        licenseDocumentUrl: '',
        degreeCertificateUrl: '',
        profileImage: '' as string | null,
    });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [settings, setSettings] = useState({
        emailNotifications: true,
        smsNotifications: true,
    });
    const [savingNotifications, setSavingNotifications] = useState(false);

    useEffect(() => {
        (async () => {
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
                        consultationFee: p.consultation_fee?.toString() || p.consultationFee?.toString() || '',
                        registrationNumber: p.registration_number || '',
                        licenseNumber: p.license_number || '',
                        licenseDocumentUrl: p.license_document_url || '',
                        degreeCertificateUrl: p.degree_certificate_url || '',
                        profileImage: p.profile_image_url || p.profile_image || p.profileImage || p.avatar_url || null,
                    });
                }
                if (notifRes.success) {
                    const n = notifRes.settings;
                    setSettings({
                        emailNotifications: n.emailNotifications,
                        smsNotifications: n.smsNotifications,
                    });
                }
            } catch { /* use defaults */ }
            setIsLoading(false);
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        const previousApprovalStatus = user?.approval_status;
        try {
            const authRes = await authApi.updateProfile({
                name: profile.name,
                phone: profile.phone || undefined,
            });
            if (!authRes.success) {
                setSaveStatus({ type: 'error', message: authRes.error || 'Failed to update account profile' });
                setIsSaving(false);
                return;
            }

            const res = await doctorApi.updateProfile({
                name: profile.name,
                specialization: profile.specialization,
                consultation_fee: Number(profile.consultationFee) || undefined,
                registration_number: profile.registrationNumber.trim() || undefined,
                license_number: profile.licenseNumber.trim() || undefined,
                license_document_url: profile.licenseDocumentUrl.trim() || undefined,
                degree_certificate_url: profile.degreeCertificateUrl.trim() || undefined,
                profile_image: profile.profileImage || undefined,
            });
            if (res.success) {
                const refreshedUser = await refreshAuthenticatedUser();
                setSaveStatus({
                    type: 'success',
                    message: getResubmissionSuccessMessage(previousApprovalStatus, refreshedUser?.approval_status, 'Profile updated successfully!'),
                });
            } else {
                setSaveStatus({ type: 'error', message: res.error || 'Failed to update profile' });
            }
        } catch {
            setSaveStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsSaving(false);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            setSaveStatus({ type: 'error', message: 'New passwords do not match.' });
            return;
        }
        if (passwords.new.length < 6) {
            setSaveStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }
        setIsSaving(true);
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) {
                setSaveStatus({ type: 'success', message: 'Password changed successfully!' });
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                setSaveStatus({ type: 'error', message: (res as any).error || 'Failed to change password' });
            }
        } catch {
            setSaveStatus({ type: 'error', message: 'Network error.' });
        }
        setIsSaving(false);
        setTimeout(() => setSaveStatus(null), 4000);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account preferences</p></div>
            </div>

            {saveStatus && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${saveStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {saveStatus.message}
                </div>
            )}

            <Card>
                <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <ProfileImageUpload
                            currentImage={profile.profileImage}
                            name={profile.name}
                            onUploadComplete={(url) => setProfile(p => ({ ...p, profileImage: url }))}
                            accentColor="emerald"
                        />
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label><Input value={user?.email || ''} readOnly /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label><Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91..." /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialization</label><Input value={profile.specialization} onChange={e => setProfile(p => ({ ...p, specialization: e.target.value }))} placeholder="Enter specialization" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consultation Fee (₹)</label>
                            <Input type="number" value={profile.consultationFee} onChange={e => setProfile(p => ({ ...p, consultationFee: e.target.value }))} placeholder="Enter fee" />
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number</label><Input value={profile.registrationNumber} onChange={e => setProfile(p => ({ ...p, registrationNumber: e.target.value }))} placeholder="Medical council registration number" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label><Input value={profile.licenseNumber} onChange={e => setProfile(p => ({ ...p, licenseNumber: e.target.value }))} placeholder="Medical license number" /></div>
                        <ComplianceDocumentUpload
                            label="Medical License Document"
                            providerType="doctor"
                            value={profile.licenseDocumentUrl}
                            onChange={(url) => setProfile((prev) => ({ ...prev, licenseDocumentUrl: url }))}
                            description="Upload or paste the URL for the medical license that admin should review."
                        />
                        <ComplianceDocumentUpload
                            label="Degree Certificate"
                            providerType="doctor"
                            value={profile.degreeCertificateUrl}
                            onChange={(url) => setProfile((prev) => ({ ...prev, degreeCertificateUrl: url }))}
                            description="Upload or paste the URL for your MBBS/degree certificate."
                        />
                        <Button onClick={handleSaveProfile} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Save Profile</Button>
                    </div>
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {([{ key: 'emailNotifications' as const, label: 'Email Notifications' }, { key: 'smsNotifications' as const, label: 'SMS Notifications' }]).map(item => (
                            <div key={item.key} className="flex items-center justify-between py-2">
                                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                                <button onClick={async () => {
                                    const newVal = !settings[item.key];
                                    const updated = { ...settings, [item.key]: newVal };
                                    setSettings(updated);
                                    setSavingNotifications(true);
                                    try {
                                        const res = await saveDoctorNotificationSettings(user?.id, updated);
                                        if (res.success) {
                                            setSaveStatus({
                                                type: 'success',
                                                message: res.message || `${item.label} ${newVal ? 'enabled' : 'disabled'}`,
                                            });
                                        } else {
                                            // Revert on failure
                                            setSettings(prev => ({ ...prev, [item.key]: !newVal }));
                                            setSaveStatus({ type: 'error', message: res.error || 'Failed to update notification settings' });
                                        }
                                    } catch {
                                        setSettings(prev => ({ ...prev, [item.key]: !newVal }));
                                        setSaveStatus({ type: 'error', message: 'Network error' });
                                    }
                                    setSavingNotifications(false);
                                    setTimeout(() => setSaveStatus(null), 3000);
                                }}
                                    disabled={savingNotifications}
                                    className={`w-12 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                    <div className={`w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transform transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
