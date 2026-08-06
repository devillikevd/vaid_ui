'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, Check, Clock, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_HOURS = ['06:00-08:00', '09:00-12:00', '14:00-17:00', '18:00-21:00'];

interface CoachProfile {
    id: string;
    name: string;
    is_available?: boolean;
    is_accepting_clients?: boolean;
    available_days?: string[];
    available_hours?: string[];
}

export default function WellnessSchedulePage() {
    const toast = useToast();
    const [profile, setProfile] = useState<CoachProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newStart, setNewStart] = useState('09:00');
    const [newEnd, setNewEnd] = useState('12:00');

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getCoachProfile();
            if (!res.success) throw new Error(res.error || 'Failed to load profile');
            const p = res.data as CoachProfile;
            setProfile(p);
            setSelectedDays(Array.isArray(p.available_days) ? p.available_days : []);
            setTimeSlots(Array.isArray(p.available_hours) ? p.available_hours : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load schedule');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const saveSchedule = async (days: string[], hours: string[]) => {
        setSaving(true);
        try {
            const res = await wellnessApi.updateCoachAvailability({
                available_days: days,
                available_hours: hours,
                is_available: days.length > 0 && hours.length > 0,
            });
            if (!res.success) throw new Error(res.error || 'Failed to save schedule');
            toast.success('Schedule saved', 'Your availability has been updated for patients.');
        } catch (err) {
            toast.error('Save failed', err instanceof Error ? err.message : 'Unable to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (day: string) => {
        const next = selectedDays.includes(day) ? selectedDays.filter(d => d !== day) : [...selectedDays, day];
        setSelectedDays(next);
        saveSchedule(next, timeSlots);
    };

    const removeSlot = (slot: string) => {
        const next = timeSlots.filter(s => s !== slot);
        setTimeSlots(next);
        saveSchedule(selectedDays, next);
    };

    const addSlot = () => {
        if (!newStart || !newEnd || newStart >= newEnd) {
            toast.error('Invalid time', 'Start time must be before end time.');
            return;
        }
        const slot = `${newStart}-${newEnd}`;
        if (timeSlots.includes(slot)) {
            toast.error('Duplicate', 'This time slot already exists.');
            return;
        }
        const next = [...timeSlots, slot].sort();
        setTimeSlots(next);
        setShowAddSlot(false);
        saveSchedule(selectedDays, next);
    };

    const toggleAccepting = async (accepting: boolean) => {
        setSaving(true);
        try {
            const res = await wellnessApi.updateCoachAvailability({ is_accepting_clients: accepting });
            if (!res.success) throw new Error(res.error || 'Failed to update');
            setProfile(p => p ? { ...p, is_accepting_clients: accepting } : p);
            toast.success(accepting ? 'Now accepting clients' : 'Paused new bookings', 'Clients can see your updated status.');
        } catch (err) {
            toast.error('Update failed', err instanceof Error ? err.message : 'Unable to update availability');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading schedule...</span></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Set your weekly availability so patients can book sessions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={loadProfile} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={saving}>Refresh</Button>
                    {profile && (
                        <Button
                            variant={profile.is_accepting_clients ? 'primary' : 'outline'}
                            onClick={() => toggleAccepting(!profile.is_accepting_clients)}
                            isLoading={saving}
                        >
                            {profile.is_accepting_clients ? '✓ Accepting Clients' : 'Paused — Resume'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Status banner */}
            <Card>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="rounded-full bg-lime-50 px-3 py-1 text-lime-700 dark:bg-lime-950 dark:text-lime-300">
                        {selectedDays.length} days active
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {timeSlots.length} time slots
                    </span>
                    <span>{saving ? 'Saving your changes...' : 'Tap a day to enable or disable it for bookings.'}</span>
                </div>
            </Card>

            {/* Weekly day picker */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-lime-600" /> Available Days</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {DAYS_OF_WEEK.map(day => {
                            const active = selectedDays.includes(day);
                            return (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    disabled={saving}
                                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                                        active
                                            ? 'border-lime-500 bg-lime-50 text-lime-800 shadow-sm dark:bg-lime-950 dark:text-lime-300 dark:border-lime-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                                    }`}
                                >
                                    {active && (
                                        <div className="absolute -right-1 -top-1 rounded-full bg-lime-500 p-0.5">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    <span className="text-xs uppercase tracking-wider">{day.slice(0, 3)}</span>
                                    <span className="text-lg font-bold">{day.slice(0, 1)}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Time slots */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-lime-600" /> Time Slots</CardTitle>
                    <Button size="sm" onClick={() => setShowAddSlot(true)} leftIcon={<Plus className="h-4 w-4" />} disabled={saving}>Add Slot</Button>
                </CardHeader>
                <CardContent>
                    {timeSlots.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 p-8 dark:border-gray-700">
                            <Clock className="h-10 w-10 text-gray-300" />
                            <p className="text-gray-500 dark:text-gray-400">No time slots configured. Add your available hours.</p>
                            <div className="flex gap-2">
                                {DEFAULT_HOURS.map(slot => (
                                    <Button key={slot} size="sm" variant="outline" onClick={() => {
                                        const next = [...timeSlots, slot].sort();
                                        setTimeSlots(next);
                                        saveSchedule(selectedDays, next);
                                    }}>
                                        {slot}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {timeSlots.sort().map(slot => {
                                const [start, end] = slot.split('-');
                                return (
                                    <div key={slot} className="flex items-center justify-between gap-2 rounded-xl border border-lime-200 bg-lime-50 p-3 dark:border-lime-900 dark:bg-lime-950">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-lime-600" />
                                            <span className="font-medium text-lime-800 dark:text-lime-300">{start} – {end}</span>
                                        </div>
                                        <button
                                            onClick={() => removeSlot(slot)}
                                            disabled={saving}
                                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add slot modal */}
            {showAddSlot && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add Time Slot</h3>
                            <button onClick={() => setShowAddSlot(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                    <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                    <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-800">
                            <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
                            <Button onClick={addSlot} isLoading={saving}>Add Slot</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
