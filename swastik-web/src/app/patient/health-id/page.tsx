'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    CreditCard,
    QrCode,
    Shield,
    User,
    CheckCircle2,
    Loader2,
    Save,
    Lock,
    ExternalLink,
    AlertCircle,
    Building,
    ArrowRight
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import ProtectedPageGate from '@/components/auth/ProtectedPageGate';

export default function PatientAbhaHealthIdPage() {
    const { user, isAuthenticated, _hasHydrated, isLoading: authLoading } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Profile form state
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('other');
    const [bloodGroup, setBloodGroup] = useState('O+');
    const [abhaNumber, setAbhaNumber] = useState('');

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await patientApi.getProfile();
            if (res.success && res.data) {
                const d = res.data as any;
                setProfile(d);
                setName(d.name || '');
                setAge(d.age ? String(d.age) : '');
                setGender(d.gender || 'other');
                setBloodGroup(d.blood_group || d.bloodGroup || 'O+');
                setAbhaNumber(d.abha_number || d.abhaNumber || '');
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isPatient) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [isPatient]);

    const handleSaveAbha = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await patientApi.updateProfile({
                name,
                age: age ? parseInt(age) : undefined,
                gender,
                bloodGroup,
                abha_number: abhaNumber.trim() || undefined,
            });
            if (res.success) {
                setMessage('ABHA Health ID details updated successfully.');
                fetchProfile();
            } else {
                setMessage(res.message || 'Failed to update ABHA details.');
            }
        } catch (err: any) {
            setMessage(err.message || 'Error saving ABHA information.');
        } finally {
            setSaving(false);
        }
    };

    const isLinked = Boolean(profile?.abha_number || profile?.abhaNumber);
    const displayAbhaNumber = profile?.abha_number || profile?.abhaNumber || 'Not Linked';

    if (_hasHydrated && !authLoading && !isPatient) {
        return <ProtectedPageGate pageType="health_id" />;
    }


    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold mb-2">
                    <Building className="w-3.5 h-3.5" />
                    <span>Ayushman Bharat Digital Mission (ABDM)</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                    Health ID (ABHA)
                </h1>
                <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                    National health identity under the Ayushman Bharat Digital Mission, linking government health registries and universal health records.
                </p>
            </div>

            {/* Banner linking to Vaididea Digital Health Card */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 p-4 sm:p-5 rounded-3xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-vd-forest text-white flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-heading font-bold text-xs sm:text-sm text-stone-900">
                            Looking for your Vaididea Digital Health Card?
                        </h4>
                        <p className="text-[11px] text-stone-600 font-light">
                            Generate instant 24-hour QR check-in tokens for clinics and hospitals without needing an ABHA link.
                        </p>
                    </div>
                </div>
                <Link
                    href="/patient/digital-health-card"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                >
                    <span>Open Health Card</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {loading ? (
                <div className="h-64 bg-white rounded-3xl border border-stone-200 animate-pulse" />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: ABHA Card Preview */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-950 to-stone-900 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl border border-blue-500/20">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-heading font-bold text-sm tracking-wider uppercase text-blue-200">
                                        NATIONAL HEALTH AUTHORITY
                                    </h3>
                                    <p className="text-[10px] text-blue-300/80 tracking-widest uppercase">
                                        ABHA • Ayushman Bharat
                                    </p>
                                </div>
                                <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                        isLinked
                                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                            : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                    }`}
                                >
                                    {isLinked ? 'LINKED' : 'NOT LINKED'}
                                </span>
                            </div>

                            {/* Card Holder & ABHA Number */}
                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-[10px] text-blue-300 uppercase tracking-widest font-mono">
                                        14-Digit ABHA Number
                                    </p>
                                    <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-white mt-0.5">
                                        {displayAbhaNumber}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-white/10">
                                    <div>
                                        <p className="text-[9px] text-blue-300 uppercase tracking-wider">Name</p>
                                        <p className="font-semibold text-white truncate">{name || 'Patient'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-blue-300 uppercase tracking-wider">Blood Group</p>
                                        <p className="font-semibold text-white">{bloodGroup}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-blue-300 uppercase tracking-wider">Gender / Age</p>
                                        <p className="font-semibold text-white capitalize">
                                            {gender} {age ? `• ${age}y` : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Footer */}
                            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-[10px] text-blue-200">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Lock className="w-3 h-3 text-blue-300" />
                                    <span>Government ABDM Protocol</span>
                                </span>
                                <span className="font-mono text-blue-300">
                                    MoHFW • India
                                </span>
                            </div>

                            {/* Ambient Glow */}
                            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                        </div>

                        {/* Government Protocol Explainer */}
                        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
                            <div className="flex items-center gap-2 text-blue-900">
                                <Shield className="w-4 h-4 text-blue-700" />
                                <h4 className="font-heading font-bold text-sm text-stone-900">
                                    About ABHA Integration
                                </h4>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed font-light">
                                ABHA (Ayushman Bharat Health Account) is a 14-digit number that uniquely identifies you as a participant in India’s digital healthcare ecosystem. You can link your existing ABHA number below.
                            </p>
                        </div>
                    </div>

                    {/* Right: ABHA Linking Form */}
                    <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
                        <div>
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                Link or Update ABHA ID
                            </h3>
                            <p className="text-xs text-stone-500 font-light mt-0.5">
                                Enter your 14-digit ABHA number or update your demographic details.
                            </p>
                        </div>

                        {message && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveAbha} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    ABHA Number (14 Digits)
                                </label>
                                <input
                                    type="text"
                                    value={abhaNumber}
                                    onChange={(e) => setAbhaNumber(e.target.value)}
                                    placeholder="e.g. 12-3456-7890-1234"
                                    maxLength={20}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-semibold tracking-wider focus:ring-2 focus:ring-blue-600 focus:outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                                />
                                <p className="text-[10px] text-stone-400 mt-1">
                                    Leave blank if you do not have an active ABHA account.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Full Name (as per Aadhaar / ABHA)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                                        Age
                                    </label>
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        placeholder="e.g. 28"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Blood Group
                                </label>
                                <select
                                    value={bloodGroup}
                                    onChange={(e) => setBloodGroup(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                >
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save ABHA Profile</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
