/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import Link from 'next/link';
import { 
    X, Stethoscope, Star, CalendarDays, Clock, MapPin, Mail, Phone, 
    ShieldCheck, Building2, Video, Award, GraduationCap, Globe, 
    CheckCircle2, FileText, UserCheck, AlertTriangle, AlertCircle
} from 'lucide-react';
import { ClinicDoctor } from '@/stores/clinicStore';
import { Button } from '@/components/ui/Button';

interface DoctorDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor: ClinicDoctor | null;
    onEndAffiliation?: (doctor: ClinicDoctor) => void;
}

export function DoctorDetailModal({ isOpen, onClose, doctor, onEndAffiliation }: DoctorDetailModalProps) {
    if (!isOpen || !doctor) return null;

    const ratingVal = typeof doctor.rating === 'number' ? doctor.rating : parseFloat(String(doctor.rating || '0'));
    const practiceTypeLabel = doctor.practice_type === 'visiting' 
        ? 'Visiting Consultant' 
        : doctor.practice_type === 'part_time' 
        ? 'Part-Time' 
        : doctor.practice_type === 'contract' 
        ? 'Contract' 
        : 'Full-Time';

    const modes = Array.isArray(doctor.consultation_modes) && doctor.consultation_modes.length > 0 
        ? doctor.consultation_modes 
        : ['in_clinic', 'video'];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl bg-white dark:bg-[#111c2e] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header with Cover Gradient */}
                <div className="relative bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
                        {doctor.profile_image_url ? (
                            <img
                                src={doctor.profile_image_url}
                                alt={doctor.name}
                                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/40 shadow-md shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl border-2 border-white/40 shadow-md shrink-0">
                                {doctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h2 className="text-2xl font-extrabold tracking-tight text-white truncate">
                                    {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
                                </h2>
                                {doctor.is_approved && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-500/30 text-white border border-white/30 px-2.5 py-0.5 rounded-full shadow-sm">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Doctor
                                    </span>
                                )}
                            </div>

                            <p className="text-emerald-100 font-medium text-sm flex items-center gap-2 flex-wrap">
                                <span>{doctor.specialization}</span>
                                {doctor.sub_specialization && <span>• {doctor.sub_specialization}</span>}
                                {Boolean(doctor.experience_years && doctor.experience_years > 0) && <span>• {doctor.experience_years} yrs exp</span>}
                            </p>

                            <div className="flex items-center gap-3 mt-2 text-xs text-white/90 font-medium flex-wrap">
                                {doctor.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 opacity-75" /> {doctor.email}
                                    </span>
                                )}
                                {doctor.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 opacity-75" /> {doctor.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content - Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-gray-800 dark:text-gray-200 text-sm">
                    
                    {/* Stats Metric Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                            <p className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Today&apos;s Appts</p>
                            <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-0.5">{doctor.todayAppointments || 0}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                            <p className="text-[11px] font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Upcoming</p>
                            <p className="text-xl font-extrabold text-blue-900 dark:text-blue-100 mt-0.5">{doctor.upcomingAppointments || 0}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                            <p className="text-[11px] font-extrabold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Completed</p>
                            <p className="text-xl font-extrabold text-purple-900 dark:text-purple-100 mt-0.5">{doctor.completed_consultations || doctor.total_consultations || 0}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                            <p className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Rating</p>
                            <div className="flex items-center gap-1 text-xl font-extrabold text-amber-900 dark:text-amber-100 mt-0.5">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span>{ratingVal > 0 ? ratingVal.toFixed(1) : 'New'}</span>
                                {doctor.total_reviews ? <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({doctor.total_reviews})</span> : null}
                            </div>
                        </div>
                    </div>

                    {/* Clinic Affiliation & Practice Details */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 space-y-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Clinic Affiliation & Practice Terms
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Affiliation Status:</span>
                                <span className="ml-2 font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Affiliation
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Joined Date:</span>
                                <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">
                                    {doctor.joined_at ? new Date(doctor.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Affiliated'}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Practice Type:</span>
                                <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">{practiceTypeLabel}</span>
                            </div>

                            {doctor.department && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Department:</span>
                                    <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">{doctor.department}</span>
                                </div>
                            )}

                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Consultation Modes:</span>
                                <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">
                                    {modes.map(m => m === 'in_clinic' ? 'In-Person OPD' : 'Video Consult').join(' • ')}
                                </span>
                            </div>

                            {doctor.consultation_fee && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">In-Person OPD Fee:</span>
                                    <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">₹{doctor.consultation_fee}</span>
                                </div>
                            )}

                            {doctor.video_consultation_fee && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Video Consult Fee:</span>
                                    <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">₹{doctor.video_consultation_fee}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule & Availability */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 space-y-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Working Schedule & Timings
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Working Days:</span>
                                <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                                    {Array.isArray(doctor.available_days) && doctor.available_days.length > 0
                                        ? doctor.available_days.join(', ')
                                        : 'Monday to Saturday'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Daily Working Hours:</span>
                                <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                                    {typeof doctor.available_hours === 'string' ? doctor.available_hours : '10:00 AM - 06:00 PM'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Professional Qualifications & Bio */}
                    {(doctor.qualifications || doctor.education || doctor.bio || (doctor.languages && doctor.languages.length > 0)) && (
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 space-y-3">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Professional Background
                            </h3>

                            {doctor.bio && (
                                <div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">About / Summary</span>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">{doctor.bio}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {doctor.qualifications && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Qualifications:</span>
                                        <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{doctor.qualifications}</p>
                                    </div>
                                )}

                                {doctor.education && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Education / Medical College:</span>
                                        <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{doctor.education}</p>
                                    </div>
                                )}

                                {doctor.languages && doctor.languages.length > 0 && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Languages Spoken:</span>
                                        <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{doctor.languages.join(', ')}</p>
                                    </div>
                                )}

                                {doctor.registration_number && (
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Medical Registration:</span>
                                        <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{doctor.registration_number}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 bg-gray-50 dark:bg-[#0c1424] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
                    {onEndAffiliation ? (
                        <button
                            type="button"
                            onClick={() => onEndAffiliation(doctor)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-red-200 dark:border-red-900/60"
                        >
                            End Affiliation
                        </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-4 rounded-xl text-xs font-extrabold"
                        >
                            Close
                        </Button>
                        <Link href={`/clinic/doctors/${doctor.id}`}>
                            <Button
                                variant="primary"
                                className="px-5 rounded-xl text-xs font-extrabold"
                            >
                                View Full Profile
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
