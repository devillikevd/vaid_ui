'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ChevronDown,
    CreditCard,
    QrCode,
    FileText,
    Calendar,
    Sparkles,
    LogOut,
    Mail,
    Phone,
    User as UserIcon,
    ShieldCheck,
    ArrowRight,
    Sun,
    Moon,
    Monitor
} from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';

interface PatientProfileMenuProps {
    user: any;
    patientProfile: any;
    onLogout: () => void;
}

export default function PatientProfileMenu({ user, patientProfile, onLogout }: PatientProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const displayName = patientProfile?.name || user?.name || 'Patient';
    const email = patientProfile?.email || user?.email || null;
    const phone = patientProfile?.phone || user?.phone || null;
    const abhaNumber = patientProfile?.abha_number || patientProfile?.abhaNumber || null;
    const isAbhaLinked = Boolean(abhaNumber && abhaNumber !== 'Not Linked');
    const bloodGroup = patientProfile?.blood_group || patientProfile?.bloodGroup || null;
    const gender = patientProfile?.gender ? patientProfile.gender.charAt(0).toUpperCase() + patientProfile.gender.slice(1) : null;
    const age = patientProfile?.age || null;
    const profileImageUrl = patientProfile?.profile_image_url || null;

    const initial = displayName ? displayName.charAt(0).toUpperCase() : 'P';

    return (
        <div className="relative" ref={menuRef}>
            {/* 1. Clickable Profile Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                    isOpen
                        ? 'bg-stone-100/90 dark:bg-gray-800/90 border-vd-forest/40 shadow-xs'
                        : 'bg-white/80 dark:bg-gray-900/80 hover:bg-stone-100/80 dark:hover:bg-gray-800/80 border-stone-200/80 dark:border-gray-700 shadow-2xs'
                }`}
            >
                {/* Avatar */}
                {profileImageUrl ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-emerald-200 dark:border-emerald-700">
                        <Image
                            src={profileImageUrl}
                            alt={displayName}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-vd-forest text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {initial}
                    </div>
                )}

                {/* Patient Name & ABHA Status */}
                <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight truncate max-w-[140px]">
                        {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAbhaLinked ? 'bg-emerald-500' : 'bg-stone-400 dark:bg-stone-500'
                            }`}
                        />
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium leading-tight truncate">
                            {isAbhaLinked ? `ABHA: ${abhaNumber}` : 'ABHA · Not Linked'}
                        </p>
                    </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 dark:text-stone-500 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-vd-forest dark:text-emerald-400' : ''
                    }`}
                />
            </button>

            {/* 2. Interactive Profile Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-3xl border border-stone-200/90 dark:border-gray-800 shadow-xl z-50 p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Profile Header */}
                    <div className="flex items-start gap-3.5 pb-4 border-b border-stone-100 dark:border-gray-800">
                        {profileImageUrl ? (
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                                <Image
                                    src={profileImageUrl}
                                    alt={displayName}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-vd-forest text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs border border-emerald-100 dark:border-emerald-900">
                                {initial}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-snug truncate">
                                {displayName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-vd-forest dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Patient
                                </span>
                                {bloodGroup && (
                                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                                        🩸 {bloodGroup}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Patient Details Snapshot */}
                    <div className="my-3.5 bg-stone-50/80 dark:bg-gray-800/60 rounded-2xl p-3 border border-stone-100 dark:border-gray-800 space-y-2 text-xs">
                        {email && (
                            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 shrink-0">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Email</span>
                                </div>
                                <span className="font-medium text-stone-800 dark:text-stone-200 truncate text-right text-[11px]">
                                    {email}
                                </span>
                            </div>
                        )}

                        {phone && (
                            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 shrink-0">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Phone</span>
                                </div>
                                <span className="font-medium text-stone-800 dark:text-stone-200 text-[11px]">
                                    {phone}
                                </span>
                            </div>
                        )}

                        {(gender || age) && (
                            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 shrink-0">
                                    <UserIcon className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Demographics</span>
                                </div>
                                <span className="font-medium text-stone-800 dark:text-stone-200 text-[11px]">
                                    {[gender, age ? `${age} yrs` : null].filter(Boolean).join(' • ')}
                                </span>
                            </div>
                        )}

                        {/* ABHA Status Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 dark:border-gray-700/50">
                            <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">ABHA Health ID</span>
                            </div>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isAbhaLinked
                                        ? 'bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-stone-200/70 dark:bg-gray-700 text-stone-600 dark:text-stone-300'
                                }`}
                            >
                                {isAbhaLinked ? abhaNumber : 'Not Linked'}
                            </span>
                        </div>
                    </div>

                    {/* Profile Quick Actions */}
                    <div className="space-y-1">
                        <Link
                            href="/patient/digital-health-card"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-vd-forest dark:hover:text-emerald-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <QrCode className="w-4 h-4 text-stone-400 group-hover:text-vd-forest dark:group-hover:text-emerald-300 transition-colors" />
                                <span>Digital Health Card</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest dark:group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/health-id"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-vd-forest dark:hover:text-emerald-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <CreditCard className="w-4 h-4 text-stone-400 group-hover:text-vd-forest dark:group-hover:text-emerald-300 transition-colors" />
                                <span>Health ID (ABHA) Card</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest dark:group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/records"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-vd-forest dark:hover:text-emerald-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-stone-400 group-hover:text-vd-forest dark:group-hover:text-emerald-300 transition-colors" />
                                <span>Health Records & Vitals</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest dark:group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/appointments"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-vd-forest dark:hover:text-emerald-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-stone-400 group-hover:text-vd-forest dark:group-hover:text-emerald-300 transition-colors" />
                                <span>My Appointments</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest dark:group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/assistant"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-vd-forest dark:hover:text-emerald-300 transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-stone-400 group-hover:text-vd-forest dark:group-hover:text-emerald-300 transition-colors" />
                                <span>AI Health Assistant</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest dark:group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                    </div>

                    {/* Theme Selector */}
                    <div className="pt-3 mt-2 border-t border-stone-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
                            Appearance
                        </p>
                        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-gray-800 rounded-xl border border-stone-200/80 dark:border-gray-700">
                            {[
                                { val: 'light' as const, label: 'Light', icon: Sun },
                                { val: 'dark' as const, label: 'Dark', icon: Moon },
                                { val: 'system' as const, label: 'System', icon: Monitor },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                const isActive = theme === opt.val;
                                return (
                                    <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => setTheme(opt.val)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-vd-forest text-white shadow-xs'
                                                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider & Logout */}
                    <div className="pt-2 mt-2 border-t border-stone-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-2.5">
                                <LogOut className="w-4 h-4 text-stone-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
                                <span>Sign Out</span>
                            </div>
                            <span className="text-[10px] text-stone-400 group-hover:text-rose-500 font-normal">
                                End session
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
