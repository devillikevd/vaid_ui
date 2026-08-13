/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, MapPin, Award, BookOpen, Clock, 
    IndianRupee, Star, Edit3, CheckCircle2, AlertTriangle, 
    Video, ShieldCheck, FileText, Building2, ChevronRight, Share2 
} from 'lucide-react';
import Link from 'next/link';
import { useDoctorStore } from '@/stores/doctorStore';
import { doctorApi } from '@/lib/api';

function InitialsAvatar({ name, className = "" }: { name: string; className?: string }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className={`rounded-3xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 ${className}`}>
            {initials}
        </div>
    );
}

function ProgressRing({ percentage }: { percentage: number }) {
    const r = 45, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
    const dash = (percentage / 100) * circumference;
    const gap = circumference - dash;
    const color = percentage === 100 ? '#10b981' : percentage > 70 ? '#3b82f6' : '#f59e0b';
    
    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2a3b" strokeWidth="8"/>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${dash} ${gap}`}/>
            </svg>
            <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{percentage}%</div>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-200 dark:border-gray-800/50">
                <Icon className="h-5 w-5 text-emerald-500 dark:text-emerald-400"/>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            </div>
            {children}
        </div>
    );
}

export default function DoctorProfilePage() {
    const { doctorProfile, isLoading, fetchDoctorProfile } = useDoctorStore();
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 });

    useEffect(() => {
        if (!doctorProfile) fetchDoctorProfile();
        doctorApi.getReviews(1, 5).then(res => {
            if (res.success && res.data) {
                const data = res.data as any;
                setReviews(data.reviews || (Array.isArray(data) ? data : []));
                setStats({ 
                    avgRating: data.averageRating || 0, 
                    totalReviews: data.total || data.length || 0 
                });
            }
        });
    }, [doctorProfile, fetchDoctorProfile]);

    if (!doctorProfile && isLoading) {
        return <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>;
    }

    if (!doctorProfile) return null;

    const profile = doctorProfile;
    const isComplete = (profile.profile_completion_percentage || 0) === 100;

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage your public presence and professional details</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white text-sm font-semibold transition-colors">
                        <Share2 className="h-4 w-4"/> Preview Public
                    </button>
                    <Link href="/doctor/settings" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                        <Edit3 className="h-4 w-4"/> Edit Profile
                    </Link>
                </div>
            </div>

            {/* Profile Hero */}
            <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800/50 rounded-3xl p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-bl-full blur-3xl pointer-events-none"/>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative">
                    <div className="shrink-0 relative">
                        {profile.profile_image_url ? (
                            <img src={profile.profile_image_url} alt={profile.name} className="h-32 w-32 rounded-3xl object-cover border-4 border-gray-100 dark:border-gray-800 shadow-xl"/>
                        ) : (
                            <InitialsAvatar name={profile.name || 'Doctor'} className="h-32 w-32 text-4xl shadow-xl"/>
                        )}
                        {profile.is_approved && (
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl border-4 border-white dark:border-[#0f1929]" title="Verified Provider">
                                <ShieldCheck className="h-5 w-5"/>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{profile.name}</h2>
                            {profile.is_approved ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5"/> Verified
                                </span>
                            ) : (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5"/> Pending Verification
                                </span>
                            )}
                        </div>
                        
                        <p className="text-lg text-emerald-600 dark:text-emerald-400 font-medium mb-4">{profile.specialization || 'General Practitioner'}</p>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
                            {profile.experience_years && (
                                <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4"/> {profile.experience_years}+ Years Experience
                                </div>
                            )}
                            {profile.qualifications && (
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4"/> {profile.qualifications}
                                </div>
                            )}
                            {(profile.user?.email || profile.user?.phone) && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4"/> {profile.user?.email || profile.user?.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-3xl border border-gray-200 dark:border-gray-800">
                        <ProgressRing percentage={profile.profile_completion_percentage || 0}/>
                        <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">Profile Strength</div>
                            <div className="text-xs text-gray-500 mt-1">{isComplete ? 'All set!' : 'Missing details'}</div>
                        </div>
                        {!isComplete && (
                            <Link href="/doctor/settings" className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                                Complete Profile →
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Section title="About You" icon={User}>
                        {profile.bio ? (
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{profile.bio}</p>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-gray-500 text-sm mb-3">You haven't written a bio yet.</p>
                                <Link href="/doctor/settings" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Add Bio</Link>
                            </div>
                        )}
                    </Section>

                    <Section title="Recent Patient Reviews" icon={Star}>
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((rev, i) => (
                                    <div key={i} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, j) => (
                                                        <Star key={j} className={`h-4 w-4 ${j < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}/>
                                                    ))}
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-semibold text-sm">{rev.rating}.0</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{new Date(rev.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{rev.title}</h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">{rev.comment}</p>
                                        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-medium">
                                            By {rev.is_anonymous ? 'Anonymous' : rev.patient?.name || 'Patient'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Star className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto mb-3"/>
                                <p className="text-gray-500 text-sm">No reviews yet. They will appear here once patients review their appointments.</p>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <Section title="Consultation Fees" icon={IndianRupee}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><Building2 className="h-4 w-4"/></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">In-Clinic</span>
                                </div>
                                <span className="text-gray-900 dark:text-white font-bold">₹{profile.consultation_fee || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400"><Video className="h-4 w-4"/></div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Video</span>
                                </div>
                                <span className="text-gray-900 dark:text-white font-bold">₹{profile.video_consultation_fee || 0}</span>
                            </div>
                        </div>
                    </Section>

                    <Section title="Verification & Legal" icon={FileText}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1 block">Registration Number</label>
                                <div className="text-sm text-gray-800 dark:text-gray-200 font-mono bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">{profile.registration_number || 'Not provided'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1 block">License Number</label>
                                <div className="text-sm text-gray-800 dark:text-gray-200 font-mono bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">{profile.license_number || 'Not provided'}</div>
                            </div>
                        </div>
                    </Section>

                    <Section title="Review Summary" icon={Star}>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.avgRating.toFixed(1)}</div>
                            <div>
                                <div className="flex gap-1 mb-1">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className={`h-4 w-4 ${j < Math.round(stats.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}/>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-500">{stats.totalReviews} total reviews</div>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}
