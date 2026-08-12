'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi } from '@/lib/api';
import { formatDoctorName, formatCurrency } from '@/lib/utils';
import { 
    Loader2, Heart, Users, CalendarCheck, TrendingUp, Star, ArrowLeft, 
    Stethoscope, Award, Trophy, UserPlus, Target, Activity, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
    BarChart, Bar 
} from 'recharts';

// Utility for number counting animation
const Counter = ({ from = 0, to, duration = 2, prefix = '', suffix = '' }: { from?: number, to: number, duration?: number, prefix?: string, suffix?: string }) => {
    const [count, setCount] = useState(from);
    
    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        
        const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = (timestamp - startTime) / (duration * 1000);
            
            if (progress < 1) {
                setCount(Math.floor(from + (to - from) * progress));
                animationFrame = requestAnimationFrame(updateCount);
            } else {
                setCount(to);
            }
        };
        
        animationFrame = requestAnimationFrame(updateCount);
        return () => cancelAnimationFrame(animationFrame);
    }, [from, to, duration]);
    
    return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
};

export default function DoctorJourneyPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const toast = useToast();
    
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Goals Editing State
    const [isEditingGoals, setIsEditingGoals] = useState(false);
    const [editGoals, setEditGoals] = useState({ monthlyConsultations: 0, monthlyRevenue: 0 });
    const [savingGoals, setSavingGoals] = useState(false);
    
    // Chart view state
    const [chartView, setChartView] = useState<'consultations' | 'revenue'>('consultations');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await doctorApi.getJourneyStats();
            if (res.success && res.data) {
                setStats(res.data);
                setEditGoals({
                    monthlyConsultations: (res.data as any).goals?.monthlyConsultations || 50,
                    monthlyRevenue: (res.data as any).goals?.monthlyRevenue || 25000
                });
            }
        } catch (e) {
            console.error("Failed to load journey stats");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoals = async () => {
        try {
            setSavingGoals(true);
            const res = await doctorApi.updateJourneyGoals(editGoals);
            if (res.success) {
                toast.success('Goals updated', 'Your targets have been saved successfully.');
                setStats({ ...stats, goals: { ...stats.goals, ...editGoals } });
                setIsEditingGoals(false);
            }
        } catch (e) {
            toast.error('Failed to save goals', 'Please try again.');
        } finally {
            setSavingGoals(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium tracking-widest uppercase">Loading Your Journey...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-6 text-center">
                <Heart className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Oops!</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">We couldn&apos;t retrieve your journey stats right now. Please try again later.</p>
                <Button onClick={() => router.push('/doctor')} variant="outline" className="dark:border-gray-700 dark:hover:bg-gray-800">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
        );
    }

    const joinDate = new Date(stats.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    
    // Parse Milestones
    const milestones = stats.milestones || [];
    
    // Parse Reviews
    const recentReviews = stats.recentReviews || [];

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-[#0B1020] text-gray-900 dark:text-white overflow-x-hidden relative selection:bg-emerald-500/30 pb-20">
            
            {/* Fixed Navigation */}
            <div className="fixed top-6 left-6 z-50">
                <Button onClick={() => router.push('/doctor')} variant="outline" className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-full h-10 w-10 p-0 shadow-sm border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>

            {/* 1. HERO SECTION */}
            <section className="relative w-full py-32 px-6 flex flex-col items-center justify-center text-center overflow-hidden border-b border-gray-200 dark:border-gray-800/50">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-100/50 via-gray-50 to-gray-50 dark:from-emerald-900/20 dark:via-[#0B1020] dark:to-[#0B1020] -z-10" />
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl"
                >
                    <Heart className="h-16 w-16 text-emerald-500 mx-auto mb-6 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse" />
                    <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">
                        Hello, <span className="text-emerald-600 dark:text-emerald-400">{formatDoctorName(user?.name) || 'Doctor'}</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-light leading-relaxed mb-4">
                        Your incredible journey with Vaididea started in <strong className="font-semibold text-gray-900 dark:text-white">{joinDate}</strong>.
                    </p>
                    <p className="text-lg text-emerald-600 dark:text-emerald-500 font-medium tracking-wide">
                        "Every consultation is another opportunity to make a difference."
                    </p>
                </motion.div>
            </section>

            <div className="max-w-6xl mx-auto px-6 py-16 space-y-24">
                
                {/* 2. IMPACT COUNTERS */}
                <section>
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-2">Your Impact</h2>
                        <p className="text-gray-500 dark:text-gray-400">The lives you have touched since joining.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 text-center bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <Users className="h-10 w-10 text-blue-500 mx-auto mb-4" />
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                                <Counter to={stats.totalPatients} />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider text-sm">Patients Treated</p>
                        </Card>
                        <Card className="p-8 text-center bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <CalendarCheck className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                                <Counter to={stats.totalConsultations} />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider text-sm">Consultations</p>
                        </Card>
                        <Card className="p-8 text-center bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                            <Star className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                                {stats.averageRating.toFixed(1)}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider text-sm">Average Rating ({stats.totalReviews} reviews)</p>
                        </Card>
                    </div>
                </section>

                {/* 3. GROWTH ANALYTICS & GOALS */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Charts */}
                    <Card className="lg:col-span-2 p-6 bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold">Growth Analytics</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your practice trajectory over time.</p>
                            </div>
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button 
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${chartView === 'consultations' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    onClick={() => setChartView('consultations')}
                                >
                                    Consultations
                                </button>
                                <button 
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${chartView === 'revenue' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    onClick={() => setChartView('revenue')}
                                >
                                    Revenue
                                </button>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            {stats.chartData && stats.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartView === 'consultations' ? (
                                        <BarChart data={stats.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dx={-10} />
                                            <RechartsTooltip 
                                                cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--tw-colors-gray-900)' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="consultations" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    ) : (
                                        <LineChart data={stats.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--tw-colors-gray-900)' }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                                            />
                                            <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    )}
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">Not enough data to display chart.</div>
                            )}
                        </div>
                    </Card>

                    {/* Goals */}
                    <Card className="p-6 bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5 text-emerald-500" /> Personal Goals</h2>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingGoals(!isEditingGoals)} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                {isEditingGoals ? 'Cancel' : 'Edit'}
                            </Button>
                        </div>

                        {isEditingGoals ? (
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Consultations Target</label>
                                    <Input type="number" value={editGoals.monthlyConsultations} onChange={(e) => setEditGoals({...editGoals, monthlyConsultations: parseInt(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monthly Revenue Target (₹)</label>
                                    <Input type="number" value={editGoals.monthlyRevenue} onChange={(e) => setEditGoals({...editGoals, monthlyRevenue: parseInt(e.target.value) || 0})} />
                                </div>
                                <Button className="w-full mt-4" variant="primary" onClick={handleSaveGoals} disabled={savingGoals}>
                                    {savingGoals ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Targets
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6 flex-1">
                                {/* Consultations Goal */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Monthly Consultations</span>
                                        <span className="font-bold">{stats.chartData?.length ? stats.chartData[stats.chartData.length - 1].consultations : 0} / {stats.goals.monthlyConsultations}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full" 
                                            style={{ width: `${Math.min(100, ((stats.chartData?.length ? stats.chartData[stats.chartData.length - 1].consultations : 0) / (stats.goals.monthlyConsultations || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Revenue Goal */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Monthly Revenue</span>
                                        <span className="font-bold">
                                            {formatCurrency(stats.chartData?.length ? stats.chartData[stats.chartData.length - 1].revenue : 0)} 
                                            <span className="text-gray-400 font-normal ml-1">/ {formatCurrency(stats.goals.monthlyRevenue)}</span>
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 rounded-full" 
                                            style={{ width: `${Math.min(100, ((stats.chartData?.length ? stats.chartData[stats.chartData.length - 1].revenue : 0) / (stats.goals.monthlyRevenue || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Profile Completion */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Profile Completion</span>
                                        <span className="font-bold">{stats.goals.profileCompletion}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full" 
                                            style={{ width: `${stats.goals.profileCompletion}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                {/* 4. MILESTONES TIMELINE & ACHIEVEMENTS */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Timeline */}
                    <div>
                        <h2 className="text-2xl font-bold mb-8">Journey Milestones</h2>
                        <div className="relative pl-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 space-y-8">
                            {milestones.map((m: any, idx: number) => {
                                let Icon = UserPlus;
                                if (m.icon === 'Stethoscope') Icon = Stethoscope;
                                if (m.icon === 'Award') Icon = Award;
                                if (m.icon === 'Trophy') Icon = Trophy;
                                if (m.icon === 'Star') Icon = Star;

                                return (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-6 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-2 border-white dark:border-[#0B1020] flex items-center justify-center -translate-x-[1px] z-10 shadow-sm">
                                            <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="ml-6 bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{m.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(m.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Achievements & Streaks */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Flame className="w-6 h-6 text-orange-500" /> Consistency Streaks</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="p-5 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-100 dark:border-orange-900/30">
                                    <div className="text-3xl font-black text-orange-600 dark:text-orange-400 mb-1">{stats.totalConsultations > 0 ? 'Active' : 'None'}</div>
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-500">Practice Status</p>
                                </Card>
                                <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30">
                                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{stats.totalPatients > 0 ? stats.totalPatients : 0}</div>
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-500">Unique Lives Touched</p>
                                </Card>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-6">Patient Reviews</h2>
                            {recentReviews.length > 0 ? (
                                <div className="space-y-4">
                                    {recentReviews.map((review: any) => (
                                        <Card key={review.id} className="p-4 bg-white dark:bg-gray-900/50 border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex text-yellow-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`} />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{review.text}"</p>
                                            <p className="text-xs text-gray-500 mt-2 font-medium">— {review.patientName}</p>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 border-dashed border-2 border-gray-200 dark:border-gray-800">
                                    <Star className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No reviews yet.</p>
                                </Card>
                            )}
                        </div>
                    </div>
                </section>

                {/* 5. NEXT MILESTONE */}
                <section>
                    <Card className="p-8 md:p-12 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center rounded-2xl shadow-lg border-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-black opacity-10 blur-2xl"></div>
                        
                        <div className="relative z-10">
                            <Activity className="w-12 h-12 mx-auto mb-6 opacity-90" />
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Keep going, Doctor.</h2>
                            <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
                                Small consultations become meaningful impact over time. You are making a real difference in healthcare every single day.
                            </p>
                            <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-full px-8 py-6 text-lg shadow-lg" onClick={() => router.push('/doctor')}>
                                Continue to Dashboard
                            </Button>
                        </div>
                    </Card>
                </section>

            </div>
        </div>
    );
}
