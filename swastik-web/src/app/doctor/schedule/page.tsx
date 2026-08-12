'use client';

import { useEffect, useState } from 'react';
import { 
    Clock, Plus, Loader2, RefreshCw, Trash2, AlertCircle, X, 
    Info, CalendarPlus, ChevronDown, PauseCircle, 
    PlayCircle, CalendarX, CalendarDays, Hourglass, Activity, ShieldAlert, FileText, CheckCircle2,
    Calendar as CalendarIcon
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useDoctorStore } from '@/stores/doctorStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';

function generateSubSlots(start: string, end: string, intervalMinutes: number = 30) {
    const slots = [];
    const [h, m] = start.split(':').map(Number);
    let current = h * 60 + (m || 0);
    const [eh, em] = end.split(':').map(Number);
    const endMinutes = eh * 60 + (em || 0);

    while (current < endMinutes) {
        const startH = Math.floor(current / 60).toString().padStart(2, '0');
        const startM = (current % 60).toString().padStart(2, '0');
        let next = current + intervalMinutes;
        if (next > endMinutes) next = endMinutes;
        const endH = Math.floor(next / 60).toString().padStart(2, '0');
        const endM = (next % 60).toString().padStart(2, '0');
        slots.push(`${startH}:${startM} - ${endH}:${endM}`);
        current = next;
    }
    return slots;
}

const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
};

