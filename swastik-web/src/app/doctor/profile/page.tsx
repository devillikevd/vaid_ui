/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    User, Mail, Phone, Award, BookOpen, Clock, 
    IndianRupee, Star, Edit3, CheckCircle2, AlertTriangle, 
    Video, ShieldCheck, FileText, Building2, Share2, Sparkles, AlertCircle,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { useDoctorStore } from '@/stores/doctorStore';
import { doctorApi } from '@/lib/api';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { OnboardingChecklist, getProfileCompletionTasks } from '@/components/doctor/OnboardingChecklist';

function getDoctorInitials(name?: string): string {
    if (!name) return 'DC';
    const clean = name.replace(/^(Dr\.|Dr|Prof\.|Prof|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Ms)\s+/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'DC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function DoctorAvatar({ 
    src, 
    name, 
    isVerified, 
    className = "" 
}: { 
    src?: string | null; 
    name: string; 
    isVerified?: boolean; 
    className?: string; 
}) {
    const [imgError, setImgError] = useState(false);
    const initials = getDoctorInitials(name);

    return (
        <div className={`relative shrink-0 ${className}`}>
            {src && !imgError ? (
                <img 
                    src={src} 
                    alt={name} 
                    onError={() => setImgError(true)}
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-800 shadow-md bg-gray-50 dark:bg-gray-800"
                />
            ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-blue-500/20 border-2 border-emerald-500/30 flex items-center justify-center font-black text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 shadow-md select-none">
                    {initials}
                </div>
            )}
            {isVerified && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-lg border-2 border-white dark:border-[#0f1929] shadow-sm" title="Verified Provider">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>
                </div>
            )}
        </div>
    );
}

