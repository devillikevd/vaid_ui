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
    Droplet,
    ShieldCheck,
    AlertCircle,
    ArrowRight
} from 'lucide-react';

interface PatientProfileMenuProps {
    user: any;
    patientProfile: any;
    onLogout: () => void;
}

export default function PatientProfileMenu({ user, patientProfile, onLogout }: PatientProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                        ? 'bg-stone-100/90 border-vd-forest/40 shadow-xs'
                        : 'bg-white/80 hover:bg-stone-100/80 border-stone-200/80 hover:border-stone-300 shadow-2xs'
                }`}
            >
                {/* Avatar */}
                {profileImageUrl ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-emerald-200">
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
                    <p className="text-xs font-bold text-stone-900 leading-tight truncate max-w-[140px]">
                        {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAbhaLinked ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}
                        />
                        <p className="text-[10px] text-stone-500 font-medium leading-tight truncate">
                            {isAbhaLinked ? `ABHA: ${abhaNumber}` : 'ABHA · Not Linked'}
                        </p>
                    </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-vd-forest' : ''
                    }`}
                />
            </button>

            {/* 2. Interactive Profile Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-stone-200/90 shadow-xl z-50 p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Profile Header */}
                    <div className="flex items-start gap-3.5 pb-4 border-b border-stone-100">
                        {profileImageUrl ? (
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-emerald-200 shadow-xs">
                                <Image
                                    src={profileImageUrl}
                                    alt={displayName}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-vd-forest text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs border border-emerald-100">
                                {initial}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base leading-snug truncate">
                                {displayName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-vd-forest bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Patient
                                </span>
                                {bloodGroup && (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                        🩸 {bloodGroup}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Patient Details Snapshot */}
                    <div className="my-3.5 bg-stone-50/80 rounded-2xl p-3 border border-stone-100 space-y-2 text-xs">
                        {email && (
                            <div className="flex items-center justify-between text-stone-600 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 shrink-0">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500">Email</span>
                                </div>
                                <span className="font-medium text-stone-800 truncate text-right text-[11px]">
                                    {email}
                                </span>
                            </div>
                        )}

                        {phone && (
                            <div className="flex items-center justify-between text-stone-600 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 shrink-0">
                                    <Phone className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500">Phone</span>
                                </div>
                                <span className="font-medium text-stone-800 text-[11px]">
                                    {phone}
                                </span>
                            </div>
                        )}

                        {(gender || age) && (
                            <div className="flex items-center justify-between text-stone-600 gap-2">
                                <div className="flex items-center gap-2 text-stone-400 shrink-0">
                                    <UserIcon className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium text-stone-500">Demographics</span>
                                </div>
                                <span className="font-medium text-stone-800 text-[11px]">
                                    {[gender, age ? `${age} yrs` : null].filter(Boolean).join(' • ')}
                                </span>
                            </div>
                        )}

                        {/* ABHA Status Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                            <div className="flex items-center gap-2 text-stone-400 shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px] font-medium text-stone-500">ABHA Health ID</span>
                            </div>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    isAbhaLinked
                                        ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                                        : 'bg-stone-200/70 text-stone-600'
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
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-vd-forest transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <QrCode className="w-4 h-4 text-stone-400 group-hover:text-vd-forest transition-colors" />
                                <span>Digital Health Card</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/health-id"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-vd-forest transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <CreditCard className="w-4 h-4 text-stone-400 group-hover:text-vd-forest transition-colors" />
                                <span>Health ID (ABHA) Card</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/records"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-vd-forest transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-stone-400 group-hover:text-vd-forest transition-colors" />
                                <span>Health Records & Vitals</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/appointments"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-vd-forest transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Calendar className="w-4 h-4 text-stone-400 group-hover:text-vd-forest transition-colors" />
                                <span>My Appointments</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                            href="/patient/assistant"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-vd-forest transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-stone-400 group-hover:text-vd-forest transition-colors" />
                                <span>AI Health Assistant</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-vd-forest group-hover:translate-x-0.5 transition-all" />
                        </Link>
                    </div>

                    {/* Divider & Logout */}
                    <div className="pt-2 mt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-2.5">
                                <LogOut className="w-4 h-4 text-stone-400 group-hover:text-rose-600 transition-colors" />
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
