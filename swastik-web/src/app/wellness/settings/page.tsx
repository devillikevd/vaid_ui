'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Camera,
    CheckCircle,
    Globe,
    IndianRupee,
    Loader2,
    RefreshCw,
    Save,
    Settings,
    Tag,
    User,
    Video,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CoachProfile {
    id: string;
    name: string;
    headline?: string | null;
    bio?: string | null;
    sub_role?: string | null;
    approval_status?: string;
    coach_types?: string[];
    specialties?: string[];
    expertise_tags?: string[];
    languages?: string[];
    session_modes?: string[];
    session_fee?: number | string;
    video_session_fee?: number | string;
    monthly_plan_fee?: number | string;
    rating?: number;
    total_reviews?: number;
    city?: string | null;
    profile_image_url?: string | null;
    is_available?: boolean;
    is_accepting_clients?: boolean;
}

const SUB_ROLES = ['trainer', 'yoga_instructor', 'nutritionist', 'physio', 'mental_health'];
const SESSION_MODES = ['video', 'audio', 'chat', 'in_person'];
const COACH_TYPES = ['gym_trainer', 'yoga', 'nutritionist', 'physiotherapy', 'meditation', 'sports_coach', 'personal_trainer'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

export default function WellnessSettingsPage() {
    const toast = useToast();
    const [profile, setProfile] = useState<CoachProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [headline, setHeadline] = useState('');
    const [bio, setBio] = useState('');
    const [subRole, setSubRole] = useState('');
    const [city, setCity] = useState('');
    const [coachTypes, setCoachTypes] = useState<string[]>([]);
    const [specialties, setSpecialties] = useState('');
    const [expertiseTags, setExpertiseTags] = useState('');
    const [languages, setLanguages] = useState<string[]>([]);
    const [sessionModes, setSessionModes] = useState<string[]>([]);
    const [sessionFee, setSessionFee] = useState('');
    const [videoSessionFee, setVideoSessionFee] = useState('');
    const [monthlyPlanFee, setMonthlyPlanFee] = useState('');

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getCoachProfile();
            if (!res.success) throw new Error(res.error || 'Failed to load profile');
            const p = res.data as CoachProfile;
            setProfile(p);
            setHeadline(p.headline || '');
            setBio(p.bio || '');
            setSubRole(p.sub_role || '');
            setCity(p.city || '');
            setCoachTypes(Array.isArray(p.coach_types) ? p.coach_types : []);
            setSpecialties(Array.isArray(p.specialties) ? p.specialties.join(', ') : '');
            setExpertiseTags(Array.isArray(p.expertise_tags) ? p.expertise_tags.join(', ') : '');
            setLanguages(Array.isArray(p.languages) ? p.languages : []);
            setSessionModes(Array.isArray(p.session_modes) ? p.session_modes : ['video']);
            setSessionFee(p.session_fee != null ? String(p.session_fee) : '');
            setVideoSessionFee(p.video_session_fee != null ? String(p.video_session_fee) : '');
            setMonthlyPlanFee(p.monthly_plan_fee != null ? String(p.monthly_plan_fee) : '');
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load profile');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data: Record<string, unknown> = {
                headline: headline.trim() || null,
                bio: bio.trim() || null,
                sub_role: subRole || null,
                city: city.trim() || null,
                coach_types: coachTypes,
                specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
                expertise_tags: expertiseTags.split(',').map(s => s.trim()).filter(Boolean),
                languages,
                session_modes: sessionModes,
                session_fee: sessionFee ? Number(sessionFee) : null,
                video_session_fee: videoSessionFee ? Number(videoSessionFee) : null,
                monthly_plan_fee: monthlyPlanFee ? Number(monthlyPlanFee) : null,
            };
            const res = await wellnessApi.updateCoachProfile(data);
            if (!res.success) throw new Error(res.error || 'Failed to save');
            toast.success('Profile saved', 'Your profile has been updated. Changes are visible to patients.');
            await loadProfile();
        } catch (err) {
            toast.error('Save failed', err instanceof Error ? err.message : 'Unable to save profile');
        } finally {
            setSaving(false);
        }
    };

    const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
        setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading settings...</span></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your profile, fees, and coaching preferences.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadProfile} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={saving}>Refresh</Button>
                </div>
            </div>

            {/* Approval status */}
            {profile?.approval_status && profile.approval_status !== 'approved' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <strong>Profile Status:</strong> {profile.approval_status.replace(/_/g, ' ')}. Complete all fields below to speed up approval.
                </div>
            )}

            <form onSubmit={saveProfile} className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-lime-600" /> Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <input type="text" value={profile?.name || ''} disabled className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" />
                                <p className="text-xs text-gray-400 mt-1">Contact admin to change your name.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Role</label>
                                <select value={subRole} onChange={e => setSubRole(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                    <option value="">Select role</option>
                                    {SUB_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headline</label>
                            <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g., Certified Personal Trainer | 5+ years" maxLength={120}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell patients about your experience, certifications, and approach..."
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" maxLength={1000} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Mumbai" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                        </div>
                    </CardContent>
                </Card>

                {/* Coach Types & Specialties */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-lime-600" /> Expertise</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Coach Types</label>
                            <div className="flex flex-wrap gap-2">
                                {COACH_TYPES.map(type => (
                                    <button key={type} type="button" onClick={() => toggleArrayItem(coachTypes, type, setCoachTypes)}
                                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                            coachTypes.includes(type)
                                                ? 'bg-lime-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {coachTypes.includes(type) && <CheckCircle className="inline h-3 w-3 mr-1" />}
                                        {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialties (comma-separated)</label>
                            <input type="text" value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="e.g., Weight Loss, HIIT, Prenatal Yoga"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expertise Tags (comma-separated)</label>
                            <input type="text" value={expertiseTags} onChange={e => setExpertiseTags(e.target.value)} placeholder="e.g., ACE Certified, Keto, CrossFit"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                        </div>
                    </CardContent>
                </Card>

                {/* Languages */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-lime-600" /> Languages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(lang => (
                                <button key={lang} type="button" onClick={() => toggleArrayItem(languages, lang, setLanguages)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                        languages.includes(lang)
                                            ? 'bg-lime-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {languages.includes(lang) && <CheckCircle className="inline h-3 w-3 mr-1" />}{lang}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Session Modes & Fees */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-lime-600" /> Session Modes & Fees</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Session Modes</label>
                            <div className="flex flex-wrap gap-2">
                                {SESSION_MODES.map(mode => (
                                    <button key={mode} type="button" onClick={() => toggleArrayItem(sessionModes, mode, setSessionModes)}
                                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                            sessionModes.includes(mode)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {sessionModes.includes(mode) && <CheckCircle className="inline h-3 w-3 mr-1" />}
                                        {mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Fee (₹)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="number" value={sessionFee} onChange={e => setSessionFee(e.target.value)} placeholder="500"
                                        className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video Session Fee (₹)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="number" value={videoSessionFee} onChange={e => setVideoSessionFee(e.target.value)} placeholder="800"
                                        className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Plan Fee (₹)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="number" value={monthlyPlanFee} onChange={e => setMonthlyPlanFee(e.target.value)} placeholder="3000"
                                        className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" type="button" onClick={loadProfile} disabled={saving}>Reset</Button>
                    <Button type="submit" isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>Save Profile</Button>
                </div>
            </form>
        </div>
    );
}
