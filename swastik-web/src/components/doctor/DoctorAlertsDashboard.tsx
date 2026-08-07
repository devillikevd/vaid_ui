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
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HealthAlertsView from '@/components/outbreak/HealthAlertsView';
import { doctorApi } from '@/lib/api';

// MOCK DATA REMOVED: Now fetching real alerts from backend

export default function DoctorAlertsDashboard() {
    const [activeTab, setActiveTab] = useState<'patients' | 'community'>('patients');
    const [patientAlerts, setPatientAlerts] = useState<any[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

    React.useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await doctorApi.getPatientAlerts();
                if (response.success) {
                    setPatientAlerts(response.data || []);
                }
            } catch (error) {
                console.error('Failed to load patient alerts:', error);
            } finally {
                setIsLoadingAlerts(false);
            }
        };

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
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                        Clinical Health Alerts
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Monitor critical patient vitals and community disease outbreaks
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                    onClick={() => setActiveTab('patients')}
                    className="rounded-2xl border bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-900/10 border-rose-100 dark:border-rose-900/30 p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex-shrink-0">
                            <HeartPulse className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-rose-600 dark:text-rose-400 truncate">Critical Patient Alerts</p>
                            <h3 className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                                {criticalCount} <span className="text-sm font-normal text-rose-500 ml-1">Action Required</span>
                            </h3>
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setActiveTab('patients')}
                    className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-900/10 border-amber-100 dark:border-amber-900/30 p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 truncate">Active Warnings</p>
                            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                {warningCount} <span className="text-sm font-normal text-amber-500 ml-1">Under Observation</span>
                            </h3>
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setActiveTab('community')}
                    className="rounded-2xl border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-900/10 border-blue-100 dark:border-blue-900/30 p-5 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex-shrink-0">
                            <Map className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">Community Advisories</p>
                            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                2 <span className="text-sm font-normal text-blue-500 ml-1">Active Updates</span>
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                        activeTab === 'patients' 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Patient Critical Alerts
                        {criticalCount > 0 && (
                            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {criticalCount}
                            </span>
                        )}
                    </div>
                    {activeTab === 'patients' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('community')}
                    className={`pb-4 px-6 text-sm font-semibold transition-colors relative ${
                        activeTab === 'community' 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Epidemics & Advisories
                    </div>
                    {activeTab === 'community' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'patients' ? (
                        <motion.div
                            key="patients"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {isLoadingAlerts ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                                    <p>Loading patient health alerts...</p>
                                </div>
                            ) : (
                                <>
                                    {patientAlerts.map((alert) => (
                                        <div 
                                            key={alert.id} 
                                            className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 ${alert.isRead ? 'opacity-70 grayscale-[30%]' : 'shadow-md shadow-gray-200/50 dark:shadow-none'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row">
                                                {/* Severity Border/Indicator */}
                                                <div className={`w-full sm:w-2 ${
                                                    alert.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`} />
                                                
                                                <div className="p-5 flex-1 flex flex-col md:flex-row gap-6">
                                                    {/* Patient Info */}
                                                    <div className="md:w-1/4">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                                                {alert.patientName}
                                                            </h3>
                                                            {alert.severity === 'critical' && !alert.isRead && (
                                                                <span className="flex h-3 w-3 relative md:hidden">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {alert.age} yrs • {alert.gender} • {alert.bloodGroup}
                                                        </p>
                                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {alert.timestamp}
                                                        </div>
                                                    </div>

                                                    {/* Alert Reason */}
                                                    <div className="md:w-2/4 border-l-0 md:border-l border-gray-100 dark:border-gray-800 md:pl-6">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider mb-2 ${
                                                            alert.severity === 'critical' 
                                                                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                                        }`}>
                                                            {alert.severity === 'critical' ? <HeartPulse className="w-3.5 h-3.5" /> : <Thermometer className="w-3.5 h-3.5" />}
                                                            {alert.severity} Alert
                                                        </div>
                                                        <p className="text-gray-800 dark:text-gray-200 font-medium">
                                                            {alert.trigger}
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="md:w-1/4 flex flex-col sm:flex-row md:flex-col gap-2 justify-center border-t border-gray-100 dark:border-gray-800 md:border-t-0 pt-4 md:pt-0">
                                                        {alert.severity === 'critical' ? (
                                                            <button 
                                                                onClick={() => markAsRead(alert.id)}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                                            >
                                                                <PhoneCall className="w-4 h-4" />
                                                                Emergency Call
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => markAsRead(alert.id)}
                                                                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                                Message Patient
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => markAsRead(alert.id)}
                                                            className="flex-1 flex items-center justify-center gap-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/20 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Review Records
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {patientAlerts.length === 0 && (
                                        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                            <ShieldAlert className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No active alerts</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mt-1">All your patients are currently stable.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="community"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
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
