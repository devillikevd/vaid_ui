'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Stethoscope, Star, Clock, MapPin, Building2, 
    Video, ShieldCheck, CheckCircle2, GraduationCap,
    Mail, Phone, CalendarDays, CalendarClock
} from 'lucide-react';
import { clinicApi, reviewsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import ReviewManager from '@/components/shared/ReviewManager';

const formatText = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.map(v => formatText(v)).join(', ');
    if (typeof val === 'object') return val.name || val.title || val.degree || val.label || JSON.stringify(val);
    return String(val);
};

const formatArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(formatText).filter(Boolean);
    if (typeof val === 'string' || typeof val === 'number') return [String(val)];
    if (typeof val === 'object') return [formatText(val)].filter(Boolean);
    return [String(val)];
};

export default function ClinicDoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const doctorId = resolvedParams.id;

    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [activeApptTab, setActiveApptTab] = useState<'today' | 'upcoming' | 'completed'>('today');

    useEffect(() => {
        fetchProfile();
        fetchReviews(1);
    }, [doctorId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await clinicApi.getDoctorProfile(doctorId);
            if (res.success && res.data) {
                setDoctor(res.data);
            } else {
                setError('Failed to load doctor profile.');
            }
        } catch (err: any) {
            console.error('Profile error:', err);
            setError(err.message || 'Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async (page = 1) => {
        try {
            setLoadingReviews(true);
            const res = await reviewsApi.getEntityReviews('doctor', doctorId, page, 5); // Fetch less for compact view
            if (res.success && Array.isArray(res.data)) {
                setReviews(res.data);
            } else if (res.success && (res.data as any)?.reviews) {
                setReviews((res.data as any).reviews);
            }
        } catch (err) {
            console.error('Failed to load reviews:', err);
        } finally {
            setLoadingReviews(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-6 animate-pulse">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="col-span-1 lg:col-span-7 h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                    <div className="col-span-1 lg:col-span-5 h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    if (error || !doctor) {
        return (
            <div className="p-4 sm:p-5 max-w-7xl mx-auto">
                <Button variant="outline" onClick={() => router.back()} className="mb-6 rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Doctors
                </Button>
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-6 rounded-3xl text-center">
                    <p className="text-red-600 dark:text-red-400 font-bold">{error || 'Unable to load doctor profile.'}</p>
                    <Button variant="primary" onClick={fetchProfile} className="mt-4 rounded-xl px-6">Retry</Button>
                </div>
            </div>
        );
    }

    const ratingVal = typeof doctor.rating === 'number' ? doctor.rating : parseFloat(String(doctor.rating || '0'));
    
    const renderApptTabContent = () => {
        const appts = doctor.appointments?.[activeApptTab] || [];
        if (!appts || appts.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm font-medium">
                    No appointments found.
                </div>
            );
        }
        return (
            <div className="space-y-3 mt-4">
                {appts.map((appt: any) => (
                    <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                {formatText(appt.start_time) || new Date(appt.appointment_date).toLocaleDateString()}
                            </span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {appt.patient?.users?.name ? formatText(appt.patient.users.name) : 'Patient'}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${appt.consultation_mode === 'video' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {appt.consultation_mode === 'video' ? 'Video' : 'In-Person'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase">{formatText(appt.status)}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-5 pb-24">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4">
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 text-sm font-extrabold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Doctors
                </button>
            </div>

            {/* Header Profile Card */}
            <div className="relative overflow-hidden bg-white dark:bg-[#111c2e] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start p-5 sm:p-6 gap-5">
                {doctor.profile_image_url ? (
                    <img
                        src={doctor.profile_image_url}
                        alt={doctor.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-800 shadow-sm relative z-10 shrink-0 bg-gray-50 dark:bg-gray-900"
                    />
                ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-sm relative z-10 shrink-0">
                        {doctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                    </div>
                )}

                <div className="flex-1 relative z-10 text-center sm:text-left pt-2 sm:pt-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start mb-2">
                        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                            {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            {doctor.is_approved && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                    <ShieldCheck className="w-3 h-3" /> Verified Doctor
                                </span>
                            )}
                            <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                doctor.is_active 
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' 
                                    : 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/20'
                            }`}>
                                {doctor.is_active ? 'Active Affiliation' : doctor.affiliation_status}
                            </span>
                        </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 font-medium text-sm flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-4">
                        <span>{formatText(doctor.specialization)}</span>
                        {doctor.sub_specialization && <span>• {formatText(doctor.sub_specialization)}</span>}
                        {Boolean(doctor.experience_years && doctor.experience_years > 0) && <span>• {doctor.experience_years} yrs exp</span>}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-bold text-gray-500 dark:text-gray-400 flex-wrap">
                            {doctor.email && (
                                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {formatText(doctor.email)}</span>
                            )}
                            {doctor.phone && (
                                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {formatText(doctor.phone)}</span>
                            )}
                            <span className={`flex items-center gap-1.5 ${doctor.availability_status === 'On Leave' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                <CalendarDays className="w-3.5 h-3.5" /> {formatText(doctor.availability_status)}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" className="text-xs font-bold rounded-xl h-8 px-4" onClick={() => document.getElementById('schedule-section')?.scrollIntoView({behavior: 'smooth'})}>
                                View Schedule
                            </Button>
                            <Button variant="outline" className="text-xs font-bold rounded-xl h-8 px-4" onClick={() => alert('Manage Affiliation coming soon')}>
                                Manage Affiliation
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Today's Appts</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{doctor.metrics?.todayAppointments || 0}</span>
                </div>
                <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Upcoming</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{doctor.metrics?.upcomingAppointments || 0}</span>
                </div>
                <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm flex flex-col justify-center">
                    <span className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Completed</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{doctor.metrics?.completedAppointments || 0}</span>
                </div>
                <div 
                    onClick={() => document.getElementById('reviews-section')?.scrollIntoView({behavior: 'smooth'})}
                    className="bg-white dark:bg-[#111c2e] border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                >
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-amber-50 to-transparent dark:from-amber-900/10 dark:to-transparent pointer-events-none"></div>
                    <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Doctor Rating</span>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{ratingVal > 0 ? ratingVal.toFixed(1) : 'New'}</span>
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                    {doctor.total_reviews > 0 && <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">{doctor.total_reviews} patient reviews</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column - ~60% */}
                <div className="lg:col-span-7 space-y-5">
                    
                    {/* Professional Profile */}
                    <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-600" /> Professional Profile
                        </h2>
                        
                        <div className="space-y-5">
                            {doctor.bio && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">About Doctor</h3>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                                        <div className={isAboutExpanded ? '' : 'line-clamp-4'}>
                                            {formatText(doctor.bio)}
                                        </div>
                                        {formatText(doctor.bio).length > 200 && (
                                            <button 
                                                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                                                className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-2 hover:underline"
                                            >
                                                {isAboutExpanded ? 'Show Less' : 'Read More'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {doctor.qualifications && formatArray(doctor.qualifications).length > 0 && (
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Qualifications</h3>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatArray(doctor.qualifications).join(', ')}</p>
                                    </div>
                                )}
                                {doctor.education && formatArray(doctor.education).length > 0 && (
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Education</h3>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatArray(doctor.education).join(', ')}</p>
                                    </div>
                                )}
                                {doctor.languages && formatArray(doctor.languages).length > 0 && (
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Languages</h3>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatArray(doctor.languages).join(', ')}</p>
                                    </div>
                                )}
                                {doctor.registration_number && (
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Registration</h3>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatText(doctor.registration_number)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Clinic Affiliation */}
                    <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" /> Clinic Affiliation & Practice Terms
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Affiliation</h3>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{doctor.is_active ? 'Active' : 'Historical'}</p>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Joined</h3>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {doctor.joined_at ? new Date(doctor.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Practice Type</h3>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">{formatText(doctor.practice_type).replace('_', ' ') || 'Full Time'}</p>
                            </div>
                            {doctor.department && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Department</h3>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatText(doctor.department)}</p>
                                </div>
                            )}
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Modes</h3>
                                <div className="flex flex-col gap-1 mt-1">
                                    {doctor.consultation_modes?.includes('in_clinic') && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                            <Building2 className="w-3 h-3" /> In-Person
                                        </span>
                                    )}
                                    {doctor.consultation_modes?.includes('video') && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                            <Video className="w-3 h-3" /> Video
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">In-Person</h3>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{doctor.in_person_fee ? `₹${formatText(doctor.in_person_fee)}` : 'Not set'}</p>
                            </div>
                            {doctor.consultation_modes?.includes('video') && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Video</h3>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{doctor.video_fee ? `₹${formatText(doctor.video_fee)}` : 'Not set'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule */}
                    <div id="schedule-section" className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" /> Schedule & Availability
                        </h2>

                        {doctor.availability_status === 'On Leave' && doctor.leave_details && (
                            <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 rounded-2xl flex items-start gap-3">
                                <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">On Leave at this clinic</h4>
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-500 mt-1">
                                        Until: {new Date(doctor.leave_details.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                        {doctor.availability_status === 'Unavailable' && (
                            <div className="mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-2xl flex items-start gap-3">
                                <CalendarDays className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-900 dark:text-red-300">Doctor currently unavailable</h4>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {doctor.schedule && Object.keys(doctor.schedule).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(doctor.schedule).map(([day, timings]: [string, any]) => {
                                        if (!timings || (Array.isArray(timings) && timings.length === 0) || (typeof timings === 'object' && !timings.isActive)) return null;
                                        
                                        let timeString = 'Available';
                                        if (Array.isArray(timings)) {
                                            timeString = timings.map(t => `${t.start || ''} - ${t.end || ''}`).join(', ');
                                        } else if (timings.slots && Array.isArray(timings.slots)) {
                                            timeString = timings.slots.map((t:any) => `${t.start || ''} - ${t.end || ''}`).join(', ');
                                        }

                                        if (!timeString || timeString === ' - ') return null;

                                        return (
                                            <div key={day} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                                <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 capitalize">{day}</span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                    {timeString}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                                    Schedule not configured.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Appointments */}
                    <div className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-emerald-600" /> Appointments
                        </h2>
                        
                        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                            <button 
                                onClick={() => setActiveApptTab('today')}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${activeApptTab === 'today' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                Today
                            </button>
                            <button 
                                onClick={() => setActiveApptTab('upcoming')}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${activeApptTab === 'upcoming' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                Upcoming
                            </button>
                            <button 
                                onClick={() => setActiveApptTab('completed')}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${activeApptTab === 'completed' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                Completed
                            </button>
                        </div>

                        {renderApptTabContent()}
                    </div>
                </div>

                {/* Right Column - ~40% */}
                <div className="lg:col-span-5 space-y-5">
                    
                    {/* Reviews Integration */}
                    <div id="reviews-section" className="bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" /> Doctor Rating & Recent Reviews
                        </h2>
                        
                        <ReviewManager
                            reviews={reviews}
                            loadingReviews={loadingReviews}
                            error={null}
                            fetchReviews={fetchReviews}
                            themeColor="emerald"
                            isFacility={false}
                            hideHero={true}
                            compactCards={true}
                            entityName="Doctor"
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
