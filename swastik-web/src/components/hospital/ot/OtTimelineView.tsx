'use client';

import React from 'react';
import {
    Scissors,
    Clock,
    User,
    AlertTriangle,
    ShieldAlert,
    Building2,
    Calendar
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface OtTimelineViewProps {
    rooms: any[];
    schedules: any[];
    selectedDate: string;
    onSelectSurgery: (surgery: any) => void;
}

export function OtTimelineView({
    rooms,
    schedules,
    selectedDate,
    onSelectSurgery,
}: OtTimelineViewProps) {
    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00'
    ];

    const startHour = 8;
    const totalHours = 12; // 08:00 to 20:00

    const getPositionPercentage = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            const hours = d.getHours() + d.getMinutes() / 60;
            const clamped = Math.max(startHour, Math.min(startHour + totalHours, hours));
            return ((clamped - startHour) / totalHours) * 100;
        } catch {
            return 0;
        }
    };

    const getWidthPercentage = (startStr: string, endStr?: string, durationMins = 60) => {
        try {
            const start = new Date(startStr);
            const end = endStr ? new Date(endStr) : new Date(start.getTime() + durationMins * 60000);
            const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000);
            const pct = (durationHours / totalHours) * 100;
            return Math.max(8, Math.min(100, pct));
        } catch {
            return 12;
        }
    };

    if (rooms.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-12 text-center shadow-2xs">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    No Operation Theatres Configured
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    Click "Manage OT Rooms" above to configure your surgical suites.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/80 dark:border-gray-800 p-4 shadow-2xs space-y-4 overflow-hidden">
            
            {/* Header & Time Grid Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Operational Theatre Schedule Timeline (08:00 AM – 08:00 PM)
                    </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                    Date: {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            </div>

            {/* Timeline Container */}
            <div className="overflow-x-auto">
                <div className="min-w-[850px] space-y-4">
                    
                    {/* Time Header Scale */}
                    <div className="grid grid-cols-12 pl-36 text-[10px] font-mono font-bold text-slate-400 border-b border-slate-100 dark:border-gray-800 pb-1">
                        {timeSlots.slice(0, 12).map((slot, i) => (
                            <div key={i} className="text-left">
                                {slot}
                            </div>
                        ))}
                    </div>

                    {/* Rooms Rows */}
                    <div className="space-y-3">
                        {rooms.map((room) => {
                            const roomSchedules = schedules.filter(
                                (s) => (s.ot_room_id === room.id || s.otRoom?.id === room.id) && s.status !== 'cancelled'
                            );

                            return (
                                <div key={room.id} className="flex items-stretch gap-3">
                                    
                                    {/* Room Label Badge */}
                                    <div className="w-32 shrink-0 p-2.5 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/70 dark:border-gray-700 flex flex-col justify-center">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                            {room.name}
                                        </span>
                                        <span className="text-[10px] text-teal-600 dark:text-teal-400 capitalize font-medium">
                                            {room.room_type || 'Major'} {room.floor ? `• Fl ${room.floor}` : ''}
                                        </span>
                                    </div>

                                    {/* Timeline Track */}
                                    <div className="flex-1 relative h-16 bg-slate-50/70 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-800 overflow-hidden">
                                        {/* Vertical hour guide lines */}
                                        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none divide-x divide-slate-200/40 dark:divide-gray-800">
                                            {Array.from({ length: 12 }).map((_, idx) => (
                                                <div key={idx} className="h-full" />
                                            ))}
                                        </div>

                                        {/* Surgery Blocks */}
                                        {roomSchedules.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic">
                                                Available — No procedures booked in this window
                                            </div>
                                        ) : (
                                            roomSchedules.map((s) => {
                                                const leftPct = getPositionPercentage(s.scheduled_start);
                                                const widthPct = getWidthPercentage(s.scheduled_start, s.scheduled_end, s.estimated_duration_minutes);

                                                return (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => onSelectSurgery(s)}
                                                        style={{
                                                            left: `${leftPct}%`,
                                                            width: `${widthPct}%`,
                                                        }}
                                                        className={`absolute top-1.5 bottom-1.5 rounded-xl p-2 text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md border flex flex-col justify-between overflow-hidden ${
                                                            s.priority === 'emergency'
                                                                ? 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800'
                                                                : s.status === 'in_progress'
                                                                ? 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800'
                                                                : s.status === 'post_op'
                                                                ? 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800'
                                                                : 'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800'
                                                        }`}
                                                        title={`${s.surgery_name} - ${s.patient?.name} (Dr. ${s.primarySurgeon?.name || 'Surgeon'})`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="font-bold text-[11px] truncate">
                                                                {s.surgery_name}
                                                            </span>
                                                            <span className="font-mono text-[9px] uppercase font-semibold">
                                                                {new Date(s.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] opacity-90 truncate">
                                                            <span className="truncate">
                                                                {s.patient?.name || 'Patient'}
                                                            </span>
                                                            <span className="truncate ml-1 font-medium">
                                                                Dr. {s.primarySurgeon?.name || 'Surgeon'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

        </div>
    );
}