export default function DoctorSchedulePage() {
    const { schedule, blockedSlots, bookedSlots, leaves, loadingSchedule, loadingLeaves, error, fetchSchedule, updateSchedule, fetchLeaves, addLeave, deleteLeave, clearError, toggleSlotBlock } = useDoctorStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'schedule' | 'leaves'>('schedule');
    const [newSlot, setNewSlot] = useState({ 
        slot_date: new Date().toISOString().split('T')[0], 
        startTime: '09:00', 
        endTime: '17:00', 
        isVideoEnabled: true, 
        isClinicEnabled: true,
        isHomeEnabled: false,
        slotDuration: 15,
        bufferTime: 0
    });
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringWeeks, setRecurringWeeks] = useState(4);
    const [newLeave, setNewLeave] = useState({ start_date: '', end_date: '', reason: '' });
    const [saving, setSaving] = useState(false);
    const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());
    const [optimisticBlocks, setOptimisticBlocks] = useState<Set<string>>(new Set());
    const [optimisticUnblocks, setOptimisticUnblocks] = useState<Set<string>>(new Set());
    
    const toggleExpand = (idx: number) => {
        const next = new Set(expandedSlots);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setExpandedSlots(next);
    };

    const handleToggleBlock = async (date: string, timeRange: string) => {
        const timeSlot = timeRange.split(' - ')[0]; // Extract just the start time (HH:MM)
        const slotKey = `${date}_${timeSlot}`;
        
        let isBlocked = blockedSlots.some(b => b.date === date && b.time === timeSlot);
        if (optimisticBlocks.has(slotKey)) isBlocked = true;
        if (optimisticUnblocks.has(slotKey)) isBlocked = false;

        const action = isBlocked ? 'unblock' : 'block';
        
        if (action === 'block') {
            setOptimisticBlocks(prev => new Set(prev).add(slotKey));
            setOptimisticUnblocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
        } else {
            setOptimisticUnblocks(prev => new Set(prev).add(slotKey));
            setOptimisticBlocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
        }

        const success = await toggleSlotBlock(date, timeSlot, action);
        
        if (!success) {
            if (action === 'block') {
                setOptimisticBlocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
            } else {
                setOptimisticUnblocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
            }
        }
    };
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    useEffect(() => { 
        fetchSchedule(); 
        fetchLeaves();
    }, [fetchSchedule, fetchLeaves]);

    const handleAddSlot = async () => {
        setSaving(true);
        let updatedSlots = [...schedule];
        
        if (isRecurring) {
            const startDate = new Date(newSlot.slot_date);
            const generatedSlots = [];
            for (let i = 0; i < recurringWeeks; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (i * 7));
                generatedSlots.push({ ...newSlot, slot_date: date.toISOString().split('T')[0], isAvailable: true });
            }
            updatedSlots = [...updatedSlots, ...generatedSlots];
        } else {
            updatedSlots.push({ ...newSlot, isAvailable: true });
        }
        
        const success = await updateSchedule(updatedSlots as unknown as Record<string, unknown>[]);
        if (success) {
            setShowAddModal(false);
            setNewSlot({ slot_date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00', isVideoEnabled: true, isClinicEnabled: true, isHomeEnabled: false, slotDuration: 15, bufferTime: 0 });
            setIsRecurring(false);
            setRecurringWeeks(4);
        }
        setSaving(false);
    };

    const handleAddLeave = async () => {
        setSaving(true);
        const success = await addLeave(newLeave.start_date, newLeave.end_date, newLeave.reason);
        if (success) {
            setShowLeaveModal(false);
            setNewLeave({ start_date: '', end_date: '', reason: '' });
        }
        setSaving(false);
    };

    const handleDeleteLeave = async (id: string) => {
        const confirmed = await confirmAction({ title: 'Remove Leave', message: 'Are you sure you want to remove this leave?', confirmLabel: 'Remove', variant: 'warning' });
        if (confirmed) {
            await deleteLeave(id);
        }
    };

    const handleRemoveSlot = async (index: number) => {
        const confirmed = await confirmAction({ title: 'Remove Slot', message: 'Remove this time slot?', confirmLabel: 'Remove', variant: 'warning' });
        if (!confirmed) return;
        setSaving(true);
        const updatedSlots = schedule.filter((_, i) => i !== index);
        await updateSchedule(updatedSlots as unknown as Record<string, unknown>[]);
        setSaving(false);
    };

    const handleToggleSlot = async (index: number) => {
        setSaving(true);
        const updatedSlots = schedule.map((slot, i) =>
            i === index ? { ...slot, isAvailable: !slot.isAvailable } : slot
        );
        await updateSchedule(updatedSlots as unknown as Record<string, unknown>[]);
        setSaving(false);
    };

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const futureSchedule = schedule.filter(s => s.slot_date >= todayStr);
    const uniqueDates = Array.from(new Set(futureSchedule.map(s => s.slot_date))).sort();
    const scheduleByDate = uniqueDates.map(date => ({
        date,
        slots: schedule.map((s, i) => ({ ...s, _idx: i })).filter(s => s.slot_date === date),
    }));

    const activeSlots = futureSchedule.filter((slot) => slot.isAvailable).length;
    const inactiveSlots = Math.max(futureSchedule.length - activeSlots, 0);
    const workingDays = uniqueDates.length;

    // Calculate today's hours
    let todayMinutes = 0;
    const todaySlots = futureSchedule.filter(s => s.slot_date === todayStr && s.isAvailable);
    todaySlots.forEach(s => {
        const startM = parseTimeToMinutes(s.startTime);
        const endM = parseTimeToMinutes(s.endTime);
        if (endM > startM) todayMinutes += (endM - startM);
    });
    const todayHoursStr = todayMinutes > 0 ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m` : '0h';

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Premium Linear-style Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-2 pl-3 rounded-2xl gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-[13px] font-medium text-blue-900 dark:text-blue-300">
                        <strong className="font-bold">In-Person Consultation Requirements:</strong> You must be affiliated with a registered Clinic or Hospital to accept In-Person consultations.
                    </p>
                </div>
                <Link href="/doctor/invites" className="text-[13px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 whitespace-nowrap px-4 py-2 bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-colors sm:self-center">
                    View Invitations →
                </Link>
            </div>

            {/* Hero Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Schedule & Leaves
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                        Manage consultation availability, working hours and time off.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={activeTab === 'schedule' ? fetchSchedule : fetchLeaves} 
                        disabled={saving || loadingSchedule || loadingLeaves}
                        className="h-11 rounded-xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingSchedule || loadingLeaves ? 'animate-spin' : ''}`} />
                    </Button>
                    {activeTab === 'schedule' ? (
                        <Button 
                            onClick={() => setShowAddModal(true)} 
                            disabled={saving}
                            className="h-11 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-bold border-0 px-6 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Slot
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => setShowLeaveModal(true)} 
                            disabled={saving}
                            className="h-11 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-800 text-white shadow-sm font-bold px-6 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <CalendarX className="w-4 h-4" /> Add Leave
                        </Button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {(error && !loadingSchedule) && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                    <p className="text-red-700 dark:text-red-400 font-bold mb-4">{error}</p>
                    <Button onClick={() => { clearError(); fetchSchedule(); }} leftIcon={<RefreshCw className="h-4 w-4" />} className="rounded-xl h-11">Retry</Button>
                </div>
            )}

            {/* Tab Controls & Status Pills */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
                {/* Premium Pill Tabs */}
                <div className="relative flex p-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl w-full sm:w-[320px]">
                    <motion.div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-900 shadow-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl"
                        initial={false}
                        animate={activeTab === 'schedule' ? { x: 4 } : { x: 'calc(100% + 4px)' }}
                        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors duration-200 ${activeTab === 'schedule' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Schedule
                    </button>
                    <button 
                        onClick={() => setActiveTab('leaves')}
                        className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors duration-200 ${activeTab === 'leaves' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        Leaves
                    </button>
                </div>

                {/* Status Pills */}
                {activeTab === 'schedule' && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2.5 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">{activeSlots} Active</span>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-sm text-gray-500">
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase tracking-widest">{inactiveSlots} Paused</span>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-sm text-gray-500 hidden sm:flex">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase tracking-widest">{workingDays} Days</span>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-sm text-gray-500 hidden sm:flex">
                            <Hourglass className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold uppercase tracking-widest">{todayHoursStr} Today</span>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'schedule' ? (
                    <motion.div
                        key="schedule"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8 mt-4"
                    >
                        {/* Calendar View */}
                        {loadingSchedule ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-transparent">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                <span className="font-bold text-gray-500">Syncing schedule...</span>
                            </div>
                        ) : scheduleByDate.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6">
                                    <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">No schedules yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                                    Create your first availability schedule to start accepting patient appointments.
                                </p>
                                <Button 
                                    onClick={() => setShowAddModal(true)} 
                                    className="h-12 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm font-bold px-8 text-base transition-all active:scale-95 hover:-translate-y-0.5"
                                >
                                    <Plus className="w-5 h-5 mr-2" /> Add Schedule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {scheduleByDate.map(({ date, slots }) => {
                                    const dateObj = new Date(date);
                                    const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
                                    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                    
                                    return (
                                        <div key={date} className="flex flex-col md:flex-row gap-4 md:gap-8 group/day">
                                            {/* Date Header Column */}
                                            <div className="md:w-48 shrink-0 md:pt-4 flex flex-row md:flex-col items-end md:items-start justify-between md:justify-start">
                                                <div>
                                                    <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{dayName}</h3>
                                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">{dateStr}</p>
                                                </div>
                                                <div className="md:mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'}
                                                </div>
                                            </div>

                                            {/* Slots List */}
                                            <div className="flex-1 space-y-4">
                                                {slots.map((slot) => {
                                                    const isExpanded = expandedSlots.has(slot._idx);
                                                    const subSlots = generateSubSlots(slot.startTime, slot.endTime, (slot as any).slotDuration || 30);
                                                    
                                                    return (
                                                        <div 
                                                            key={slot._idx} 
                                                            className={`group/card relative bg-white dark:bg-gray-900 rounded-3xl border transition-all duration-300 hover:-translate-y-1 overflow-hidden 
                                                                ${slot.isAvailable 
                                                                    ? 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:shadow-[0_8px_30px_rgb(16,185,129,0.06)]' 
                                                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 opacity-80 hover:opacity-100 hover:shadow-lg'
                                                                }`}
                                                        >
                                                            {/* Main Slot Card */}
                                                            <div 
                                                                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer"
                                                                onClick={() => toggleExpand(slot._idx)}
                                                            >
                                                                <div className="flex items-start sm:items-center gap-5">
                                                                    <div className={`p-4 rounded-2xl shrink-0 transition-colors ${slot.isAvailable ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                                                                        <Clock className="w-7 h-7" strokeWidth={1.5} />
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-col">
                                                                        <div className="flex flex-wrap items-center gap-3">
                                                                            <h4 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${slot.isAvailable ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300'}`}>
                                                                                {slot.startTime} <span className="text-gray-300 dark:text-gray-600 font-normal mx-1">→</span> {slot.endTime}
                                                                            </h4>
                                                                            {slot.isAvailable ? (
                                                                                <span className="px-2.5 py-1 rounded-md bg-emerald-50/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200/50 dark:border-emerald-800/30">Active</span>
                                                                            ) : (
                                                                                <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest border border-gray-200 dark:border-gray-700">Paused</span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                                                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-800/50">
                                                                                <Hourglass className="w-3.5 h-3.5" /> {(slot as any).slotDuration || 30}m
                                                                            </span>
                                                                            {slot.is_video_enabled && (
                                                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                                                    Video
                                                                                </span>
                                                                            )}
                                                                            {slot.is_clinic_enabled && (
                                                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                                                    Clinic
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 self-start sm:self-center ml-16 sm:ml-0" onClick={e => e.stopPropagation()}>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        onClick={() => handleToggleSlot(slot._idx)} 
                                                                        className={`h-11 w-11 p-0 rounded-xl transition-colors ${slot.isAvailable ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/30' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30'}`} 
                                                                        title={slot.isAvailable ? 'Pause Slot' : 'Resume Slot'}
                                                                    >
                                                                        {slot.isAvailable ? <PauseCircle className="h-6 w-6" strokeWidth={1.5} /> : <PlayCircle className="h-6 w-6" strokeWidth={1.5} />}
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost"
                                                                        onClick={() => handleRemoveSlot(slot._idx)} 
                                                                        className="h-11 w-11 p-0 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" 
                                                                        title="Delete Block"
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </Button>
                                                                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                                                    <button className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-400 group-hover/card:bg-gray-50 dark:group-hover/card:bg-gray-800 transition-colors">
                                                                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Expanded Sub-slots Area */}
                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden"
                                                                    >
                                                                        <div className="p-5 sm:p-6">
                                                                            <div className="flex justify-between items-center mb-4">
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                                    <Activity className="w-3.5 h-3.5" /> Bookable Intervals
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                                                {subSlots.map(timeRange => {
                                                                                    const timeSlot = timeRange.split(' - ')[0];
                                                                                    const slotKey = `${date}_${timeSlot}`;
                                                                                    
                                                                                    const isBooked = bookedSlots.some(b => b.date === date && b.time === timeSlot);
                                                                                    
                                                                                    let isBlocked = blockedSlots.some(b => b.date === date && b.time === timeSlot);
                                                                                    if (optimisticBlocks.has(slotKey)) isBlocked = true;
                                                                                    if (optimisticUnblocks.has(slotKey)) isBlocked = false;
                                                                                    
                                                                                    return (
                                                                                        <button 
                                                                                            key={timeRange} 
                                                                                            onClick={() => !isBooked && handleToggleBlock(date, timeRange)}
                                                                                            disabled={isBooked}
                                                                                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center relative overflow-hidden group/slot shadow-sm
                                                                                                ${isBooked 
                                                                                                    ? 'bg-blue-50/50 text-blue-700 border-blue-200 cursor-not-allowed dark:bg-blue-900/10 dark:border-blue-800/30 dark:text-blue-400'
                                                                                                    : isBlocked 
                                                                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/80 dark:text-gray-500 dark:border-gray-700 dark:hover:bg-gray-700' 
                                                                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:bg-gray-900 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-gray-800 dark:hover:border-emerald-600'
                                                                                                }`}
                                                                                            title={isBooked ? "Booked by a patient" : isBlocked ? "Click to Unblock" : "Click to Block"}
                                                                                        >
                                                                                            <span className={`z-10 text-sm ${isBlocked && !isBooked ? 'line-through decoration-gray-400' : ''}`}>{timeSlot}</span>
                                                                                            {isBooked && (
                                                                                                <div className="absolute inset-0 bg-blue-100/90 dark:bg-blue-900/80 flex items-center justify-center backdrop-blur-[1px]">
                                                                                                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-800 dark:text-blue-300">Booked</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="leaves"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6 mt-8 max-w-4xl"
                    >
                        {loadingLeaves ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-transparent">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                <span className="font-bold text-gray-500">Loading leaves...</span>
                            </div>
                        ) : leaves.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6">
                                    <CalendarX className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">No Leaves Scheduled</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                                    You have no upcoming time off. Plan your vacations or unavailability here.
                                </p>
                                <Button 
                                    onClick={() => setShowLeaveModal(true)} 
                                    className="h-12 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-800 text-white shadow-sm font-bold px-8 text-base transition-all active:scale-95 hover:-translate-y-0.5"
                                >
                                    <Plus className="w-5 h-5 mr-2" /> Request Leave
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline Line */}
                                <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>
                                
                                <div className="space-y-6">
                                    {leaves.map((leave, i) => {
                                        const startDate = new Date(leave.start_date);
                                        const endDate = new Date(leave.end_date);
                                        const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
                                        
                                        return (
                                            <div key={leave.id} className="relative flex items-start gap-6 sm:pl-8 group">
                                                {/* Timeline Dot */}
                                                <div className="absolute left-[-5px] top-6 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-gray-50 dark:ring-gray-950 hidden sm:block"></div>
                                                
                                                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex-1 transition-all duration-300 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                                                                    {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    {leave.start_date !== leave.end_date && ` - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                                                </h3>
                                                                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2.5 py-1 rounded-md uppercase font-extrabold tracking-widest border border-gray-200 dark:border-gray-700">
                                                                    {durationDays} Day{durationDays > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-start gap-2">
                                                                <FileText className="w-4 h-4 mt-0.5 text-gray-400" />
                                                                {leave.reason || 'Personal Leave'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 self-start">
                                                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Scheduled
                                                            </div>
                                                            <Button 
                                                                variant="ghost"
                                                                onClick={() => handleDeleteLeave(leave.id)} 
                                                                className="h-10 w-10 p-0 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                title="Delete Leave"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Add Slot Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden z-10"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                        <CalendarPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Create Schedule</h3>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                            </div>
                            
                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Consultation Date</label>
                                    <input 
                                        type="date"
                                        value={newSlot.slot_date} 
                                        onChange={e => setNewSlot(s => ({ ...s, slot_date: e.target.value }))} 
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Start Time</label>
                                        <input 
                                            type="time" 
                                            value={newSlot.startTime} 
                                            onChange={e => setNewSlot(s => ({ ...s, startTime: e.target.value }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">End Time</label>
                                        <input 
                                            type="time" 
                                            value={newSlot.endTime} 
                                            onChange={e => setNewSlot(s => ({ ...s, endTime: e.target.value }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Slot Duration</label>
                                        <select 
                                            value={newSlot.slotDuration} 
                                            onChange={e => setNewSlot(s => ({ ...s, slotDuration: parseInt(e.target.value) }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none appearance-none"
                                        >
                                            <option value={10}>10 min</option>
                                            <option value={15}>15 min</option>
                                            <option value={20}>20 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={60}>60 min</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Buffer Time</label>
                                        <select 
                                            value={newSlot.bufferTime} 
                                            onChange={e => setNewSlot(s => ({ ...s, bufferTime: parseInt(e.target.value) }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none appearance-none"
                                        >
                                            <option value={0}>No buffer</option>
                                            <option value={5}>5 min</option>
                                            <option value={10}>10 min</option>
                                            <option value={15}>15 min</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Consultation Types</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setNewSlot(s => ({ ...s, isVideoEnabled: !s.isVideoEnabled }))}
                                            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all ${newSlot.isVideoEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${newSlot.isVideoEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {newSlot.isVideoEnabled && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm font-bold">Video Consult</span>
                                        </button>
                                        <button
                                            onClick={() => setNewSlot(s => ({ ...s, isClinicEnabled: !s.isClinicEnabled }))}
                                            className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all ${newSlot.isClinicEnabled ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${newSlot.isClinicEnabled ? 'border-purple-500 bg-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {newSlot.isClinicEnabled && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm font-bold">In-Person Clinic</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">Repeat Weekly</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Create recurring slots automatically</span>
                                    </div>
                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                        {isRecurring && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">For</span>
                                                <select 
                                                    value={recurringWeeks} 
                                                    onChange={e => setRecurringWeeks(parseInt(e.target.value))}
                                                    className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold outline-none shadow-sm"
                                                >
                                                    {[2,3,4,5,6,8,10,12].map(w => (
                                                        <option key={w} value={w}>{w} weeks</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${isRecurring ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <Button variant="outline" onClick={() => setShowAddModal(false)} className="h-11 rounded-xl px-6 font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
                                <Button onClick={handleAddSlot} isLoading={saving} className="h-11 rounded-xl px-6 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm font-bold border-0 transition-all active:scale-95 hover:-translate-y-0.5">Create Schedule</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Premium Leave Modal */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => setShowLeaveModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden z-10"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <CalendarX className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Request Leave</h3>
                                </div>
                                <button onClick={() => setShowLeaveModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Start Date</label>
                                        <input 
                                            type="date"
                                            value={newLeave.start_date} 
                                            onChange={e => setNewLeave(s => ({ ...s, start_date: e.target.value }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-gray-900/10 dark:focus:ring-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">End Date</label>
                                        <input 
                                            type="date"
                                            value={newLeave.end_date} 
                                            onChange={e => setNewLeave(s => ({ ...s, end_date: e.target.value }))} 
                                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-gray-900/10 dark:focus:ring-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none"
                                            min={newLeave.start_date || new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Reason (Optional)</label>
                                    <textarea 
                                        placeholder="e.g. Vacation, Medical Emergency"
                                        value={newLeave.reason} 
                                        onChange={e => setNewLeave(s => ({ ...s, reason: e.target.value }))} 
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-gray-900/10 dark:focus:ring-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-all outline-none resize-none min-h-[100px]"
                                    />
                                </div>
                                
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/50 p-4 rounded-xl flex gap-3.5 items-start">
                                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Impacts existing bookings</h4>
                                        <p className="text-[13px] font-medium text-amber-800/80 dark:text-amber-300/80 leading-snug">
                                            Any scheduled appointments during this period will be marked for rescheduling and patients will be automatically notified.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <Button variant="outline" onClick={() => setShowLeaveModal(false)} className="h-11 rounded-xl px-6 font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
                                <Button onClick={handleAddLeave} isLoading={saving} className="h-11 rounded-xl px-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm font-bold border-0 transition-all active:scale-95 hover:-translate-y-0.5">Submit Leave</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
