/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
    Building2, MapPin, Mail, Phone, Globe, Clock, ShieldCheck, 
    ArrowLeft, Edit3, Settings, CheckCircle2, AlertCircle, Loader2,
    Calendar, Users, FolderKanban, Stethoscope, Sparkles, Image as ImageIcon,
    ExternalLink, RefreshCw
} from 'lucide-react';
import { clinicApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function ClinicProfilePage() {
    const user = useAuthStore((s) => s.user);
    const [clinic, setClinic] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await clinicApi.getProfile();
            if (res.success && res.data) {
                const raw = (res.data as any).clinic || res.data;
                setClinic(raw);
            } else {
                setError(res.error || 'Failed to load clinic profile.');
            }
        } catch (err: any) {
            console.error('Failed to load clinic profile:', err);
            setError('Unable to connect to server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const isApproved = clinic?.approval_status === 'approved' || clinic?.is_approved === true;
    const specializations = Array.isArray(clinic?.specializations) ? clinic.specializations : [];
    const facilities = Array.isArray(clinic?.facilities) ? clinic.facilities : [];
    const departments = Array.isArray(clinic?.departments) ? clinic.departments : [];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <Link
                        href="/clinic/staff"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline mb-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Team
                    </Link>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Clinic Profile
                    </h1>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                        View and manage your clinic&apos;s organization profile, public details, and facilities.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    <button
                        onClick={loadProfile}
                        disabled={isLoading}
                        className="px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111c2e] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <Link
                        href="/clinic/settings"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Edit in Settings</span>
                    </Link>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading clinic profile...</p>
                </div>
            ) : !clinic ? (
                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clinic profile not found</h3>
                    <p className="text-xs text-gray-500 mt-1">Please ensure your clinic registration is complete.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    
                    {/* Hero Header Card */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                        <div className="h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 relative" />

                        <div className="p-6 sm:p-8 -mt-14 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                                {clinic.profile_image_url || clinic.image_url ? (
                                    <img
                                        src={clinic.profile_image_url || clinic.image_url}
                                        alt={clinic.name}
                                        className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-[#111c2e] shadow-lg shrink-0 bg-white"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-3xl flex items-center justify-center border-4 border-white dark:border-[#111c2e] shadow-lg shrink-0">
                                        <Building2 className="w-12 h-12" />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                                            {clinic.name}
                                        </h2>
                                        {isApproved ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Clinic
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                                                Verification Pending
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                                        <span>{clinic.city}{clinic.state ? `, ${clinic.state}` : ''}</span>
                                        {clinic.established_year && <span>• Est. {clinic.established_year}</span>}
                                        <span>• {clinic.is_24_hours ? 'Open 24/7' : 'Standard Working Hours'}</span>
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/clinic/settings"
                                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-extrabold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 self-start sm:self-auto"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Profile</span>
                            </Link>
                        </div>
                    </div>

                    {/* 2-Column Info Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left Column (2 Cols wide on large screen) */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Description / About */}
                            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-600" /> About Clinic
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                    {clinic.description || 'No description provided yet. Add an about section in settings to help patients understand your clinical expertise and facilities.'}
                                </p>
                            </div>

                            {/* Specializations & Clinical Focus */}
                            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-emerald-600" /> Specializations & Clinical Focus
                                </h3>
                                {specializations.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {specializations.map((s: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">No specializations specified yet.</p>
                                )}
                            </div>

                            {/* Facilities & Amenities */}
                            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" /> Facilities & Services
                                </h3>
                                {facilities.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {facilities.map((f: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                <span className="truncate">{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">No facilities listed yet.</p>
                                )}
                            </div>

                            {/* Departments */}
                            {departments.length > 0 && (
                                <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
                                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        <FolderKanban className="w-4 h-4 text-emerald-600" /> Clinical Departments ({departments.length})
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {departments.map((d: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 space-y-1"
                                            >
                                                <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">{d.name}</h4>
                                                {d.description && <p className="text-[11px] text-gray-500 truncate">{d.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column / Contact & Location Info */}
                        <div className="space-y-6">
                            
                            {/* Contact Details */}
                            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                                    Contact & Location
                                </h3>

                                <div className="space-y-3 text-xs">
                                    {clinic.address && (
                                        <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300">
                                            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Address</p>
                                                <p className="mt-0.5 text-gray-600 dark:text-gray-400">
                                                    {clinic.address}, {clinic.city}, {clinic.state} {clinic.pincode ? `- ${clinic.pincode}` : ''}
                                                </p>
                                                {clinic.latitude && clinic.longitude && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                                        {clinic.latitude}, {clinic.longitude}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {clinic.phone && (
                                        <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Phone</p>
                                                <p className="mt-0.5 text-gray-600 dark:text-gray-400">{clinic.phone}</p>
                                            </div>
                                        </div>
                                    )}

                                    {clinic.email && (
                                        <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Email</p>
                                                <p className="mt-0.5 text-gray-600 dark:text-gray-400">{clinic.email}</p>
                                            </div>
                                        </div>
                                    )}

                                    {clinic.website_url && (
                                        <div className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Website</p>
                                                <a
                                                    href={clinic.website_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-0.5 text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                                >
                                                    {clinic.website_url} <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Organization & Licensing */}
                            <div className="bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                                    Organization & License
                                </h3>

                                <div className="space-y-3 text-xs">
                                    {clinic.registration_number && (
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">Registration Number:</p>
                                            <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">{clinic.registration_number}</p>
                                        </div>
                                    )}

                                    {clinic.license_number && (
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">License Number:</p>
                                            <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">{clinic.license_number}</p>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">Approval Status:</p>
                                        <p className="font-extrabold capitalize mt-0.5 text-emerald-600 dark:text-emerald-400">
                                            {clinic.approval_status || 'Approved'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
