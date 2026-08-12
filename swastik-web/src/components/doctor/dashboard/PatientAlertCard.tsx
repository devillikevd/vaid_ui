'use client';

import React from 'react';
import { AlertCircle, FileText, Activity, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AlertData {
    id: string;
    patientName: string;
    type: string;
    message: string;
    priority: AlertPriority;
    time: string;
}

interface PatientAlertCardProps {
    alert: AlertData;
    index: number;
}

export function PatientAlertCard({ alert, index }: PatientAlertCardProps) {
    const getPriorityStyles = (priority: AlertPriority) => {
        switch(priority) {
            case 'critical': 
                return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
            case 'high': 
                return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
            case 'medium': 
                return { icon: FileText, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
            case 'low': 
                return { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        }
    };

    const styles = getPriorityStyles(alert.priority);
    const Icon = styles.icon;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group cursor-pointer flex items-start gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all duration-200"
        >
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${styles.bg} ${styles.border}`}>
                <Icon className={`w-5 h-5 ${styles.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white truncate">{alert.patientName}</h4>
                    <span className="text-[10px] font-medium text-[#A1A1AA] shrink-0">{alert.time}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.bg} ${styles.color}`}>
                        {alert.type}
                    </span>
                    <p className="text-xs text-[#A1A1AA] truncate">{alert.message}</p>
                </div>
            </div>

            <div className="shrink-0 pt-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
            </div>
        </motion.div>
    );
}
