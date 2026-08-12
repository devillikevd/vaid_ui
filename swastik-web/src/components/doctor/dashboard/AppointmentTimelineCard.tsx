'use client';

import React from 'react';
import { Video, MapPin, MoreVertical, Clock, Play, CalendarX, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getInitials } from '@/lib/utils';
import Image from 'next/image';

export type AppointmentStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'waiting';

export interface AppointmentData {
    id: string;
    patientName: string;
    patientImage?: string;
    age: number;
    gender: 'M' | 'F' | 'O';
    type: 'video' | 'clinic';
    time: string;
    status: AppointmentStatus;
}

interface AppointmentTimelineCardProps {
    appointment: AppointmentData;
    index: number;
}

export function AppointmentTimelineCard({ appointment, index }: AppointmentTimelineCardProps) {
    
    const getStatusColor = (status: AppointmentStatus) => {
        switch(status) {
            case 'waiting': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'in-progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-white/5 text-white/50 border-white/10';
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative flex gap-4"
        >
            {/* Timeline Line & Dot */}
            <div className="flex flex-col items-center min-w-[60px]">
                <div className="text-sm font-bold text-white mb-2">{appointment.time}</div>
                <div className="relative flex-1 flex justify-center">
                    <div className="absolute top-0 bottom-0 w-[2px] bg-white/5" />
                    <div className={`relative z-10 w-3 h-3 rounded-full border-2 border-[#09090B] shadow-[0_0_0_2px_rgba(255,255,255,0.1)] mt-1 ${
                        appointment.status === 'in-progress' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                        appointment.status === 'waiting' ? 'bg-yellow-500' :
                        appointment.status === 'completed' ? 'bg-green-500' :
                        'bg-[#22C55E]'
                    }`} />
                </div>
            </div>

            {/* Main Card */}
            <div className="flex-1 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] backdrop-blur-md border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 sm:p-5 transition-all duration-300 mb-6 group-hover:border-[rgba(255,255,255,0.1)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Patient Info */}
                    <div className="flex items-center gap-4">
                        {appointment.patientImage ? (
                            <Image 
                                src={appointment.patientImage} 
                                alt={appointment.patientName}
                                width={48}
                                height={48}
                                className="rounded-full border border-white/10 object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold border border-white/10">
                                {getInitials(appointment.patientName)}
                            </div>
                        )}
                        <div>
                            <h4 className="text-base font-bold text-white tracking-tight">{appointment.patientName}</h4>
                            <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mt-1">
                                <span>{appointment.age} yrs • {appointment.gender}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <div className="flex items-center gap-1">
                                    {appointment.type === 'video' ? <Video className="w-3 h-3 text-blue-400" /> : <MapPin className="w-3 h-3 text-emerald-400" />}
                                    <span>{appointment.type === 'video' ? 'Video Consult' : 'Clinic Visit'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions & Status */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(appointment.status)}`}>
                            {appointment.status.replace('-', ' ')}
                        </div>

                        <div className="flex items-center gap-2">
                            {(appointment.status === 'scheduled' || appointment.status === 'waiting') && (
                                <button className="flex items-center gap-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                    <Play className="w-3.5 h-3.5" />
                                    Join
                                </button>
                            )}
                            <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5" title="Patient Profile">
                                <User className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
