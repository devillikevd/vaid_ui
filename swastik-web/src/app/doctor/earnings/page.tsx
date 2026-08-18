'use client';

import { useEffect, useState, useMemo } from 'react';
import { IndianRupee, Users, ArrowLeft, Loader2, Calendar, ChevronDown, ChevronUp, Clock, Star, FileText, Activity, Wallet, CreditCard, Receipt, TrendingUp, CheckCircle2, ShieldCheck, PieChart, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MetricCard } from '@/components/doctor/MetricCard';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function EarningsPage() {
    const router = useRouter();
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    
    const [dateFilter, setDateFilter] = useState('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    useEffect(() => {
        const fetchEarnings = async () => {
            setIsLoading(true);
            try {
                let query = '?date=today';
                const today = new Date();
                
                if (dateFilter === 'week') {
                    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
                    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                    query = `?startDate=${firstDay.toISOString().split('T')[0]}&endDate=${lastDay.toISOString().split('T')[0]}`;
                } else if (dateFilter === 'month') {
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    query = `?startDate=${firstDay.toISOString().split('T')[0]}&endDate=${lastDay.toISOString().split('T')[0]}`;
                } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                    query = `?startDate=${customStartDate}&endDate=${customEndDate}`;
                } else if (dateFilter === 'today') {
                    query = '?date=today';
                } else if (dateFilter === 'all') {
                    query = '?date=all';
                }

                const response = await fetchWithAuth(`/doctors/me/earnings${query}`);
                if (!response.success) {
                    throw new Error(response.error || 'Failed to fetch earnings');
                }
                setEarningsData(response.data as any[] || []);
            } catch (err: any) {
                setError(err.message || 'Failed to load earnings data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchEarnings();
    }, [dateFilter, customStartDate, customEndDate]);

    const { totalEarnings, totalConsultations, averageEarnings, pendingSettlement } = useMemo(() => {
        const total = earningsData.reduce((sum, item) => sum + (item.fee || 0), 0);
        const count = earningsData.length;
        const avg = count > 0 ? (total / count) : 0;
        
        // Simulating pending settlement from data if available, else 0.
        // Assuming some might have payment_status === 'pending_settlement'
        const pending = earningsData
            .filter(item => item.payment_status === 'pending' || item.payment_status === 'processing')
            .reduce((sum, item) => sum + (item.fee || 0), 0);

        return {
            totalEarnings: total,
            totalConsultations: count,
            averageEarnings: avg,
            pendingSettlement: pending
        };
    }, [earningsData]);

    const getStatusColor = (status: string) => {
        const s = (status || 'completed').toLowerCase();
        switch (s) {
            case 'completed':
            case 'successful':
            case 'settled':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
            case 'pending':
            case 'processing':
                return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
            case 'failed':
                return 'bg-red-50 text-red-700 border-red-200/50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
            case 'refunded':
                return 'bg-purple-50 text-purple-700 border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50';
            case 'cancelled':
                return 'bg-gray-50 text-gray-700 border-gray-200/50 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50';
            default:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
            
            {/* Premium Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 py-2">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 shrink-0 mt-1"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 mb-3 text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 shadow-sm">
                            <Wallet className="h-3.5 w-3.5" />
                            Financial Overview
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                            Earnings Breakdown
                        </h1>
                        <p className="mt-2 text-base font-medium text-gray-500 dark:text-gray-400 max-w-lg">
                            Track and analyze your consultation earnings, settlements, and platform performance.
                        </p>
                    </div>
                </div>
                
                {/* Premium Date Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-hover:text-emerald-500 transition-colors z-10">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <select 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full sm:w-48 h-12 pl-11 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm cursor-pointer relative"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="all">All Time (Overall)</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>

                    <AnimatePresence>
                        {dateFilter === 'custom' && (
                            <motion.div 
                                initial={{ opacity: 0, width: 0, scale: 0.95 }}
                                animate={{ opacity: 1, width: 'auto', scale: 1 }}
                                exit={{ opacity: 0, width: 0, scale: 0.95 }}
                                className="flex items-center gap-2 overflow-hidden"
                            >
                                <input 
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none shadow-sm transition-all"
                                />
                                <span className="text-gray-400 font-medium text-sm px-1">to</span>
                                <input 
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="h-12 px-4 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none shadow-sm transition-all"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl border border-red-200 dark:border-red-800/50 shadow-sm flex items-center gap-3">
                    <Ban className="h-5 w-5" /> {error}
                </div>
            )}

            {/* Premium Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <MetricCard
                    title="Total Earnings"
                    value={isLoading ? '-' : `₹${totalEarnings.toLocaleString('en-IN')}`}
                    icon={<IndianRupee className="h-5 w-5" />}
                    trend={undefined}
                />
                
                <MetricCard
                    title="Total Consultations"
                    value={isLoading ? '-' : totalConsultations}
                    icon={<Users className="h-5 w-5" />}
                    trend={undefined}
                />

                <MetricCard
                    title="Average / Consult"
                    value={isLoading ? '-' : `₹${averageEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    icon={<PieChart className="h-5 w-5" />}
                    trend={undefined}
                />

                <MetricCard
                    title="Pending Settlement"
                    value={isLoading ? '-' : `₹${pendingSettlement.toLocaleString('en-IN')}`}
                    icon={<Clock className="h-5 w-5" />}
                    trend={undefined}
                />
            </div>

            {/* Consultation Earnings List */}
            <div className="pt-4">
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mb-6">
                    <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                    Transaction History
                </h3>
                
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm animate-pulse flex flex-col md:flex-row justify-between gap-6 items-center">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-2xl shrink-0"></div>
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-48"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-32"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between md:justify-end items-center gap-8 w-full md:w-auto">
                                    <div className="space-y-3">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg w-24"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-16"></div>
                                    </div>
                                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : earningsData.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900/50 rounded-[2rem] border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-full mb-6 ring-8 ring-emerald-50/50 dark:ring-emerald-900/10">
                            <Wallet className="w-16 h-16 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                            No earnings found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                            There are no completed consultations or transactions recorded for this period. Try selecting a different date range.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {earningsData.map((appointment) => {
                            const isExpanded = expandedId === appointment.id;
                            // Safe consultation extraction
                            const consultation = Array.isArray(appointment.consultation) 
                                ? appointment.consultation[0] 
                                : appointment.consultation;
                            
                            const status = appointment.payment_status || appointment.status || 'Completed';
                            const fee = appointment.fee || 0;

                            return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={appointment.id} 
                                    className={`bg-white dark:bg-gray-900 rounded-[1.5rem] border ${isExpanded ? 'border-emerald-200 dark:border-emerald-800 shadow-md shadow-emerald-500/5' : 'border-gray-100 dark:border-gray-800 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700'} transition-all duration-300 overflow-hidden`}
                                >
                                    <div 
                                        onClick={() => toggleExpand(appointment.id)}
                                        className="flex flex-col md:flex-row justify-between p-5 md:p-6 cursor-pointer gap-5 md:items-center"
                                    >
                                        {/* Left Side: Avatar & Basic Info */}
                                        <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-800 text-gray-700 dark:text-gray-300 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-sm shrink-0 border border-white dark:border-gray-700">
                                                {(appointment.patient?.name || 'A')[0].toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <h4 className="font-extrabold text-lg text-gray-900 dark:text-white truncate">
                                                        {appointment.patient?.name || 'Unknown Patient'}
                                                    </h4>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${getStatusColor(status)}`}>
                                                        {status}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                                        {appointment.type || 'Consultation'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        {new Date(appointment.appointment_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-4 w-4 text-gray-400" />
                                                        {appointment.time_slot}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Earning Numbers */}
                                        <div className="flex justify-between md:justify-end items-center gap-6 border-t md:border-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
                                            <div className="text-right flex flex-col items-end">
                                                <p className={`font-extrabold text-2xl tracking-tight leading-none ${status.toLowerCase() === 'failed' || status.toLowerCase() === 'refunded' ? 'text-gray-400 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    ₹{fee.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'}`}>
                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Details Grid */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                                className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/20 px-5 md:px-6 py-6"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    
                                                    {/* Transaction Details */}
                                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
                                                        <h5 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <Receipt className="w-4 h-4" /> Transaction Info
                                                        </h5>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                <span>Gross Fee</span>
                                                                <span>₹{fee.toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Clinical Context */}
                                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm flex flex-col">
                                                        <h5 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <Activity className="w-4 h-4" /> Clinical Context
                                                        </h5>
                                                        <div className="flex-1 space-y-4">
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-bold mb-1">Reason / Symptoms</p>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {consultation?.chief_complaint || appointment.symptoms || 'Not specified'}
                                                                </p>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <div>
                                                                    <p className="text-xs text-gray-500 font-bold mb-1">Duration</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {consultation?.duration_minutes ? `${consultation.duration_minutes} mins` : 'Unknown'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 font-bold mb-1">Method</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize flex items-center gap-1.5">
                                                                        {appointment.type === 'video' ? <Star className="w-3.5 h-3.5 text-indigo-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />} {appointment.type || 'In-Person'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Metadata & Actions */}
                                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm flex flex-col justify-between">
                                                        <div>
                                                            <h5 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <FileText className="w-4 h-4" /> Reference
                                                            </h5>
                                                            <div className="space-y-3 mb-4">
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-gray-500 font-bold">Appt ID</span>
                                                                    <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                                                                        {appointment.id.slice(-8).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                {appointment.payment_reference && (
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <span className="text-gray-500 font-bold">Txn Ref</span>
                                                                        <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                                                                            {appointment.payment_reference.slice(-8).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {consultation?.prescriptions && consultation.prescriptions.length > 0 ? (
                                                            <a 
                                                                href={consultation.prescriptions[0].pdf_url || consultation.prescriptions[0].file_url || '#'} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-xl transition-colors border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <FileText className="w-4 h-4" /> View Prescription
                                                            </a>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-400 font-bold text-sm rounded-xl border border-gray-100 dark:border-gray-700">
                                                                No Prescription Attached
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
