'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Lightbulb, TrendingUp, AlertTriangle, Info, Calendar, Clock, Video, User, 
    RefreshCw, Loader2, Sparkles, ArrowRight, Activity, IndianRupee, Target, 
    ChevronRight, Star, HeartPulse, CheckCircle2, TrendingDown, Minus, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { doctorApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';

interface Insight {
    id: string;
    category: string;
    type: 'positive' | 'warning' | 'info' | 'tip';
    icon: string;
    title: string;
    description: string;
    action?: string;
    actionHref?: string;
}

const STATIC_TIPS = [
    { id: 'static_1', category: 'Profile', type: 'tip' as const, icon: 'user', title: 'Complete your profile', description: 'A complete profile with photo, bio, and intro video helps patients trust you and increases bookings.', action: 'Open Settings', actionHref: '/doctor/settings' },
    { id: 'static_2', category: 'Schedule', type: 'info' as const, icon: 'calendar', title: 'Maintain consistent availability', description: 'Doctors who keep regular schedule slots get significantly better patient retention and repeat visits.', action: 'Manage Schedule', actionHref: '/doctor/schedule' },
];

export default function DoctorInsightsPage() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [journey, setJourney] = useState<any>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeInsightId, setActiveInsightId] = useState<string | null>(null);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [insightsRes, analyticsRes, journeyRes] = await Promise.allSettled([
                doctorApi.getInsights(),
                doctorApi.getAnalytics('30d'),
                doctorApi.getJourneyStats()
            ]);

            // Parse Insights
            if (insightsRes.status === 'fulfilled' && insightsRes.value?.success) {
                const combined = [...(insightsRes.value.data as Insight[]), ...STATIC_TIPS.filter(t => !(insightsRes.value.data as Insight[]).find(i => i.id === t.id))];
                setInsights(combined);
            } else {
                setInsights(STATIC_TIPS);
            }

            // Parse Analytics
            if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
                setAnalytics(analyticsRes.value.data);
            }

            // Parse Journey
            if (journeyRes.status === 'fulfilled' && journeyRes.value?.success) {
                setJourney(journeyRes.value.data);
            }
            
        } catch (err: any) {
            setError(err.message || 'Failed to load practice intelligence.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchAllData(); 
    }, [fetchAllData]);

    // Derived AI Executive Summary
    const executiveSummary = useMemo(() => {
        if (!analytics?.summary) return "Your practice data is being gathered. Keep consulting to unlock deeper insights.";
        
        const parts = [];
        const { totalAppointments, completionRate, cancellationRate, videoConsultations, inPersonConsultations } = analytics.summary;
        
        if (totalAppointments > 20) parts.push("Patient volume is strong");
        else if (totalAppointments > 0) parts.push("Patient volume is stable");
        else parts.push("It's been a quiet period");

        if (videoConsultations > inPersonConsultations) parts.push("with a healthy preference for video consultations");
        else if (inPersonConsultations > 0) parts.push("driven largely by in-person visits");

        if (cancellationRate > 15) parts.push("however elevated cancellations require your attention.");
        else if (completionRate > 80) parts.push("and your completion rate is excellent.");
        else parts.push(".");

        return parts.join(' ');
    }, [analytics]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <h3 className="text-xl font-bold text-red-900 dark:text-red-400">Insights Temporarily Unavailable</h3>
                <p className="text-red-700 dark:text-red-300 text-sm max-w-sm text-center">We couldn't load your practice intelligence at this moment.</p>
                <button onClick={fetchAllData} className="px-5 py-2 mt-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-semibold transition-colors">
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
            
            {/* Header & AI Summary */}
            <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 mb-3 text-xs font-bold tracking-widest uppercase text-purple-600 dark:text-purple-400 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                        Practice Intelligence
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                        Your Practice This Month
                    </h1>
                    
                    {/* Executive AI Summary Banner */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex gap-4">
                        <div className="mt-1 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900/30 shrink-0 h-min">
                            <Lightbulb className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Executive Summary</h3>
                            {loading ? (
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse mt-2"></div>
                            ) : (
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {executiveSummary}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={fetchAllData} 
                    disabled={loading} 
                    className="flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-semibold hover:shadow-md transition-all text-sm group"
                >
                    <RefreshCw className={`h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors ${loading ? 'animate-spin' : ''}`}/> 
                    Refresh Data
                </button>
            </div>

            {/* Practice Overview (Premium Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InsightMetricCard 
                    title="Consultations" 
                    value={analytics?.summary?.totalAppointments || 0} 
                    icon={Calendar} 
                    trend={analytics?.summary?.totalAppointments > 0 ? 'positive' : 'neutral'} 
                    loading={loading}
                    subtitle="This month"
                />
                <InsightMetricCard 
                    title="Total Revenue" 
                    value={`₹${(analytics?.summary?.totalRevenue || 0).toLocaleString('en-IN')}`} 
                    icon={IndianRupee} 
                    trend={analytics?.summary?.totalRevenue > 0 ? 'positive' : 'neutral'} 
                    loading={loading}
                    subtitle="This month"
                />
                <InsightMetricCard 
                    title="Completion Rate" 
                    value={`${analytics?.summary?.completionRate || 0}%`} 
                    icon={Activity} 
                    trend={analytics?.summary?.completionRate > 80 ? 'positive' : (analytics?.summary?.completionRate < 50 && analytics?.summary?.totalAppointments > 0 ? 'negative' : 'neutral')} 
                    loading={loading}
                    subtitle="Successful visits"
                />
                <InsightMetricCard 
                    title="Lifetime Patients" 
                    value={journey?.stats?.totalPatients || 0} 
                    icon={Users} 
                    trend="positive" 
                    loading={loading}
                    subtitle="Unique records"
                />
            </div>

            {/* Main Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                
                {/* Left Column: Recommendations & Alerts */}
                <div className="lg:col-span-2 space-y-6">
                    
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" /> AI Recommendations
                        </h2>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : insights.length > 0 ? (
                        <div className="space-y-4">
                            {insights.map(insight => (
                                <RecommendationCard 
                                    key={insight.id} 
                                    insight={insight} 
                                    isExpanded={activeInsightId === insight.id}
                                    onToggle={() => setActiveInsightId(activeInsightId === insight.id ? null : insight.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState />
                    )}

                </div>

                {/* Right Column: Data-Driven Sections */}
                <div className="space-y-6">
                    
                    {/* What Changed / Trends */}
                    <DoctorPortalCard className="!p-6">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> What Changed
                        </h3>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <TrendRow 
                                    label="Cancellations" 
                                    value={`${analytics?.summary?.cancellationRate || 0}%`}
                                    status={analytics?.summary?.cancellationRate > 15 ? 'attention' : 'positive'} 
                                />
                                <TrendRow 
                                    label="Video Preference" 
                                    value={`${analytics?.summary?.totalAppointments ? Math.round((analytics.summary.videoConsultations / analytics.summary.totalAppointments) * 100) : 0}%`}
                                    status="neutral" 
                                />
                                <TrendRow 
                                    label="Revenue Avg." 
                                    value={`₹${(analytics?.summary?.avgRevenuePerConsultation || 0).toLocaleString('en-IN')}`}
                                    status="positive" 
                                />
                            </div>
                        )}
                    </DoctorPortalCard>

                    {/* Schedule Intelligence */}
                    <DoctorPortalCard className="!p-6">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" /> Schedule Intelligence
                        </h3>
                        {loading ? (
                            <div className="h-32 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
                        ) : analytics?.charts?.peakHours?.length > 0 ? (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your busiest booking hours:</p>
                                <div className="flex flex-wrap gap-2">
                                    {analytics.charts.peakHours.slice(0, 4).map((ph: any) => (
                                        <div key={ph.hour} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg text-sm font-bold text-blue-700 dark:text-blue-400">
                                            {ph.label} <span className="text-blue-400 dark:text-blue-500 ml-1 font-medium">({ph.count})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Not enough schedule data yet.</p>
                        )}
                    </DoctorPortalCard>

                    {/* Goals & Progress */}
                    {journey?.doctorGoal && (
                        <DoctorPortalCard className="!p-6">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                                <Target className="w-4 h-4 text-amber-500" /> Goals & Progress
                            </h3>
                            {loading ? (
                                <div className="h-24 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
                            ) : (
                                <div className="space-y-5">
                                    <GoalProgress 
                                        label="Monthly Consultations" 
                                        current={journey?.stats?.totalConsultations || 0} 
                                        target={journey.doctorGoal.monthlyConsultations || 50} 
                                        color="bg-emerald-500"
                                    />
                                    <GoalProgress 
                                        label="Profile Completion" 
                                        current={analytics?.summary?.totalAppointments > 0 ? 100 : 80}
                                        target={100} 
                                        color="bg-purple-500"
                                        suffix="%"
                                    />
                                </div>
                            )}
                        </DoctorPortalCard>
                    )}

                </div>
            </div>
        </div>
    );
}

// ======================== Subcomponents ========================


const typeConfig: Record<string, { border: string; bg: string; badge: string; icon: string }> = {
    positive: { border: 'border-emerald-500/25', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
    warning:  { border: 'border-amber-500/25',   bg: 'bg-amber-500/5',   badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',   icon: 'text-amber-500'  },
    info:     { border: 'border-blue-500/25',     bg: 'bg-blue-500/5',     badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',     icon: 'text-blue-500'   },
    tip:      { border: 'border-purple-500/25',   bg: 'bg-purple-500/5',   badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', icon: 'text-purple-500' },
};

const iconMap: Record<string, React.ElementType> = {
    calendar: Calendar, clock: Clock, video: Video, alert: AlertTriangle, user: User, chart: TrendingUp,
};

function RecommendationCard({ insight, isExpanded, onToggle }: { insight: Insight, isExpanded: boolean, onToggle: () => void }) {
    const cfg = typeConfig[insight.type] || typeConfig.info;
    const IconComp = iconMap[insight.icon] || Lightbulb;

    return (
        <div className={`rounded-3xl border ${cfg.border} ${cfg.bg} transition-all duration-300 overflow-hidden`}>
            <div className="p-5 sm:p-6 cursor-pointer" onClick={onToggle}>
                <div className="flex items-start gap-4 sm:gap-5">
                    <div className={`p-3 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 ${cfg.icon}`}>
                        <IconComp className="h-6 w-6"/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-200/50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                    {insight.category}
                                </span>
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md ${cfg.badge}`}>
                                    {insight.type}
                                </span>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg mb-1">{insight.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed pr-4 line-clamp-2">{insight.description}</p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20"
                    >
                        <div className="p-5 sm:p-6 space-y-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{insight.description}</p>
                            
                            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                                <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" /> Why this insight?
                                </h4>
                                <ul className="text-xs font-medium text-gray-600 dark:text-gray-400 space-y-1 ml-5 list-disc">
                                    <li>Based on appointments from the last 30 days</li>
                                    <li>Derived securely from your practice history</li>
                                </ul>
                            </div>

                            {insight.action && insight.actionHref && (
                                <Link href={insight.actionHref}>
                                    <button className={`mt-2 w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                                        insight.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25' :
                                        insight.type === 'positive' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' :
                                        'bg-purple-500 hover:bg-purple-600 shadow-purple-500/25'
                                    }`}>
                                        {insight.action}
                                    </button>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TrendRow({ label, value, status }: { label: string, value: string | number, status: 'positive' | 'attention' | 'neutral' }) {
    const statusConfig = {
        positive: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        attention: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        neutral: { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50' }
    };
    const Cfg = statusConfig[status];
    const Icon = Cfg.icon;

    return (
        <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${Cfg.bg} ${Cfg.color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
            </div>
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}

function GoalProgress({ label, current, target, color, suffix = '' }: any) {
    const percent = Math.min(100, Math.max(0, (current / target) * 100)) || 0;
    
    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
                <span className="text-sm font-extrabold text-gray-900 dark:text-white">{current}{suffix} / {target}{suffix}</span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color} rounded-full`} 
                />
            </div>
            <p className="text-[10px] font-medium text-gray-400 mt-1.5 text-right">{target - current > 0 ? `${target - current}${suffix} remaining` : 'Target reached!'}</p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 gap-5 bg-gray-50 dark:bg-[#0f1929] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="relative">
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
                    <Sparkles className="h-6 w-6 text-gray-400"/>
                </div>
            </div>
            <div className="text-center max-w-sm">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base mb-1.5">Not enough data yet</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-4">Insights will appear here as your practice activity and appointments grow over time.</p>
                <Link href="/doctor/dashboard">
                    <button className="px-5 py-2 rounded-xl text-sm font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all text-gray-700 dark:text-gray-300">
                        Explore Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
}

function Users(props: any) {
    return <User {...props} />;
}

function InsightMetricCard({ title, value, icon: Icon, trend, loading, subtitle }: any) {
    const trendColors = {
        positive: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
        negative: 'text-red-500 bg-red-50 dark:bg-red-500/10',
        neutral: 'text-gray-500 bg-gray-50 dark:bg-gray-500/10'
    };

    return (
        <div className="bg-white dark:bg-[#0f1929] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-800/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-2.5 rounded-xl ${trendColors[trend as keyof typeof trendColors]} border border-white/50 dark:border-white/5`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend === 'positive' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                {trend === 'negative' && <TrendingDown className="w-4 h-4 text-red-500" />}
                {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400" />}
            </div>
            
            <div className="relative z-10">
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-1/2 animate-pulse mb-1"></div>
                ) : (
                    <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</h4>
                )}
                <p className="text-xs font-medium text-gray-400 mt-1">{subtitle}</p>
            </div>
        </div>
    );
}
