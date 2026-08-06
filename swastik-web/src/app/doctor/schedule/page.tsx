'use client';

import { useEffect, useState } from 'react';
import { Clock, Plus, Loader2, RefreshCw, Trash2, AlertCircle, X, Info, CalendarPlus, ChevronDown, ChevronUp, PauseCircle, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDoctorStore } from '@/stores/doctorStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';


function generateSubSlots(start: string, end: string, intervalMinutes: number = 30) {
    const slots = [];
    let [h, m] = start.split(':').map(Number);
    let current = h * 60 + (m || 0);
    let [eh, em] = end.split(':').map(Number);
    let endMinutes = eh * 60 + (em || 0);

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

export default function DoctorSchedulePage() {
    const { schedule, blockedSlots, bookedSlots, loadingSchedule, error, fetchSchedule, updateSchedule, clearError, toggleSlotBlock } = useDoctorStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSlot, setNewSlot] = useState({ slot_date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00' });
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
        
        // Determine current effective state considering optimistic updates
        let isBlocked = blockedSlots.some(b => b.date === date && b.time === timeSlot);
        if (optimisticBlocks.has(slotKey)) isBlocked = true;
        if (optimisticUnblocks.has(slotKey)) isBlocked = false;

        const action = isBlocked ? 'unblock' : 'block';
        
        // Apply optimistic update
        if (action === 'block') {
            setOptimisticBlocks(prev => new Set(prev).add(slotKey));
            setOptimisticUnblocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
        } else {
            setOptimisticUnblocks(prev => new Set(prev).add(slotKey));
            setOptimisticBlocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
        }

        const success = await toggleSlotBlock(date, timeSlot, action);
        
        // Revert optimistic update if failed
        if (!success) {
            if (action === 'block') {
                setOptimisticBlocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
            } else {
                setOptimisticUnblocks(prev => { const next = new Set(prev); next.delete(slotKey); return next; });
            }
        }
    };
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    const handleAddSlot = async () => {
        setSaving(true);
        const updatedSlots = [...schedule, { ...newSlot, isAvailable: true }];
        const success = await updateSchedule(updatedSlots as unknown as Record<string, unknown>[]);
        if (success) {
            setShowAddModal(false);
            setNewSlot({ slot_date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00' });
        }
        setSaving(false);
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

    if (loadingSchedule && schedule.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading schedule...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); fetchSchedule(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const futureSchedule = schedule.filter(s => s.slot_date >= today);
    const uniqueDates = Array.from(new Set(futureSchedule.map(s => s.slot_date))).sort();
    const scheduleByDate = uniqueDates.map(date => ({
        date,
        slots: schedule.map((s, i) => ({ ...s, _idx: i })).filter(s => s.slot_date === date),
    }));
    const activeSlots = futureSchedule.filter((slot) => slot.isAvailable).length;
    const inactiveSlots = Math.max(futureSchedule.length - activeSlots, 0);

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            In-Person Consultation Requirements
                        </h3>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                            To accept In-Person consultations, you must be affiliated with a registered Clinic or Hospital. Please ask your Clinic or Hospital Administrator to send you an invitation to join their network on Swastik.
                        </p>
                        <div className="mt-3 flex gap-3">
                            <Link href="/doctor/invites" className="text-sm font-semibold text-blue-800 dark:text-blue-300 hover:underline">
                                View your Invitations →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage your availability slots</p></div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSchedule} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={saving || loadingSchedule}>Refresh</Button>
                    <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus className="h-4 w-4" />} disabled={saving}>Add Slot</Button>
                </div>
            </div>

            <Card padding="sm">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {activeSlots} active slots
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                        {inactiveSlots} paused
                    </span>
                    <span>{saving ? 'Saving your changes...' : 'Tap a slot to pause or resume it for bookings.'}</span>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scheduleByDate.map(({ date, slots }) => (
                    <Card key={date} padding="md">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                        </h3>
                        {slots.length === 0 ? (
                            <p className="text-sm text-gray-400">No slots configured</p>
                        ) : (
                            <div className="space-y-2">
                                {slots.map((slot) => {
                                    const isExpanded = expandedSlots.has(slot._idx);
                                    const subSlots = generateSubSlots(slot.startTime, slot.endTime);
                                    return (
                                    <div key={slot._idx} className={`flex flex-col gap-2 text-sm rounded-xl overflow-hidden border transition-all ${slot.isAvailable ? 'border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}>
                                        <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => toggleExpand(slot._idx)}>
                                            <div className="flex items-center gap-2 flex-1 text-left">
                                                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                                <Clock className={`h-4 w-4 ${slot.isAvailable ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${slot.isAvailable ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{slot.startTime} – {slot.endTime}</span>
                                                {!slot.isAvailable && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-medium">Paused</span>}
                                            </div>
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleToggleSlot(slot._idx)} className={`p-1.5 rounded-lg transition-colors ${slot.isAvailable ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title={slot.isAvailable ? 'Pause Slot' : 'Resume Slot'}>
                                                    {slot.isAvailable ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                                                </button>
                                                <button onClick={() => handleRemoveSlot(slot._idx)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors" title="Delete Block">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-1 border-t border-black/5 dark:border-white/5">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">Generated Appointments (30m)</div>
                                                <div className="flex flex-wrap gap-2">
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
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                                                                    ${isBooked 
                                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-not-allowed dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400'
                                                                        : isBlocked 
                                                                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 line-through dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20' 
                                                                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-gray-900 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
                                                                    }`}
                                                                title={isBooked ? "Booked by a patient" : isBlocked ? "Click to Unblock" : "Click to Block"}
                                                            >
                                                                {timeRange}
                                                                {isBooked && <span className="ml-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-100 uppercase tracking-wider">Booked</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Did you know?</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">You can block specific time slots by expanding a time block and clicking on the generated 30-minute intervals. Click again to unblock.</p>
                </div>
            </div>

            {/* Add Slot Modal */}
            {showAddModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/10 w-full max-w-md overflow-hidden transform transition-all">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                                    <CalendarPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Time Slot</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                                <input 
                                    type="date"
                                    value={newSlot.slot_date} 
                                    onChange={e => setNewSlot(s => ({ ...s, slot_date: e.target.value }))} 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:focus:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-100 transition-all shadow-sm outline-none"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-emerald-500" />
                                            Start Time
                                        </div>
                                    </label>
                                    <input 
                                        type="time" 
                                        value={newSlot.startTime} 
                                        onChange={e => setNewSlot(s => ({ ...s, startTime: e.target.value }))} 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:focus:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-100 transition-all shadow-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-emerald-500" />
                                            End Time
                                        </div>
                                    </label>
                                    <input 
                                        type="time" 
                                        value={newSlot.endTime} 
                                        onChange={e => setNewSlot(s => ({ ...s, endTime: e.target.value }))} 
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:focus:border-emerald-500/50 rounded-xl text-sm text-gray-900 dark:text-gray-100 transition-all shadow-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-black/20">
                            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5">Cancel</Button>
                            <Button onClick={handleAddSlot} isLoading={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0">Add Slot</Button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
