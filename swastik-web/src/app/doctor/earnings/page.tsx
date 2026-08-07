'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { IndianRupee, Users, ArrowLeft, Loader2, Calendar, ChevronDown, ChevronUp, Clock, Star, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';

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

    const totalEarnings = earningsData.reduce((sum, item) => sum + (item.fee || 0), 0);
    const totalConsultations = earningsData.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 shrink-0"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Earnings Breakdown</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and analyze your consultation earnings over time</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <select 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-1.5 bg-transparent border-0 text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                        >
                            <option value="today" className="bg-white dark:bg-gray-900">Today</option>
                            <option value="week" className="bg-white dark:bg-gray-900">This Week</option>
                            <option value="month" className="bg-white dark:bg-gray-900">This Month</option>
                            <option value="all" className="bg-white dark:bg-gray-900">All Time (Overall)</option>
                            <option value="custom" className="bg-white dark:bg-gray-900">Custom Range</option>
                        </select>
                    </div>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                            <span className="text-gray-400 text-sm">to</span>
                            <input 
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                    {error}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-emerald-100 text-sm font-medium">Total Earnings</p>
                                        <h2 className="text-4xl font-bold mt-1">₹{totalEarnings.toLocaleString('en-IN')}</h2>
                                    </div>
                                    <div className="bg-white/20 p-3 rounded-xl">
                                        <IndianRupee className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0 shadow-lg shadow-blue-500/20">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Consultations</p>
                                        <h2 className="text-4xl font-bold mt-1">{totalConsultations}</h2>
                                    </div>
                                    <div className="bg-white/20 p-3 rounded-xl">
                                        <Users className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Consultation Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {earningsData.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No completed consultations found for this period.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {earningsData.map((appointment) => {
                                        const isExpanded = expandedId === appointment.id;
                                        // The backend nested query returns consultation as an array or object
                                        const consultation = Array.isArray(appointment.consultation) 
                                            ? appointment.consultation[0] 
                                            : appointment.consultation;
                                            
                                        return (
                                        <div key={appointment.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all duration-200 bg-white dark:bg-gray-950">
                                            <div 
                                                onClick={() => toggleExpand(appointment.id)}
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-full text-emerald-600 dark:text-emerald-400">
                                                        <IndianRupee className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                            {appointment.patient?.name || 'Unknown Patient'}
                                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 font-medium">
                                                                {appointment.type || 'consultation'}
                                                            </span>
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{appointment.appointment_date} at {appointment.time_slot}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                                            + ₹{(appointment.fee || 0).toLocaleString('en-IN')}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Completed</p>
                                                    </div>
                                                    <div className="text-gray-400 p-1">
                                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 animate-in slide-in-from-top-2 duration-200">
                                                    {!consultation ? (
                                                        <p className="text-sm text-gray-500 text-center py-4">No detailed consultation data available.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            
                                                            {/* Reason / Symptoms */}
                                                            <div className="bg-white dark:bg-gray-950 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                                    <Activity className="h-4 w-4" />
                                                                    <span className="text-xs font-medium">Reason & Symptoms</span>
                                                                </div>
                                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                                    {consultation.chief_complaint || appointment.symptoms || 'Not specified'}
                                                                </p>
                                                            </div>

                                                            {/* Duration */}
                                                            <div className="bg-white dark:bg-gray-950 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                                    <Clock className="h-4 w-4" />
                                                                    <span className="text-xs font-medium">Duration</span>
                                                                </div>
                                                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                                                    {consultation.duration_minutes ? `${consultation.duration_minutes} minutes` : 'Unknown'}
                                                                </p>
                                                            </div>

                                                            {/* Reviews */}
                                                            <div className="bg-white dark:bg-gray-950 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                                    <Star className="h-4 w-4" />
                                                                    <span className="text-xs font-medium">Patient Review</span>
                                                                </div>
                                                                {consultation.rating ? (
                                                                    <div>
                                                                        <div className="flex items-center gap-1 text-amber-500 mb-1">
                                                                            {[...Array(5)].map((_, i) => (
                                                                                <Star key={i} className={`h-3 w-3 ${i < consultation.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`} />
                                                                            ))}
                                                                            <span className="text-xs ml-1 text-gray-900 dark:text-gray-100 font-medium">{consultation.rating}/5</span>
                                                                        </div>
                                                                        {consultation.review && (
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic">&quot;{consultation.review}&quot;</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-400 italic">No review provided</p>
                                                                )}
                                                            </div>

                                                            {/* Prescription */}
                                                            <div className="bg-white dark:bg-gray-950 p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
                                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                                                    <FileText className="h-4 w-4" />
                                                                    <span className="text-xs font-medium">Prescription</span>
                                                                </div>
                                                                {consultation.prescriptions && consultation.prescriptions.length > 0 ? (
                                                                    <a 
                                                                        href={consultation.prescriptions[0].pdf_url || consultation.prescriptions[0].file_url || '#'} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        View Prescription PDF
                                                                    </a>
                                                                ) : (
                                                                    <p className="text-sm text-gray-400 italic">No prescription given</p>
                                                                )}
                                                            </div>

                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
