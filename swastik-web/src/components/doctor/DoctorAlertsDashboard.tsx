'use client';

import React, { useState } from 'react';
import { 
    AlertTriangle, 
    Activity, 
    ShieldAlert, 
    HeartPulse, 
    PhoneCall, 
    MessageSquare, 
    FileText,
    Map,
    Thermometer,
    Clock,
    User,
    RefreshCw,
    ShieldCheck,
    Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HealthAlertsView from '@/components/outbreak/HealthAlertsView';
import { doctorApi } from '@/lib/api';
import { MetricCard } from '@/components/doctor/MetricCard';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';

const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 flex gap-6">
                <div className="w-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="flex-1 space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                </div>
            </div>
        ))}
    </div>
);

export default function DoctorAlertsDashboard() {
    const [activeTab, setActiveTab] = useState<'patients' | 'community'>('patients');
    const [patientAlerts, setPatientAlerts] = useState<any[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAlerts = async () => {
        setIsRefreshing(true);
        try {
            const response = await doctorApi.getPatientAlerts();
            if (response.success) {
                setPatientAlerts(response.data || []);
                setLastSync(new Date());
            }
        } catch (error) {
            console.error('Failed to load patient alerts:', error);
        } finally {
            setIsLoadingAlerts(false);
            setIsRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchAlerts();
    }, []);

    const markAsRead = (id: number) => {
        setPatientAlerts(prev => prev.map(alert => 
            alert.id === id ? { ...alert, isRead: true } : alert
        ));
    };

    const criticalCount = patientAlerts.filter(a => a.severity === 'critical' && !a.isRead).length;
    const warningCount = patientAlerts.filter(a => a.severity === 'warning' && !a.isRead).length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Enterprise Hero Section */}
            <DoctorPortalCard className="!p-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Clinical Health Alerts
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium ml-1">
                        Real-time patient monitoring and epidemic intelligence
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-3 pr-4 sm:border-r border-gray-200 dark:border-gray-700">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">System Status</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Active Monitoring</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 pl-0 sm:pl-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Last Sync</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <button 
                            onClick={fetchAlerts}
                            disabled={isRefreshing}
                            className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : 'group-hover:text-emerald-600'}`} />
                        </button>
                    </div>
                </div>
            </DoctorPortalCard>

            {/* Premium Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => setActiveTab('patients')} className="cursor-pointer">
                    <MetricCard
                        title="Critical Action"
                        value={criticalCount.toString()}
                        icon={<HeartPulse className="h-5 w-5" />}
                        trend={{ value: criticalCount > 0 ? 1 : 0, direction: 'down', label: criticalCount > 0 ? 'Immediate Attention Required' : 'No Critical Alerts' }}
                    />
                </div>

                <div onClick={() => setActiveTab('patients')} className="cursor-pointer">
                    <MetricCard
                        title="Observation"
                        value={warningCount.toString()}
                        icon={<AlertTriangle className="h-5 w-5" />}
                        trend={{ value: warningCount > 0 ? 1 : 0, direction: 'down', label: warningCount > 0 ? 'Active Warnings' : 'Patients Stable' }}
                    />
                </div>

                <div onClick={() => setActiveTab('community')} className="cursor-pointer">
                    <MetricCard
                        title="Advisories"
                        value="Active"
                        icon={<Map className="h-5 w-5" />}
                        trend={{ value: 1, direction: 'up', label: 'Community Intelligence' }}
                    />
                </div>
            </div>

            {/* Premium Pill Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl w-fit border border-gray-200 dark:border-gray-700 shadow-inner">
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`relative px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                        activeTab === 'patients' 
                            ? 'text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {activeTab === 'patients' && (
                        <motion.div 
                            layoutId="tab-bg" 
                            className="absolute inset-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
                        />
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                        <User className={`w-4 h-4 ${activeTab === 'patients' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                        Clinical Vitals
                        {criticalCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm ml-1">
                                {criticalCount}
                            </span>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('community')}
                    className={`relative px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                        activeTab === 'community' 
                            ? 'text-gray-900 dark:text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    {activeTab === 'community' && (
                        <motion.div 
                            layoutId="tab-bg" 
                            className="absolute inset-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
                        />
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                        <ShieldAlert className={`w-4 h-4 ${activeTab === 'community' ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                        Epidemic Intelligence
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'patients' ? (
                        <motion.div
                            key="patients"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-5"
                        >
                            {isLoadingAlerts ? (
                                <DashboardSkeleton />
                            ) : (
                                <>
                                    {patientAlerts.map((alert) => (
                                        <div 
                                            key={alert.id} 
                                            className={`bg-white dark:bg-gray-900 rounded-3xl border transition-all duration-300 overflow-hidden group ${
                                                alert.isRead 
                                                    ? 'opacity-60 border-gray-200 dark:border-gray-800' 
                                                    : alert.severity === 'critical'
                                                        ? 'border-rose-200 dark:border-rose-900/50 shadow-md shadow-rose-900/5 hover:shadow-lg'
                                                        : 'border-amber-200 dark:border-amber-900/50 shadow-md shadow-amber-900/5 hover:shadow-lg'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row relative">
                                                {/* Left Indicator Strip */}
                                                <div className={`w-full sm:w-2 ${
                                                    alert.isRead ? 'bg-gray-300 dark:bg-gray-700' : alert.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`} />
                                                
                                                <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                                                    
                                                    {/* Patient Profile */}
                                                    <div className="md:w-1/3 w-full">
                                                        <div className="flex items-start gap-4">
                                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                                                                alert.severity === 'critical' && !alert.isRead
                                                                    ? 'bg-rose-100 text-rose-700 ring-4 ring-rose-50 dark:bg-rose-900/40 dark:text-rose-400 dark:ring-rose-900/20'
                                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                            }`}>
                                                                {alert.patientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                                                    {alert.patientName}
                                                                    {alert.severity === 'critical' && !alert.isRead && (
                                                                        <span className="flex h-2.5 w-2.5 relative">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                                                                        </span>
                                                                    )}
                                                                </h3>
                                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                                    {alert.age} yrs • {alert.gender} • {alert.bloodGroup}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Alert Details */}
                                                    <div className="md:w-1/3 w-full border-l-0 md:border-l-2 border-gray-100 dark:border-gray-800 md:pl-8">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest mb-3 ${
                                                            alert.isRead ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' :
                                                            alert.severity === 'critical' 
                                                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800/50'
                                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800/50'
                                                        }`}>
                                                            {alert.severity === 'critical' ? <HeartPulse className="w-3.5 h-3.5" /> : <Thermometer className="w-3.5 h-3.5" />}
                                                            {alert.severity} Alert
                                                        </div>
                                                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-base leading-relaxed">
                                                            {alert.trigger}
                                                        </p>
                                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-bold tracking-wide">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {alert.timestamp}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="md:w-1/3 w-full flex flex-col sm:flex-row md:flex-col gap-3 justify-center md:items-end">
                                                        {alert.severity === 'critical' ? (
                                                            <button 
                                                                onClick={() => markAsRead(alert.id)}
                                                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm shadow-rose-600/20 transition-all hover:shadow-md"
                                                            >
                                                                <PhoneCall className="w-4 h-4" />
                                                                Emergency Contact
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => markAsRead(alert.id)}
                                                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                                Message Patient
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => markAsRead(alert.id)}
                                                            className="w-full md:w-auto flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Review EHR
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {patientAlerts.length === 0 && (
                                        <div className="text-center py-20 px-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center">
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-full mb-6 ring-8 ring-emerald-50/50 dark:ring-emerald-900/10">
                                                <ShieldCheck className="w-16 h-16 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">No Active Clinical Alerts</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-base max-w-sm mx-auto font-medium leading-relaxed">
                                                All monitored patients are currently stable. The system continues monitoring patient vitals in real time.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="community"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <HealthAlertsView
                                title=""
                                subtitle=""
                                accentColor="text-blue-600"
                                fetchAlerts={doctorApi.getOutbreakAlerts}
                                fetchHeatmap={doctorApi.getOutbreakHeatmap}
                                fetchStats={doctorApi.getOutbreakStats}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
