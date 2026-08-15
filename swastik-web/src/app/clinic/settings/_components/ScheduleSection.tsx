'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Calendar, Clock, RefreshCw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { SettingsSection, SectionLoader, StatusMessage, type SectionStatus } from './SettingsSection';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DaySlot {
    day: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
}

const createDefaultSchedule = (): DaySlot[] =>
    DAYS.map((day) => ({
        day,
        openTime: '09:00',
        closeTime: '18:00',
        isOpen: !['Saturday', 'Sunday'].includes(day),
    }));

const normalizeDayName = (value?: string | null) => {
    if (!value) return null;
    const match = DAYS.find((day) => day.toLowerCase() === value.toLowerCase());
    return match || null;
};

const normalizeSlot = (slot: Record<string, unknown>, fallbackDay?: string): DaySlot | null => {
    const day = normalizeDayName(
        (slot.day as string | undefined) ||
        (slot.day_of_week as string | undefined) ||
        (slot.name as string | undefined) ||
        fallbackDay
    );
    if (!day) return null;

    const isClosed = slot.closed === true;
    const isOpenValue = slot.isOpen ?? slot.is_open;
    const isOpen = typeof isOpenValue === 'boolean' ? isOpenValue : !isClosed;

    return {
        day,
        openTime: (slot.openTime as string | undefined) || (slot.open_time as string | undefined) || (slot.startTime as string | undefined) || (slot.start_time as string | undefined) || '09:00',
        closeTime: (slot.closeTime as string | undefined) || (slot.close_time as string | undefined) || (slot.endTime as string | undefined) || (slot.end_time as string | undefined) || '18:00',
        isOpen,
    };
};

const normalizeSchedule = (raw: unknown): DaySlot[] => {
    const defaults = createDefaultSchedule();

    const fromArray = Array.isArray(raw)
        ? raw
            .map((slot) => (slot && typeof slot === 'object' ? normalizeSlot(slot as Record<string, unknown>) : null))
            .filter(Boolean) as DaySlot[]
        : [];

    const fromObject = !Array.isArray(raw) && raw && typeof raw === 'object'
        ? DAYS.map((day) => {
            const entry = (raw as Record<string, unknown>)[day] || (raw as Record<string, unknown>)[day.toLowerCase()];
            if (!entry || typeof entry !== 'object') return null;
            return normalizeSlot(entry as Record<string, unknown>, day);
        }).filter(Boolean) as DaySlot[]
        : [];

    const normalized = [...fromArray, ...fromObject];
    if (normalized.length === 0) return defaults;

    const byDay = new Map(normalized.map((slot) => [slot.day, slot]));
    return DAYS.map((day) => byDay.get(day) || defaults.find((slot) => slot.day === day) || {
        day,
        openTime: '09:00',
        closeTime: '18:00',
        isOpen: false,
    });
};

export function ScheduleSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const [schedule, setSchedule] = useState<DaySlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<SectionStatus | null>(null);
    const savedScheduleRef = useRef<DaySlot[]>([]);

    const fetchSchedule = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setStatus(null);
        try {
            const res = await clinicApi.getSchedule();
            if (res.success) {
                const data = res.data as Record<string, unknown> | undefined;
                const sched = data?.schedule || data?.opening_hours || data?.operatingHours || data || [];
                const normalized = normalizeSchedule(sched);
                savedScheduleRef.current = normalized;
                setSchedule(normalized);
            } else {
                setLoadError(res.error || 'Failed to load schedule');
            }
        } catch {
            setLoadError('Failed to connect to server.');
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        void fetchSchedule();
    }, [fetchSchedule]);

    const dirty = schedule.some(
        (slot, index) => JSON.stringify(slot) !== JSON.stringify(savedScheduleRef.current[index])
    );
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);

    const handleToggleDay = (day: string) => {
        setSchedule((prev) => prev.map((s) => (s.day === day ? { ...s, isOpen: !s.isOpen } : s)));
    };

    const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
        setSchedule((prev) => prev.map((s) => (s.day === day ? { ...s, [field]: value } : s)));
    };

    const handleSave = async () => {
        for (const slot of schedule) {
            if (slot.isOpen) {
                if (!slot.openTime || !slot.closeTime) {
                    setStatus({ type: 'error', message: `${slot.day}: set both open and close times.` });
                    return;
                }
                if (slot.closeTime <= slot.openTime) {
                    setStatus({ type: 'error', message: `${slot.day}: close time must be after open time.` });
                    return;
                }
            }
        }
        setIsSaving(true);
        setStatus(null);
        try {
            const res = await clinicApi.updateSchedule({ schedule });
            if (res.success) {
                const data = res.data as Record<string, unknown> | undefined;
                const nextSchedule = data?.schedule || data?.opening_hours || schedule;
                const normalized = normalizeSchedule(nextSchedule);
                savedScheduleRef.current = normalized;
                setSchedule(normalized);
                setStatus({ type: 'success', message: 'Working hours saved. Patients and booking flows use this schedule.' });
            } else {
                setStatus({ type: 'error', message: res.error || 'Failed to save schedule' });
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
        }
        setIsSaving(false);
    };

    const handleCancel = () => {
        void fetchSchedule();
    };

    return (
        <SettingsSection
            id="working-hours"
            title="Working Hours"
            description="Weekly operating hours shown on your profile and used by booking flows."
            icon={<Clock className="h-5 w-5" />}
            actions={
                dirty && !isLoading && (
                    <>
                        <Button variant="outline" size="sm" onClick={handleCancel} leftIcon={<X className="h-4 w-4" />}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => void handleSave()} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                            Save Schedule
                        </Button>
                    </>
                )
            }
        >
            {isLoading ? (
                <SectionLoader />
            ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-10">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchSchedule()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <StatusMessage status={status} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {schedule.map((slot) => (
                            <div key={slot.day} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        <Calendar className="h-4 w-4 text-primary-600" />
                                        {slot.day}
                                    </h4>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={slot.isOpen}
                                        aria-label={`Open on ${slot.day}`}
                                        onClick={() => handleToggleDay(slot.day)}
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                                            slot.isOpen ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                slot.isOpen ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>
                                {slot.isOpen ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={slot.openTime}
                                            onChange={(e) => handleTimeChange(slot.day, 'openTime', e.target.value)}
                                            aria-label={`${slot.day} opening time`}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                        <span className="text-gray-400">–</span>
                                        <input
                                            type="time"
                                            value={slot.closeTime}
                                            onChange={(e) => handleTimeChange(slot.day, 'closeTime', e.target.value)}
                                            aria-label={`${slot.day} closing time`}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">Closed</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </SettingsSection>
    );
}
