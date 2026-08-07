'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi } from '@/lib/api';
import { formatDoctorName } from '@/lib/utils';
import { Loader2, Heart, Users, CalendarCheck, TrendingUp, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

// Section Component
const JourneySection = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
    return (
        <section className={`snap-start h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden ${className}`}>
            {children}
        </section>
    );
};

export default function DoctorJourneyPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchStats = async () => {
            const res = await doctorApi.getJourneyStats();
            if (res.success && res.data) {
                setStats(res.data);
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                    <p className="text-emerald-400 font-medium tracking-widest uppercase">Loading Your Journey...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center">
                <Heart className="h-16 w-16 text-gray-700 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Oops!</h1>
                <p className="text-gray-400 max-w-md mb-8">We couldn't retrieve your journey stats right now. Please try again later.</p>
                <Button onClick={() => router.push('/doctor')} variant="outline" className="border-gray-700 hover:bg-gray-800">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
        );
    }

    const joinDate = new Date(stats.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="h-screen w-full bg-gray-950 text-white overflow-y-auto snap-y snap-mandatory scroll-smooth relative">
            
            {/* Fixed Navigation */}
            <div className="fixed top-6 left-6 z-50">
                <Button onClick={() => router.push('/doctor')} variant="ghost" className="text-white hover:bg-white/10 rounded-full h-10 w-10 p-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>
            
            {/* Scroll Indicator */}
            <motion.div 
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center opacity-50"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
            >
                <span className="text-[10px] uppercase tracking-[0.2em] mb-2">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
            </motion.div>

            {/* SECTION 1: The Beginning */}
            <JourneySection className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-gray-950 to-gray-950">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="text-center max-w-2xl"
                >
                    <motion.div 
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 5 }}
                        className="inline-block mb-8"
                    >
                        <Heart className="h-20 w-20 text-emerald-500 mx-auto filter drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                        Hello, <span className="text-emerald-400">{formatDoctorName(user?.name) || 'Doctor'}</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed">
                        Your incredible journey with Vaididea started in <strong className="text-white">{joinDate}</strong>.
                    </p>
                </motion.div>
            </JourneySection>

            {/* SECTION 2: Impact */}
            <JourneySection className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-gray-950 to-gray-950">
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl"
                >
                    <div className="flex justify-center gap-12 mb-12">
                        <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-4">
                            <div className="h-24 w-24 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                <Users className="h-10 w-10 text-blue-400" />
                            </div>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center gap-4 mt-8">
                            <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <CalendarCheck className="h-10 w-10 text-emerald-400" />
                            </div>
                        </motion.div>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">You've touched lives.</h2>
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light">
                        Since you joined, you have treated <span className="text-blue-400 font-bold text-3xl"><Counter to={stats.totalPatients} /></span> unique patients and completed <span className="text-emerald-400 font-bold text-3xl"><Counter to={stats.totalConsultations} /></span> successful consultations.
                    </p>
                </motion.div>
            </JourneySection>

            {/* SECTION 3: Earnings */}
            <JourneySection className="bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/30 via-gray-950 to-gray-950">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-2xl"
                >
                    <motion.div 
                        initial={{ height: 0 }}
                        whileInView={{ height: 'auto' }}
                        className="mb-8 flex justify-center items-end gap-2 h-32 overflow-hidden"
                    >
                        {[40, 70, 50, 90, 60, 110, 100].map((h, i) => (
                            <motion.div 
                                key={i}
                                initial={{ height: 0 }}
                                whileInView={{ height: h }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="w-8 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm opacity-80"
                            />
                        ))}
                    </motion.div>
                    
                    <TrendingUp className="h-12 w-12 text-purple-400 mx-auto mb-6" />
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Your dedication pays off.</h2>
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light mb-8">
                        Your expertise has earned you a total of
                    </p>
                    <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 filter drop-shadow-[0_0_20px_rgba(192,38,211,0.4)]">
                        <Counter prefix="₹" to={stats.lifetimeEarnings} />
                    </div>
                </motion.div>
            </JourneySection>

            {/* SECTION 4: Ratings */}
            <JourneySection className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-gray-950 to-gray-950">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-2xl"
                >
                    <div className="flex justify-center gap-2 mb-8">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.div
                                key={star}
                                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ duration: 0.5, delay: star * 0.15 }}
                            >
                                <Star 
                                    className={`h-12 w-12 md:h-16 md:w-16 ${star <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'text-gray-700'}`} 
                                />
                            </motion.div>
                        ))}
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Patients love you.</h2>
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light mb-8">
                        You maintain a stellar average rating of <span className="text-yellow-400 font-bold text-4xl">{stats.averageRating.toFixed(1)}</span> across <span className="text-white font-bold">{stats.totalReviews}</span> patient reviews.
                    </p>
                </motion.div>
            </JourneySection>

            {/* SECTION 5: Outro */}
            <JourneySection className="bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/40 via-gray-950 to-gray-950">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="text-center max-w-2xl"
                >
                    <Heart className="h-16 w-16 text-emerald-500 mx-auto mb-8 fill-emerald-500/20" />
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Thank You.</h2>
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light mb-12">
                        For being a pillar of Vaididea. Here's to healing more lives together.
                    </p>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                            onClick={() => router.push('/doctor')} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-8 py-6 text-lg font-medium shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all"
                        >
                            Back to Dashboard
                        </Button>
                    </motion.div>
                </motion.div>
            </JourneySection>
            
        </div>
    );
}