function ProgressRing({ percentage }: { percentage: number }) {
    const r = 24, cx = 32, cy = 32, circumference = 2 * Math.PI * r;
    const dash = (percentage / 100) * circumference;
    const gap = circumference - dash;
    const color = percentage === 100 ? '#10b981' : percentage >= 70 ? '#3b82f6' : '#f59e0b';
    
    return (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="5"/>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} ${gap}`} className="transition-all duration-700 ease-out"/>
            </svg>
            <div className="text-center">
                <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">{percentage}%</div>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children, action }: { title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <DoctorPortalCard className="!p-6">
            <div className="flex items-center justify-between gap-2.5 mb-5 pb-4 border-b border-gray-200 dark:border-gray-800/50">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Icon className="h-4 w-4"/>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                </div>
                {action}
            </div>
            {children}
        </DoctorPortalCard>
    );
}

export default function DoctorProfilePage() {
    const { doctorProfile, isLoading, fetchDoctorProfile } = useDoctorStore();
    const [reviews, setReviews] = useState<any[]>([]);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 });
    const [shareCopied, setShareCopied] = useState(false);

    const handleShareProfile = async (profileId: string) => {
        const url = `${window.location.origin}/doctors/${profileId}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'My Doctor Profile', url });
            } else {
                await navigator.clipboard.writeText(url);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2500);
            }
        } catch {
            try {
                await navigator.clipboard.writeText(url);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2500);
            } catch { /* ignore */ }
        }
    };

    useEffect(() => {
        if (!doctorProfile) fetchDoctorProfile();
        doctorApi.getReviews(1, 10).then(res => {
            if (res.success && res.data) {
                const data = res.data as any;
                const reviewsList = Array.isArray(data) ? data : (data.reviews || data.data || []);
                setReviews(reviewsList);

                // Compute exact average rating and total count from review metrics or dataset
                let calculatedAvg = 0;
                if (reviewsList.length > 0) {
                    const sum = reviewsList.reduce((acc: number, r: any) => acc + Number(r.rating || 0), 0);
                    calculatedAvg = Math.round((sum / reviewsList.length) * 10) / 10;
                }

                const finalAvg = Number(data.metrics?.averageRating ?? data.averageRating ?? calculatedAvg);
                const finalTotal = Number(data.metrics?.totalReviews ?? data.pagination?.total ?? data.total ?? reviewsList.length);

                setStats({ 
                    avgRating: finalAvg || calculatedAvg, 
                    totalReviews: finalTotal || reviewsList.length 
                });
            }
        }).catch(() => {
            // fallback
        });
    }, [doctorProfile, fetchDoctorProfile]);

    const profile = doctorProfile;

    // Canonical specialization resolution
    const specialization = useMemo(() => {
        if (!profile) return 'ENT';
        return profile.specialization || (profile as any).specializations?.[0] || 'ENT';
    }, [profile]);

    // Dynamic Profile Strength & Missing Items calculation (synchronized with Settings Checklist)
    const { completion: profileStrength, missingTasks, isComplete } = useMemo(() => {
        return getProfileCompletionTasks(profile);
    }, [profile]);
    const missingItems = useMemo(() => missingTasks.map(t => t.label), [missingTasks]);

    if (!doctorProfile && isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!profile) return null;

    // Review Summary metrics: prioritize review list calculation
    const reviewAvgRating = stats.avgRating > 0 ? stats.avgRating : (profile.rating || (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length) : 0));
    const reviewTotalCount = stats.totalReviews > 0 ? stats.totalReviews : (profile.total_reviews || reviews.length);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage your public presence and professional details</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => handleShareProfile(profile.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white text-sm font-semibold transition-all shadow-sm"
                    >
                        {shareCopied ? <Check className="h-4 w-4 text-emerald-500"/> : <Share2 className="h-4 w-4 text-gray-500"/>}
                        {shareCopied ? 'Link Copied!' : 'Share Profile'}
                    </button>
                    <Link 
                        href="/doctor/settings" 
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20"
                    >
                        <Edit3 className="h-4 w-4"/> Edit Profile
                    </Link>
                </div>
            </div>

            {/* Profile Hero Header */}
            {/* Profile Hero Header */}
            <DoctorPortalCard className="!p-4 sm:!p-5 relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="absolute top-0 right-0 p-20 bg-emerald-500/5 rounded-bl-full blur-2xl pointer-events-none"/>
                
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 sm:gap-6 relative">
                    {/* Left: Avatar + Core Doctor Information */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left flex-1 min-w-0 w-full">
                        <DoctorAvatar 
                            src={profile.profile_image_url} 
                            name={profile.name} 
                            isVerified={profile.is_approved} 
                        />
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight break-words">
                                    {profile.name}
                                </h2>
                                {profile.is_approved ? (
                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="h-3 w-3"/> Verified
                                    </span>
                                ) : (
                                    <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                                        <AlertTriangle className="h-3 w-3"/> Pending
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-sm sm:text-base text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                                {specialization}
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                {profile.experience_years ? (
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <Award className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                                        <span>{profile.experience_years}+ Years Experience</span>
                                    </div>
                                ) : null}
                                {profile.qualifications ? (
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <BookOpen className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                                        <span>{profile.qualifications}</span>
                                    </div>
                                ) : null}
                                {(profile.user?.email || profile.user?.phone) ? (
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <Mail className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                                        <span className="truncate max-w-[200px] sm:max-w-[260px]">{profile.user?.email || profile.user?.phone}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Right: Sleek Compact Profile Strength Indicator */}
                    <div className="shrink-0 flex items-center gap-3.5 bg-gray-50 dark:bg-gray-800/40 p-3 sm:p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800/80 w-full sm:w-auto">
                        <ProgressRing percentage={profileStrength}/>
                        <div className="text-left min-w-[130px]">
                            <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Profile Strength</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {isComplete ? 'All set!' : `${missingTasks.length} task${missingTasks.length > 1 ? 's' : ''} left`}
                            </div>
                            {!isComplete && (
                                <Link 
                                    href="/doctor/settings" 
                                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                >
                                    Complete Profile →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </DoctorPortalCard>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* About You Section */}
                    <Section 
                        title="About You" 
                        icon={User}
                        action={
                            <Link href="/doctor/settings" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                                Edit Bio
                            </Link>
                        }
                    >
                        {profile.bio ? (
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line break-words">
                                    {profile.bio}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                <p className="text-gray-500 text-sm mb-3">Bio not provided</p>
                                <Link href="/doctor/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                                    <Edit3 className="h-3.5 w-3.5"/> Add Bio in Settings
                                </Link>
                            </div>
                        )}
                    </Section>

                    {/* Recent Patient Reviews Section */}
                    <Section title="Recent Patient Reviews" icon={Star}>
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((rev, i) => (
                                    <div key={rev.id || i} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 transition-colors">
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, j) => (
                                                        <Star key={j} className={`h-4 w-4 ${j < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}/>
                                                    ))}
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-bold text-sm">{Number(rev.rating).toFixed(1)}</span>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        {rev.title && <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{rev.title}</h4>}
                                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{rev.comment}</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-medium pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                            <span>By Anonymous Patient</span>
                                            {rev.is_verified && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified Consultation</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                <Star className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto mb-2.5"/>
                                <p className="text-gray-500 text-sm font-medium">No reviews yet.</p>
                                <p className="text-gray-400 text-xs mt-1">Patient reviews will appear here following completed consultations.</p>
                            </div>
                        )}
                    </Section>
                </div>

                {/* Right Column (1 Col) */}
                <div className="space-y-6">
                    {/* Consultation Fees */}
                    <Section title="Consultation Fees" icon={IndianRupee}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><Building2 className="h-4 w-4"/></div>
                                    <div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">In-Clinic OPD</span>
                                        <span className="text-[11px] text-gray-500">Physical consultation</span>
                                    </div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-extrabold text-base">
                                    {profile.consultation_fee ? `₹${profile.consultation_fee}` : '₹500'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400"><Video className="h-4 w-4"/></div>
                                    <div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">Video Call</span>
                                        <span className="text-[11px] text-gray-500">Online teleconsultation</span>
                                    </div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-extrabold text-base">
                                    {profile.video_consultation_fee && Number(profile.video_consultation_fee) > 0 ? `₹${profile.video_consultation_fee}` : 'Not set'}
                                </span>
                            </div>
                        </div>
                    </Section>

                    {/* Verification & Legal */}
                    <Section title="Verification & Legal" icon={FileText}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">Medical Registration Number</label>
                                <div className="text-sm text-gray-900 dark:text-gray-100 font-mono font-medium bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 select-all">
                                    {profile.registration_number || 'Not provided'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">License Number</label>
                                <div className="text-sm text-gray-900 dark:text-gray-100 font-mono font-medium bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 select-all">
                                    {profile.license_number || 'Not provided'}
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* Review Summary */}
                    <Section title="Review Summary" icon={Star}>
                        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                {reviewAvgRating ? Number(reviewAvgRating).toFixed(1) : '0.0'}
                            </div>
                            <div className="flex-1">
                                <div className="flex gap-1 mb-1">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className={`h-4 w-4 ${j < Math.round(Number(reviewAvgRating)) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}/>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    {reviewTotalCount} total review{reviewTotalCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>
            </div>

        </div>
    );
}
