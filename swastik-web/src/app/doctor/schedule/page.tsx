'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Clock, Plus, Loader2, RefreshCw, Trash2, AlertCircle, X,
    Info, ChevronDown, PauseCircle,
    PlayCircle, CalendarX, CalendarDays, Hourglass, Activity, ShieldAlert, CheckCircle2,
    Calendar as CalendarIcon, Building2, Video as VideoIcon, Stethoscope, MapPin, AlarmClock,
    Palmtree, Check, AlertTriangle, Layers, Edit3, Ban
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { useDoctorStore } from '@/stores/doctorStore';
import type { TimeSlot, DoctorOrganization, ScheduleConflict, DoctorLeave } from '@/stores/doctorStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import OrganizationPicker from '@/components/doctor/OrganizationPicker';

type ScheduleMode = 'video' | 'in_person';

export interface ScheduleWindow {
    id: string;
    slot_date: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    bufferTime?: number;
    isAvailable: boolean;
    consultationMode: ScheduleMode;
    organizationType?: 'clinic' | 'hospital' | null;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentName?: string | null;
    rawSlot: TimeSlot;
    isSeriesPart?: boolean;
    seriesDates?: string[];
    seriesSlotIds?: string[];
}

export interface DateScheduleGroup {
    key: string;               // e.g. "video|2026-09-11" or "in_person|clinic:id|2026-09-11"
    date: string;              // "2026-09-11"
    mode: ScheduleMode;        // "video" | "in_person"
    organizationType?: 'clinic' | 'hospital' | null;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentName?: string | null;
    windows: ScheduleWindow[]; // All schedule windows on this date
    isAvailable: boolean;      // true if at least one window is active
}

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

const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + (m || 0);
};

const formatTime12 = (timeStr?: string): string => {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h)) return timeStr;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const period = h < 12 ? 'AM' : 'PM';
    const minute = Number.isNaN(m) ? '00' : String(m).padStart(2, '0');
    return `${hour12}:${minute} ${period}`;
};

const dayName = (date: string): string => {
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString(undefined, { weekday: 'long' });
};

const getIstDateAndTime = () => {
    const d = new Date();
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
    const istTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return { istDate, istTime };
};

const todayStr = () => getIstDateAndTime().istDate;

const isSlotPast = (slotDate: string, timeSlot: string, istDate: string, istTime: string): boolean => {
    if (slotDate < istDate) return true;
    if (slotDate > istDate) return false;
    const slotTimeNorm = timeSlot.length > 5 ? timeSlot.slice(0, 5) : (timeSlot.length === 4 ? `0${timeSlot}` : timeSlot);
    return slotTimeNorm <= istTime;
};

const formatDayHeader = (dateStr: string) => {
    const today = todayStr();
    const [y, m, dNum] = today.split('-').map(Number);
    const tmrObj = new Date(y, m - 1, dNum);
    tmrObj.setDate(tmrObj.getDate() + 1);
    const tmrStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tmrObj);

    const isToday = dateStr === today;
    const isTomorrow = dateStr === tmrStr;

    const [slotY, slotM, slotD] = dateStr.split('-').map(Number);
    const d = new Date(slotY, slotM - 1, slotD);

    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const year = d.getFullYear();

    const title = `${weekday}, ${month} ${day}, ${year}`;
    const subtitle = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });

    return { title, subtitle, isToday, isTomorrow };
};

const getWindowDurationMinutes = (win: ScheduleWindow): number => {
    const s = parseTimeToMinutes(win.startTime);
    const e = parseTimeToMinutes(win.endTime);
    if (s === null || e === null || e <= s) return 0;
    return e - s;
};

const formatMinutesToHours = (mins: number): string => {
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

/**
 * Groups raw schedule records by (Consultation Mode + Organization + Calendar Date).
 * Multiple non-overlapping windows on the same calendar day belong to the same parent DateScheduleGroup.
 */
function buildDateGroups(schedule: TimeSlot[]): DateScheduleGroup[] {
    // 1. Identify recurring series across distinct dates
    const seriesConfigMap = new Map<string, { dates: string[]; slotIds: string[] }>();
    schedule.forEach((slot) => {
        const mode: ScheduleMode = slot.consultationMode === 'in_person' ? 'in_person' : 'video';
        const orgKey = mode === 'in_person' ? `${slot.organizationType ?? ''}:${slot.organizationId ?? ''}` : 'video';
        const configSignature = `${mode}|${orgKey}|${slot.startTime}|${slot.endTime}|${slot.slotDuration}|${slot.bufferTime || 0}`;

        if (!seriesConfigMap.has(configSignature)) {
            seriesConfigMap.set(configSignature, { dates: [], slotIds: [] });
        }
        const seriesInfo = seriesConfigMap.get(configSignature)!;
        if (!seriesInfo.dates.includes(slot.slot_date)) {
            seriesInfo.dates.push(slot.slot_date);
        }
        if (slot.id && !seriesInfo.slotIds.includes(slot.id)) {
            seriesInfo.slotIds.push(slot.id);
        }
    });

    // 2. Group by Date + Mode + Org
    const map = new Map<string, DateScheduleGroup>();

    schedule.forEach((slot) => {
        const mode: ScheduleMode = slot.consultationMode === 'in_person' ? 'in_person' : 'video';
        const orgKey = mode === 'in_person' ? `${slot.organizationType ?? ''}:${slot.organizationId ?? ''}` : 'video';
        const dateKey = `${mode}|${orgKey}|${slot.slot_date}`;

        const configSignature = `${mode}|${orgKey}|${slot.startTime}|${slot.endTime}|${slot.slotDuration}|${slot.bufferTime || 0}`;
        const seriesInfo = seriesConfigMap.get(configSignature);
        const isSeriesPart = Boolean(seriesInfo && seriesInfo.dates.length > 1);

        if (!map.has(dateKey)) {
            map.set(dateKey, {
                key: dateKey,
                date: slot.slot_date,
                mode,
                organizationType: slot.organizationType || null,
                organizationId: slot.organizationId || null,
                organizationName: slot.organizationName || null,
                departmentName: slot.departmentName || null,
                windows: [],
                isAvailable: true,
            });
        }

        const group = map.get(dateKey)!;
        group.windows.push({
            id: slot.id || '',
            slot_date: slot.slot_date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDuration: slot.slotDuration || 15,
            bufferTime: slot.bufferTime,
            isAvailable: slot.isAvailable !== false,
            consultationMode: mode,
            organizationType: slot.organizationType,
            organizationId: slot.organizationId,
            organizationName: slot.organizationName,
            departmentName: slot.departmentName,
            rawSlot: slot,
            isSeriesPart,
            seriesDates: seriesInfo?.dates,
            seriesSlotIds: seriesInfo?.slotIds,
        });
    });

    const groups = Array.from(map.values());
    groups.forEach((g) => {
        // Sort windows on the same day in chronological order (e.g. 09:00 before 15:00)
        g.windows.sort((a, b) => a.startTime.localeCompare(b.startTime));
        g.isAvailable = g.windows.some((w) => w.isAvailable);
    });

    // Sort calendar date groups chronologically (today -> future), then mode, then org
    groups.sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        if (a.mode !== b.mode) return a.mode === 'video' ? -1 : 1;
        const orgA = a.organizationName || '';
        const orgB = b.organizationName || '';
        return orgA.localeCompare(orgB);
    });

    return groups;
}

function generateDates(startDate: string, isRecurring: boolean, recurringWeeks: number): string[] {
    if (!isRecurring || recurringWeeks <= 0) return [startDate];
    const dates: string[] = [];
    const [year, month, day] = startDate.split('-').map(Number);
    for (let i = 0; i < recurringWeeks; i++) {
        const d = new Date(Date.UTC(year, month - 1, day + i * 7));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
}

export default function DoctorSchedulePage() {
    const {
        schedule, blockedSlots, bookedSlots, leaves, organizations, organizationsError,
        loadingSchedule, loadingOrganizations, loadingLeaves, error,
        fetchSchedule, fetchOrganizations, fetchLeaves,
        updateScheduleById, disableSchedule,
        createSchedule, addLeave, cancelLeave, deleteLeave, clearError, toggleSlotBlock,
        checkAffectedAppointments,
    } = useDoctorStore();

    // ── Live IST Time Tracking for Past Slot Protection ──
    const [currentTimeInfo, setCurrentTimeInfo] = useState<{ istDate: string; istTime: string }>(getIstDateAndTime);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimeInfo(getIstDateAndTime());
        }, 15000);
        return () => clearInterval(timer);
    }, []);

    const [activeTab, setActiveTab] = useState<'schedule' | 'leaves'>('schedule');
    const [leaveTab, setLeaveTab] = useState<'upcoming' | 'history'>('upcoming');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingWindow, setEditingWindow] = useState<ScheduleWindow | null>(null);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // ── Leave form & preview state ──
    const [leaveForm, setLeaveForm] = useState<{
        scope: 'global' | 'organization';
        organization_type: 'clinic' | 'hospital' | '';
        organization_id: string;
        leave_type: 'full_day' | 'partial_day';
        start_date: string;
        end_date: string;
        start_time: string;
        end_time: string;
        reason: string;
    }>({
        scope: 'global',
        organization_type: '',
        organization_id: '',
        leave_type: 'full_day',
        start_date: todayStr(),
        end_date: todayStr(),
        start_time: '09:00',
        end_time: '17:00',
        reason: '',
    });
    const [checkingAffected, setCheckingAffected] = useState(false);
    const [affectedPreview, setAffectedPreview] = useState<{ affected_count: number; appointments: any[] } | null>(null);
    const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<DoctorLeave | null>(null);
    const [leaveError, setLeaveError] = useState<string | null>(null);

    // ── Create/Edit schedule modal form state ──
    const [mode, setMode] = useState<ScheduleMode>('video');
    const [orgId, setOrgId] = useState('');
    const [deptId, setDeptId] = useState('');
    const [form, setForm] = useState({
        slot_date: todayStr(),
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 15,
        bufferTime: 0,
    });
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringWeeks, setRecurringWeeks] = useState(4);
    const [editScope, setEditScope] = useState<'single' | 'series'>('single');
    const [modalError, setModalError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<ScheduleConflict[] | null>(null);

    const [saving, setSaving] = useState(false);
    const [expandedWindows, setExpandedWindows] = useState<Set<string>>(new Set());
    const [optimisticBlocks, setOptimisticBlocks] = useState<Set<string>>(new Set());
    const [optimisticUnblocks, setOptimisticUnblocks] = useState<Set<string>>(new Set());

    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    // Real-time affected appointments check
    useEffect(() => {
        if (!showLeaveModal) {
            setAffectedPreview(null);
            setLeaveError(null);
            return;
        }

        if (!leaveForm.start_date || !leaveForm.end_date || leaveForm.end_date < leaveForm.start_date) {
            setAffectedPreview(null);
            return;
        }

        if (leaveForm.scope === 'organization' && !leaveForm.organization_id) {
            setAffectedPreview(null);
            return;
        }

        if (leaveForm.leave_type === 'partial_day' && (!leaveForm.start_time || !leaveForm.end_time || leaveForm.end_time <= leaveForm.start_time)) {
            setAffectedPreview(null);
            return;
        }

        let isMounted = true;
        const timer = setTimeout(async () => {
            setCheckingAffected(true);
            const result = await checkAffectedAppointments({
                start_date: leaveForm.start_date,
                end_date: leaveForm.end_date,
                scope: leaveForm.scope,
                organization_type: leaveForm.scope === 'organization' ? (leaveForm.organization_type as 'clinic' | 'hospital') : undefined,
                organization_id: leaveForm.scope === 'organization' ? leaveForm.organization_id : undefined,
                leave_type: leaveForm.leave_type,
                start_time: leaveForm.leave_type === 'partial_day' ? leaveForm.start_time : undefined,
                end_time: leaveForm.leave_type === 'partial_day' ? leaveForm.end_time : undefined,
            });
            if (isMounted) {
                setAffectedPreview(result);
                setCheckingAffected(false);
            }
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [showLeaveModal, leaveForm.start_date, leaveForm.end_date, leaveForm.scope, leaveForm.organization_id, leaveForm.organization_type, leaveForm.leave_type, leaveForm.start_time, leaveForm.end_time, checkAffectedAppointments]);

    useEffect(() => {
        fetchSchedule();
        fetchLeaves();
        fetchOrganizations();
    }, [fetchSchedule, fetchLeaves, fetchOrganizations]);

    const orgLookup = useMemo(() => {
        const map = new Map<string, DoctorOrganization>();
        organizations.forEach(o => map.set(`${o.type}:${o.id}`, o));
        return map;
    }, [organizations]);

    const selectedOrg: DoctorOrganization | null = orgId
        ? orgLookup.get(`${'clinic'}:${orgId}`) || orgLookup.get(`${'hospital'}:${orgId}`) || null
        : null;

    const selectedOrgDepts = selectedOrg?.departments || [];
    const selectedDept = deptId ? selectedOrgDepts.find(d => d.id === deptId) : null;

    const resetModalForm = () => {
        setMode('video');
        setOrgId('');
        setDeptId('');
        setForm({ slot_date: todayStr(), startTime: '09:00', endTime: '17:00', slotDuration: 15, bufferTime: 0 });
        setIsRecurring(false);
        setRecurringWeeks(4);
        setModalError(null);
        setConflicts(null);
        setEditScope('single');
        setEditingWindow(null);
    };

    const openCreateModal = () => {
        resetModalForm();
        setEditingWindow(null);
        setShowAddModal(true);
    };

    const openEditWindowModal = (win: ScheduleWindow, scope: 'single' | 'series' = 'single') => {
        setEditingWindow(win);
        setEditScope(scope);
        setMode(win.consultationMode);
        setOrgId(win.organizationId || '');
        setDeptId('');
        setForm({
            slot_date: win.slot_date,
            startTime: win.startTime,
            endTime: win.endTime,
            slotDuration: win.slotDuration || 15,
            bufferTime: win.bufferTime || 0,
        });
        setIsRecurring(false);
        setModalError(null);
        setConflicts(null);
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingWindow(null);
        setModalError(null);
        setConflicts(null);
        setEditScope('single');
    };

    const handleToggleWindowActive = async (win: ScheduleWindow) => {
        const nextActive = !win.isAvailable;
        setSaving(true);
        if (win.id) {
            await updateScheduleById(win.id, { is_active: nextActive });
        }
        setSaving(false);
    };

    const handleDeleteWindow = async (win: ScheduleWindow) => {
        const confirmed = await confirmAction({
            title: 'End Schedule Window',
            message: `End the ${formatTime12(win.startTime)} - ${formatTime12(win.endTime)} schedule on ${win.slot_date}? Existing appointments remain intact and no new bookings will be accepted for this window.`,
            confirmLabel: 'End Window',
            variant: 'warning',
        });
        if (!confirmed) return;
        setSaving(true);
        if (win.id) {
            await disableSchedule(win.id);
        }
        setSaving(false);
    };

    const handleCreateSchedule = async () => {
        setModalError(null);

        if (mode === 'in_person' && !orgId) {
            setModalError('Please select a clinic or hospital for the In-Person schedule.');
            return;
        }
        const startM = parseTimeToMinutes(form.startTime);
        const endM = parseTimeToMinutes(form.endTime);
        if (startM === null || endM === null || startM >= endM) {
            setModalError('End time must be after start time.');
            return;
        }

        setSaving(true);
        const payload: Record<string, unknown> = {
            consultation_mode: mode,
            slot_date: form.slot_date,
            startTime: form.startTime,
            endTime: form.endTime,
            slotDuration: form.slotDuration,
            bufferTime: form.bufferTime,
        };
        if (isRecurring && recurringWeeks > 0) payload.recurringWeeks = recurringWeeks;
        if (mode === 'in_person') {
            payload.organization_type = selectedOrg?.type;
            payload.organization_id = orgId;
            if (selectedDept) {
                payload.department_id = selectedDept.id;
                payload.department_name = selectedDept.name;
            }
        }

        const result = await createSchedule(payload);
        if (result.success) {
            closeModal();
        } else if (result.conflict) {
            setConflicts(result.conflict);
        } else {
            setModalError(result.message || 'Failed to create schedule. Please try again.');
        }
        setSaving(false);
    };

    const handleEditSchedule = async () => {
        if (!editingWindow) return;
        setModalError(null);

        const startM = parseTimeToMinutes(form.startTime);
        const endM = parseTimeToMinutes(form.endTime);
        if (startM === null || endM === null || startM >= endM) {
            setModalError('End time must be after start time.');
            return;
        }

        setSaving(true);
        if (editScope === 'single') {
            if (editingWindow.id) {
                const result = await updateScheduleById(editingWindow.id, {
                    slot_date: form.slot_date,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    slotDuration: form.slotDuration,
                    bufferTime: form.bufferTime,
                });
                if (!result.success) {
                    if (result.conflict) {
                        setConflicts(result.conflict);
                    } else {
                        setModalError(result.message || 'Failed to update schedule.');
                    }
                    setSaving(false);
                    return;
                }
            }
        } else {
            const seriesDates = editingWindow.seriesDates || [editingWindow.slot_date];
            const seriesSlotIds = editingWindow.seriesSlotIds || [editingWindow.id];
            const result = await updateScheduleById(editingWindow.id, {
                edit_series: true,
                series_dates: seriesDates,
                series_slot_ids: seriesSlotIds,
                startTime: form.startTime,
                endTime: form.endTime,
                slotDuration: form.slotDuration,
                bufferTime: form.bufferTime,
            });
            if (!result.success) {
                if (result.conflict) {
                    setConflicts(result.conflict);
                } else {
                    setModalError(result.message || 'Failed to update schedule series.');
                }
                setSaving(false);
                return;
            }
        }
        setSaving(false);
        closeModal();
    };

    const handleAddLeave = async () => {
        setLeaveError(null);
        if (!leaveForm.start_date || !leaveForm.end_date) {
            setLeaveError('Please specify start and end dates.');
            return;
        }
        if (leaveForm.end_date < leaveForm.start_date) {
            setLeaveError('End date cannot be earlier than start date.');
            return;
        }
        if (leaveForm.scope === 'organization' && (!leaveForm.organization_type || !leaveForm.organization_id)) {
            setLeaveError('Please select a specific organization for organization leave.');
            return;
        }
        if (leaveForm.leave_type === 'partial_day' && (!leaveForm.start_time || !leaveForm.end_time || leaveForm.end_time <= leaveForm.start_time)) {
            setLeaveError('End time must be later than start time for partial-day leave.');
            return;
        }

        setSaving(true);
        const res = await addLeave({
            start_date: leaveForm.start_date,
            end_date: leaveForm.end_date,
            reason: leaveForm.reason || undefined,
            scope: leaveForm.scope,
            organization_type: leaveForm.scope === 'organization' ? (leaveForm.organization_type as 'clinic' | 'hospital') : undefined,
            organization_id: leaveForm.scope === 'organization' ? leaveForm.organization_id : undefined,
            leave_type: leaveForm.leave_type,
            start_time: leaveForm.leave_type === 'partial_day' ? leaveForm.start_time : undefined,
            end_time: leaveForm.leave_type === 'partial_day' ? leaveForm.end_time : undefined,
        });

        if (res.success) {
            setShowLeaveModal(false);
            setLeaveForm({
                scope: 'global',
                organization_type: '',
                organization_id: '',
                leave_type: 'full_day',
                start_date: todayStr(),
                end_date: todayStr(),
                start_time: '09:00',
                end_time: '17:00',
                reason: '',
            });
            setAffectedPreview(null);
        } else {
            setLeaveError(res.error || 'Failed to submit leave.');
        }
        setSaving(false);
    };

    const handleCancelLeave = async (id: string) => {
        const confirmed = await confirmAction({
            title: 'Cancel Leave',
            message: 'Are you sure you want to cancel this leave? Your recurring schedule slots for this period will become active and bookable again.',
            confirmLabel: 'Cancel Leave',
            variant: 'warning'
        });
        if (confirmed) {
            setSaving(true);
            await cancelLeave(id);
            if (selectedLeaveDetails?.id === id) {
                setSelectedLeaveDetails(null);
            }
            setSaving(false);
        }
    };

    const handleDeleteLeave = async (id: string) => {
        return handleCancelLeave(id);
    };

    const handleToggleBlock = async (date: string, timeRange: string) => {
        const timeSlot = timeRange.split(' - ')[0];
        if (isSlotPast(date, timeSlot, currentTimeInfo.istDate, currentTimeInfo.istTime)) {
            return; // Guard: slot start time has already passed
        }

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

    const toggleExpandWindow = (windowId: string) => {
        const next = new Set(expandedWindows);
        if (next.has(windowId)) next.delete(windowId);
        else next.add(windowId);
        setExpandedWindows(next);
    };

    const now = new Date();
    const today = todayStr();
    const futureSchedule = schedule.filter(s => s.slot_date >= today);
    const dateGroups = useMemo(() => buildDateGroups(futureSchedule), [futureSchedule]);

    const activeSlots = futureSchedule.filter(s => s.isAvailable !== false).length;
    const inactiveSlots = futureSchedule.filter(s => s.isAvailable === false).length;
    const workingDays = Array.from(new Set(futureSchedule.map(s => s.slot_date))).length;

    const blockedSlotsCount = useMemo(() => {
        const blockedSet = new Set<string>();
        (blockedSlots || []).forEach(b => {
            blockedSet.add(`${b.date}_${b.time}`);
        });
        optimisticBlocks.forEach(k => blockedSet.add(k));
        optimisticUnblocks.forEach(k => blockedSet.delete(k));
        return blockedSet.size;
    }, [blockedSlots, optimisticBlocks, optimisticUnblocks]);

    let todayMinutes = 0;
    futureSchedule.filter(s => s.slot_date === today && s.isAvailable !== false).forEach(s => {
        const startM = parseTimeToMinutes(s.startTime);
        const endM = parseTimeToMinutes(s.endTime);
        if (startM !== null && endM !== null && endM > startM) todayMinutes += (endM - startM);
    });
    const todayHoursStr = todayMinutes > 0 ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m` : '0h';

    const activeLeavesList = useMemo(() => {
        return (leaves || []).filter(l => l.status !== 'cancelled');
    }, [leaves]);

    const upcomingLeaves = useMemo(() => {
        return (leaves || []).filter(l => l.end_date >= today && l.status !== 'cancelled');
    }, [leaves, today]);

    const historyLeaves = useMemo(() => {
        return (leaves || []).filter(l => l.end_date < today || l.status === 'cancelled');
    }, [leaves, today]);

    const upcomingLeavesCount = upcomingLeaves.length;

    const currentlyOnLeaveCount = useMemo(() => {
        return activeLeavesList.filter(l => l.start_date <= today && l.end_date >= today).length;
    }, [activeLeavesList, today]);

    const currentYear = now.getFullYear();
    const daysOnLeaveThisYear = useMemo(() => {
        return activeLeavesList.reduce((acc, l) => {
            const s = new Date(l.start_date);
            const e = new Date(l.end_date);
            if (s.getFullYear() === currentYear || e.getFullYear() === currentYear) {
                const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1);
                return acc + diffDays;
            }
            return acc;
        }, 0);
    }, [activeLeavesList, currentYear]);

    const orgDisplayName = (group: DateScheduleGroup): string => {
        if (group.organizationName) return group.organizationName;
        const org = group.organizationId
            ? orgLookup.get(`${group.organizationType || ''}:${group.organizationId}`)
            : null;
        return org?.name || 'Organization';
    };

    const formatConflictDate = (dateStr: string): string => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const conflictLine = (c: ScheduleConflict): string => {
        const formattedDate = formatConflictDate(c.date);
        const range = `${formatTime12(c.start_time)} – ${formatTime12(c.end_time)}`;
        const label = c.mode === 'in_person'
            ? (c.organization_name || 'your organization')
            : 'your existing Video availability';
        return `${formattedDate} — ${range} overlaps with ${label}.`;
    };

    const inputCls = 'w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900/80 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 [color-scheme:light] dark:[color-scheme:dark] transition-all outline-none';
    const selectCls = 'w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900/80 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] transition-all outline-none appearance-none';

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Linear-style Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-2 pl-3 rounded-2xl gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-[13px] font-medium text-blue-900 dark:text-blue-300">
                        <strong className="font-bold">In-Person Schedules</strong> must belong to a Clinic or Hospital you are actively affiliated with. Video schedules are platform-level and need no organization.
                    </p>
                </div>
                <Link href="/doctor/care-networks" className="text-[13px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 whitespace-nowrap px-4 py-2 bg-blue-100/50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl transition-colors sm:self-center">
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
                        Manage video availability and organization-specific in-person schedules.
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
                            onClick={openCreateModal}
                            disabled={saving}
                            className="h-11 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-bold border-0 px-6 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Schedule
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setShowLeaveModal(true)}
                            disabled={saving}
                            className="h-11 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white font-bold px-6 text-sm flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                            <CalendarX className="w-4 h-4" /> Add Leave
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Tabs Header & Summary Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 border-b border-gray-200 dark:border-gray-800 pb-px">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 -mb-px shrink-0 ${
                            activeTab === 'schedule'
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-900/50 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                        }`}
                    >
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Schedule Availability</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold ml-0.5">
                            {dateGroups.length} days
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('leaves')}
                        className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 -mb-px shrink-0 ${
                            activeTab === 'leaves'
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-900/50 shadow-sm'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                        }`}
                    >
                        <Palmtree className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Leave & Time Off</span>
                        {upcomingLeaves.length > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold ml-0.5">
                                {upcomingLeaves.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* 5 Summary Badges: ACTIVE, PAUSED, BLOCKED, DAYS, TODAY */}
                {activeTab === 'schedule' && (
                    <div className="flex items-center justify-start xl:justify-end gap-1.5 sm:gap-2 pb-2.5 xl:pb-0 overflow-x-auto custom-scrollbar no-scrollbar flex-nowrap shrink-0">
                        {/* ACTIVE */}
                        <div className="h-8 px-3 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">{activeSlots} Active</span>
                        </div>

                        {/* PAUSED */}
                        <div className="h-8 px-3 rounded-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-center gap-1.5 shadow-sm text-gray-600 dark:text-gray-400 shrink-0 whitespace-nowrap">
                            <PauseCircle className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs font-extrabold uppercase tracking-wider">{inactiveSlots} Paused</span>
                        </div>

                        {/* BLOCKED */}
                        <div className="h-8 px-3 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5 shadow-sm text-rose-700 dark:text-rose-300 shrink-0 whitespace-nowrap">
                            <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="text-xs font-extrabold uppercase tracking-wider">{blockedSlotsCount} Blocked</span>
                        </div>

                        {/* DAYS */}
                        <div className="h-8 px-3 rounded-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-center gap-1.5 shadow-sm text-gray-600 dark:text-gray-400 shrink-0 whitespace-nowrap">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs font-extrabold uppercase tracking-wider">{workingDays} Days</span>
                        </div>

                        {/* TODAY */}
                        <div className="h-8 px-3 rounded-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-center gap-1.5 shadow-sm text-gray-600 dark:text-gray-400 shrink-0 whitespace-nowrap">
                            <Hourglass className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs font-extrabold uppercase tracking-wider">{todayHoursStr} Today</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tab Contents */}
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
                        {loadingSchedule ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-transparent">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                <span className="font-bold text-gray-500">Syncing schedule...</span>
                            </div>
                        ) : dateGroups.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6">
                                    <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:white tracking-tight mb-2">No schedules yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-8">
                                    Create video availability or organization-specific in-person schedules to start accepting patient appointments.
                                </p>
                                <Button
                                    onClick={openCreateModal}
                                    className="h-12 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm font-bold px-8 text-base transition-all active:scale-95 hover:-translate-y-0.5"
                                >
                                    <Plus className="w-5 h-5 mr-2" /> Add Schedule
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* ── VIDEO section ── */}
                                {(() => {
                                    const videoDateGroups = dateGroups.filter(g => g.mode === 'video');
                                    const inPersonDateGroups = dateGroups.filter(g => g.mode === 'in_person');
                                    return (
                                        <>
                                            {videoDateGroups.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                                            <VideoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight uppercase">Video Schedules</h3>
                                                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                                                    </div>
                                                    {videoDateGroups.map(g => (
                                                        <DayScheduleCard
                                                            key={g.key}
                                                            group={g}
                                                            orgName="Video Consultation"
                                                            orgTypeLabel="Platform"
                                                            orgIcon={<VideoIcon className="w-5 h-5" />}
                                                            expandedWindows={expandedWindows}
                                                            onToggleExpandWindow={toggleExpandWindow}
                                                            onToggleWindowActive={handleToggleWindowActive}
                                                            onEditWindow={(win, scope) => openEditWindowModal(win, scope)}
                                                            onDeleteWindow={handleDeleteWindow}
                                                            onToggleBlock={handleToggleBlock}
                                                            isBlocked={(date, time) => blockedSlots.some(b => b.date === date && b.time === time)}
                                                            isBooked={(date, time) => bookedSlots.some(b => b.date === date && b.time === time)}
                                                            optimisticBlocks={optimisticBlocks}
                                                            optimisticUnblocks={optimisticUnblocks}
                                                            saving={saving}
                                                            currentTimeInfo={currentTimeInfo}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* ── IN-PERSON section ── */}
                                            {inPersonDateGroups.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                                                            <Stethoscope className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight uppercase">In-Person Schedules</h3>
                                                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                                                    </div>
                                                    {inPersonDateGroups.map(g => (
                                                        <DayScheduleCard
                                                            key={g.key}
                                                            group={g}
                                                            orgName={orgDisplayName(g)}
                                                            orgTypeLabel={g.organizationType === 'clinic' ? 'Clinic' : g.organizationType === 'hospital' ? 'Hospital' : 'Organization'}
                                                            orgIcon={<Building2 className="w-5 h-5" />}
                                                            expandedWindows={expandedWindows}
                                                            onToggleExpandWindow={toggleExpandWindow}
                                                            onToggleWindowActive={handleToggleWindowActive}
                                                            onEditWindow={(win, scope) => openEditWindowModal(win, scope)}
                                                            onDeleteWindow={handleDeleteWindow}
                                                            onToggleBlock={handleToggleBlock}
                                                            isBlocked={(date, time) => blockedSlots.some(b => b.date === date && b.time === time)}
                                                            isBooked={(date, time) => bookedSlots.some(b => b.date === date && b.time === time)}
                                                            optimisticBlocks={optimisticBlocks}
                                                            optimisticUnblocks={optimisticUnblocks}
                                                            saving={saving}
                                                            currentTimeInfo={currentTimeInfo}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
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
                        className="space-y-8 mt-6 max-w-5xl"
                    >
                        {/* ── Top Summary Cards ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Upcoming</span>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                        <Palmtree className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{upcomingLeavesCount}</span>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Scheduled time-off</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</span>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                        {currentlyOnLeaveCount > 0 ? 'On Leave' : 'Active'}
                                    </span>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                        {currentlyOnLeaveCount > 0 ? `${currentlyOnLeaveCount} active leave window` : 'Practicing normally'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Days This Year</span>
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                                        <CalendarDays className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{daysOnLeaveThisYear}</span>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Total leave days ({currentYear})</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Leaves</span>
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                                        <CalendarX className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{leaves.length}</span>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Leave requests recorded</p>
                                </div>
                            </div>
                        </div>

                        {/* Leaves Sub-Tabs */}
                        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
                            <button
                                onClick={() => setLeaveTab('upcoming')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    leaveTab === 'upcoming'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                            >
                                Upcoming & Active ({upcomingLeaves.length})
                            </button>
                            <button
                                onClick={() => setLeaveTab('history')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    leaveTab === 'history'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                            >
                                Past Leaves ({historyLeaves.length})
                            </button>
                        </div>

                        {/* Leaves List */}
                        {loadingLeaves ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                                <span className="font-bold text-gray-500">Loading leave requests...</span>
                            </div>
                        ) : (leaveTab === 'upcoming' ? upcomingLeaves : historyLeaves).length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-16 px-6 flex flex-col items-center justify-center text-center">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                                    <Palmtree className="w-10 h-10 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                                </div>
                                <h4 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
                                    {leaveTab === 'upcoming' ? 'No upcoming leaves scheduled' : 'No past leave records'}
                                </h4>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium max-w-sm mb-6">
                                    {leaveTab === 'upcoming'
                                        ? 'Block out entire days or partial time slots when you are taking vacation or personal time off.'
                                        : 'Your completed or cancelled leave records will appear here for reference.'}
                                </p>
                                {leaveTab === 'upcoming' && (
                                    <Button
                                        onClick={() => setShowLeaveModal(true)}
                                        className="h-11 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white font-bold px-6 text-sm"
                                    >
                                        <CalendarX className="w-4 h-4 mr-2" /> Add Leave
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(leaveTab === 'upcoming' ? upcomingLeaves : historyLeaves).map(leave => (
                                    <div
                                        key={leave.id}
                                        className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                                                        leave.scope === 'global'
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30'
                                                            : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30'
                                                    }`}>
                                                        {leave.scope === 'global' ? 'Global (All)' : 'Specific Org'}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                                                        leave.leave_type === 'full_day'
                                                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                        {leave.leave_type === 'full_day' ? 'Full Day' : 'Partial Day'}
                                                    </span>
                                                </div>

                                                {leave.status !== 'cancelled' && leave.end_date >= today && (
                                                    <button
                                                        onClick={() => handleCancelLeave(leave.id)}
                                                        disabled={saving}
                                                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-lg transition-colors"
                                                    >
                                                        Cancel Leave
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-3">
                                                <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                                                    {leave.start_date === leave.end_date
                                                        ? new Date(`${leave.start_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                                        : `${new Date(`${leave.start_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${leave.end_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                                </h4>
                                                {leave.leave_type === 'partial_day' && leave.start_time && leave.end_time && (
                                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {formatTime12(leave.start_time)} – {formatTime12(leave.end_time)}
                                                    </p>
                                                )}
                                                {leave.reason && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl">
                                                        &ldquo;{leave.reason}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Create / Edit Schedule Modal ── */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => !saving && closeModal()}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden z-10 flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                        {editingWindow ? (editScope === 'series' ? 'Edit Recurring Series' : 'Edit Schedule Window') : 'Add Schedule'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                        {editingWindow ? 'Update your consultation window timing' : 'Set your available hours for appointments'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => !saving && closeModal()}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* Recurring Series Edit Scope Selector */}
                                {editingWindow && editingWindow.isSeriesPart && editingWindow.seriesDates && editingWindow.seriesDates.length > 1 && (
                                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span className="text-xs font-extrabold text-blue-900 dark:text-blue-300 uppercase tracking-wider">Recurring Series Detected</span>
                                        </div>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                            This slot is part of a series ({editingWindow.seriesDates.length} occurrences). Choose which occurrences to update:
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditScope('single')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                                    editScope === 'single'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                }`}
                                            >
                                                Edit This Date Only
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditScope('series')}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                                    editScope === 'series'
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                }`}
                                            >
                                                Edit Entire Series
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Mode Selection (Create only) */}
                                {!editingWindow && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                                            Consultation Mode
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => { setMode('video'); setOrgId(''); setDeptId(''); }}
                                                className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all ${mode === 'video' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mode === 'video' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {mode === 'video' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-sm font-bold">Video</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setMode('in_person'); setDeptId(''); }}
                                                className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all ${mode === 'in_person' ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mode === 'in_person' ? 'border-purple-500 bg-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {mode === 'in_person' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-sm font-bold">In-Person</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Organization Selection (In-Person only) */}
                                {mode === 'in_person' && !editingWindow && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                                                Organization <span className="text-red-500">*</span>
                                            </label>
                                            {loadingOrganizations ? (
                                                <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading your affiliations...
                                                </div>
                                            ) : organizations.length === 0 ? (
                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/50 rounded-xl flex gap-3 items-start">
                                                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                                    <div className="flex flex-col gap-1">
                                                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">No active affiliations</h4>
                                                        <p className="text-[13px] font-medium text-amber-800/80 dark:text-amber-300/80 leading-snug">
                                                            You need an active Clinic or Hospital affiliation to create an in-person schedule.
                                                            <Link href="/doctor/care-networks" className="underline font-bold"> Find an organization →</Link>
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select
                                                    value={orgId}
                                                    onChange={e => { setOrgId(e.target.value); setDeptId(''); }}
                                                    className={selectCls}
                                                    disabled={saving}
                                                >
                                                    <option value="">Select Clinic / Hospital</option>
                                                    <optgroup label="Clinics">
                                                        {organizations.filter(o => o.type === 'clinic').map(o => (
                                                            <option key={o.id} value={o.id}>{o.name}</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Hospitals">
                                                        {organizations.filter(o => o.type === 'hospital').map(o => (
                                                            <option key={o.id} value={o.id}>{o.name}</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            )}
                                        </div>

                                        {selectedOrg && (
                                            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${selectedOrg.type === 'clinic' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                    {selectedOrg.type === 'clinic' ? 'Clinic' : 'Hospital'}
                                                </span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedOrg.name}</span>
                                                {selectedOrg.city && (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                                        <MapPin className="w-3 h-3" /> {selectedOrg.city}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Department (only when the organization uses departments) */}
                                        {selectedOrg && selectedOrgDepts.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                                                    Department
                                                </label>
                                                <select
                                                    value={deptId}
                                                    onChange={e => setDeptId(e.target.value)}
                                                    className={selectCls}
                                                    disabled={saving}
                                                >
                                                    <option value="">No department</option>
                                                    {selectedOrgDepts.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Date Field */}
                                {(!editingWindow || editScope === 'single') && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Consultation Date</label>
                                        <input
                                            type="date"
                                            value={form.slot_date}
                                            onChange={e => setForm(s => ({ ...s, slot_date: e.target.value }))}
                                            className={inputCls}
                                            min={today}
                                            disabled={saving || (editingWindow !== null && editScope === 'series')}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Start Time</label>
                                        <input
                                            type="time"
                                            value={form.startTime}
                                            onChange={e => setForm(s => ({ ...s, startTime: e.target.value }))}
                                            className={inputCls}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">End Time</label>
                                        <input
                                            type="time"
                                            value={form.endTime}
                                            onChange={e => setForm(s => ({ ...s, endTime: e.target.value }))}
                                            className={inputCls}
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Slot Duration</label>
                                        <select
                                            value={form.slotDuration}
                                            onChange={e => setForm(s => ({ ...s, slotDuration: parseInt(e.target.value) }))}
                                            className={selectCls}
                                            disabled={saving}
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
                                            value={form.bufferTime}
                                            onChange={e => setForm(s => ({ ...s, bufferTime: parseInt(e.target.value) }))}
                                            className={selectCls}
                                            disabled={saving}
                                        >
                                            <option value={0}>No buffer</option>
                                            <option value={5}>5 min</option>
                                            <option value={10}>10 min</option>
                                            <option value={15}>15 min</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Repeat Weekly (create only) */}
                                {!editingWindow && (
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
                                                        {[2, 3, 4, 5, 6, 8, 10, 12].map(w => (
                                                            <option key={w} value={w}>{w} weeks</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsRecurring(!isRecurring)}
                                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${isRecurring ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {modalError && (
                                    <div className="flex items-start gap-2.5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[13px] font-bold text-red-700 dark:text-red-400 leading-snug">{modalError}</p>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                                <Button variant="outline" onClick={() => !saving && closeModal()} disabled={saving} className="h-11 rounded-xl px-6 font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={editingWindow ? handleEditSchedule : handleCreateSchedule}
                                    isLoading={saving}
                                    className="h-11 rounded-xl px-6 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm font-bold border-0 transition-all active:scale-95 hover:-translate-y-0.5"
                                >
                                    {editingWindow ? 'Save Changes' : 'Create Schedule'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Conflict Modal ── */}
            <AnimatePresence>
                {conflicts && conflicts.length > 0 && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/50 dark:bg-black/70"
                            onClick={() => setConflicts(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 w-full max-w-md p-6 z-10"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Schedule conflict detected</h3>
                            </div>
                            <div className="space-y-2.5 mb-6">
                                {conflicts.map((c, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3.5 bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                                        <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm font-bold text-red-700 dark:text-red-300 leading-snug">{conflictLine(c)}</p>
                                    </div>
                                ))}
                                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 leading-snug pl-1">
                                    A conflicting schedule cannot be activated. Pick a non-overlapping time.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setConflicts(null)}
                                    className="h-11 rounded-xl px-6 font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Choose Another Time
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => { setConflicts(null); closeModal(); }}
                                    className="h-11 rounded-xl px-6 font-bold border-0"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Add Leave Modal ── */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => !saving && setShowLeaveModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-800 w-full max-w-lg overflow-hidden z-10 flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Schedule Leave</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Pause your appointment slots during planned time-off</p>
                                </div>
                                <button
                                    onClick={() => !saving && setShowLeaveModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* 1. Leave Scope */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                        Leave Scope
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLeaveForm(f => ({ ...f, scope: 'global', organization_id: '', organization_type: '' }))}
                                            className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                                                leaveForm.scope === 'global'
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/60 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`p-1.5 rounded-lg ${
                                                    leaveForm.scope === 'global'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                                        : 'bg-gray-100 dark:bg-gray-700/60'
                                                }`}>
                                                    <Palmtree className={`w-4 h-4 ${
                                                        leaveForm.scope === 'global'
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-gray-400 dark:text-gray-500'
                                                    }`} />
                                                </div>
                                                {leaveForm.scope === 'global' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`text-sm font-extrabold block ${
                                                    leaveForm.scope === 'global'
                                                        ? 'text-emerald-700 dark:text-emerald-300'
                                                        : 'text-gray-800 dark:text-gray-200'
                                                }`}>Global Leave</span>
                                                <span className={`text-[11px] font-medium leading-snug block mt-0.5 ${
                                                    leaveForm.scope === 'global'
                                                        ? 'text-emerald-600/80 dark:text-emerald-400/70'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    All Video & In-Person sessions
                                                </span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setLeaveForm(f => ({ ...f, scope: 'organization' }))}
                                            className={`p-4 rounded-2xl border-2 text-left flex flex-col gap-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                                                leaveForm.scope === 'organization'
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/60 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`p-1.5 rounded-lg ${
                                                    leaveForm.scope === 'organization'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                                        : 'bg-gray-100 dark:bg-gray-700/60'
                                                }`}>
                                                    <Building2 className={`w-4 h-4 ${
                                                        leaveForm.scope === 'organization'
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-gray-400 dark:text-gray-500'
                                                    }`} />
                                                </div>
                                                {leaveForm.scope === 'organization' && (
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className={`text-sm font-extrabold block ${
                                                    leaveForm.scope === 'organization'
                                                        ? 'text-emerald-700 dark:text-emerald-300'
                                                        : 'text-gray-800 dark:text-gray-200'
                                                }`}>Specific Org</span>
                                                <span className={`text-[11px] font-medium leading-snug block mt-0.5 ${
                                                    leaveForm.scope === 'organization'
                                                        ? 'text-emerald-600/80 dark:text-emerald-400/70'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    Selected Clinic / Hospital
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Organization Picker */}
                                {leaveForm.scope === 'organization' && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                            Affiliated Organization <span className="text-red-500">*</span>
                                        </label>
                                        <OrganizationPicker
                                            organizations={organizations}
                                            value={leaveForm.organization_id}
                                            valueType={leaveForm.organization_type}
                                            onChange={(id: string, type: '' | 'clinic' | 'hospital') =>
                                                setLeaveForm(f => ({
                                                    ...f,
                                                    organization_id: id,
                                                    organization_type: type,
                                                }))
                                            }
                                            loading={loadingOrganizations}
                                            hasError={organizationsError}
                                            onRetry={fetchOrganizations}
                                        />
                                    </div>
                                )}

                                {/* Duration Type */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                                        Duration Type
                                    </label>
                                    <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setLeaveForm(f => ({ ...f, leave_type: 'full_day' }))}
                                            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all focus:outline-none ${
                                                leaveForm.leave_type === 'full_day'
                                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            Full Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLeaveForm(f => ({ ...f, leave_type: 'partial_day' }))}
                                            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all focus:outline-none ${
                                                leaveForm.leave_type === 'partial_day'
                                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            Partial Day
                                        </button>
                                    </div>
                                </div>

                                {/* Date Pickers */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={leaveForm.start_date}
                                            onChange={e => setLeaveForm(s => ({ ...s, start_date: e.target.value, end_date: s.end_date < e.target.value ? e.target.value : s.end_date }))}
                                            className={inputCls}
                                            min={today}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={leaveForm.end_date}
                                            onChange={e => setLeaveForm(s => ({ ...s, end_date: e.target.value }))}
                                            className={inputCls}
                                            min={leaveForm.start_date || today}
                                        />
                                    </div>
                                </div>

                                {/* Time Pickers (Partial Day Only) */}
                                {leaveForm.leave_type === 'partial_day' && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Partial Day — Time Range</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">From</label>
                                                <input
                                                    type="time"
                                                    value={leaveForm.start_time}
                                                    onChange={e => setLeaveForm(s => ({ ...s, start_time: e.target.value }))}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">To</label>
                                                <input
                                                    type="time"
                                                    value={leaveForm.end_time}
                                                    onChange={e => setLeaveForm(s => ({ ...s, end_time: e.target.value }))}
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Reason */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Reason for Leave</label>
                                    <textarea
                                        placeholder="e.g. Conference, Medical Emergency, Vacation, Personal Time-off"
                                        value={leaveForm.reason}
                                        onChange={e => setLeaveForm(s => ({ ...s, reason: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900/80 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-sm text-gray-900 dark:text-white font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all outline-none resize-none"
                                    />
                                </div>

                                {checkingAffected && (
                                    <div className="flex items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500 shrink-0" />
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Scanning appointments for overlapping bookings...</span>
                                    </div>
                                )}

                                {affectedPreview && affectedPreview.affected_count > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-2xl overflow-hidden">
                                        <div className="flex gap-3 items-start px-4 py-3.5 border-b border-amber-200 dark:border-amber-700/50">
                                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                                                    {affectedPreview.affected_count} Appointment{affectedPreview.affected_count > 1 ? 's' : ''} Affected
                                                </h4>
                                                <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                                                    These remain on record. Patients will be notified automatically.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="max-h-36 overflow-y-auto custom-scrollbar">
                                            {affectedPreview.appointments.map(a => (
                                                <div
                                                    key={a.id}
                                                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs border-b border-amber-100 dark:border-amber-800/40 last:border-b-0 bg-white/50 dark:bg-black/10"
                                                >
                                                    <div className="min-w-0 flex items-center gap-1">
                                                        <span className="font-bold text-gray-900 dark:text-white truncate">{a.patient_name}</span>
                                                        <span className="text-gray-400 dark:text-gray-600 mx-0.5">&middot;</span>
                                                        <span className="text-gray-600 dark:text-gray-400 capitalize shrink-0">{a.consultation_type}</span>
                                                    </div>
                                                    <span className="font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
                                                        {a.date} · {formatTime12(a.time?.slice(0, 5) || '')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {leaveError && (
                                    <div className="flex items-start gap-2.5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[13px] font-bold text-red-700 dark:text-red-400 leading-snug">{leaveError}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-900 shrink-0">
                                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hidden sm:block">
                                    {affectedPreview && affectedPreview.affected_count > 0
                                        ? `⚠ ${affectedPreview.affected_count} appointment${affectedPreview.affected_count > 1 ? 's' : ''} will be affected`
                                        : 'No appointments affected'}
                                </p>
                                <div className="flex gap-3 ml-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowLeaveModal(false)}
                                        className="h-11 rounded-xl px-5 font-bold border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAddLeave}
                                        isLoading={saving}
                                        className="h-11 rounded-xl px-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 font-bold active:scale-95 transition-all border-0 disabled:opacity-50"
                                    >
                                        Confirm Leave
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}

// ────────────────────────────────────────────────────────────────
// Day Schedule Card (Container for all same-day windows)
// ────────────────────────────────────────────────────────────────
interface DayScheduleCardProps {
    group: DateScheduleGroup;
    orgName: string;
    orgTypeLabel: string;
    orgIcon: React.ReactNode;
    expandedWindows: Set<string>;
    onToggleExpandWindow: (windowId: string) => void;
    onToggleWindowActive: (win: ScheduleWindow) => void;
    onEditWindow: (win: ScheduleWindow, scope: 'single' | 'series') => void;
    onDeleteWindow: (win: ScheduleWindow) => void;
    onToggleBlock: (date: string, timeRange: string) => void;
    isBlocked: (date: string, time: string) => boolean;
    isBooked: (date: string, time: string) => boolean;
    optimisticBlocks: Set<string>;
    optimisticUnblocks: Set<string>;
    saving: boolean;
    currentTimeInfo: { istDate: string; istTime: string };
}

function DayScheduleCard({
    group, orgName, orgTypeLabel, orgIcon,
    expandedWindows, onToggleExpandWindow, onToggleWindowActive, onEditWindow, onDeleteWindow,
    onToggleBlock, isBlocked, isBooked, optimisticBlocks, optimisticUnblocks, saving,
    currentTimeInfo,
}: DayScheduleCardProps) {
    const isVideo = group.mode === 'video';
    const dayHeader = formatDayHeader(group.date);

    // Compute total active minutes on this day across windows
    const totalDayMinutes = group.windows
        .filter(w => w.isAvailable)
        .reduce((sum, w) => sum + getWindowDurationMinutes(w), 0);

    return (
        <DoctorPortalCard
            variant="compact"
            className="!p-0 relative transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
            {/* Day Header Section */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-r from-gray-50/90 via-gray-50/50 to-transparent dark:from-gray-800/40 dark:via-gray-800/20 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                        isVideo
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 ring-1 ring-purple-500/20'
                    }`}>
                        {orgIcon}
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">
                                {dayHeader.title}
                            </h4>
                            {dayHeader.isToday && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-500/30">
                                    Today
                                </span>
                            )}
                            {dayHeader.isTomorrow && (
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm shadow-blue-500/30">
                                    Tomorrow
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs font-bold ${isVideo ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
                                {orgName}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600 font-bold">&middot;</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {group.windows.length} Schedule Window{group.windows.length > 1 ? 's' : ''}
                            </span>
                            {totalDayMinutes > 0 && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600 font-bold">&middot;</span>
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {formatMinutesToHours(totalDayMinutes)} Available
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border ${
                        group.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                            : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}>
                        {group.isAvailable ? 'Active Day' : 'Paused Day'}
                    </span>
                </div>
            </div>

            {/* List of Non-Overlapping Schedule Windows on this Day */}
            <div className="p-4 sm:p-6 space-y-4">
                {group.windows.map((win, winIdx) => {
                    const windowKey = win.id || `${group.key}_${win.startTime}_${winIdx}`;
                    const isExpanded = expandedWindows.has(windowKey);
                    const subSlots = generateSubSlots(win.startTime, win.endTime, win.slotDuration || 15);
                    const durationMins = getWindowDurationMinutes(win);

                    return (
                        <div
                            key={windowKey}
                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                win.isAvailable
                                    ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800/80'
                                    : 'bg-gray-50/60 dark:bg-gray-850 border-gray-200/60 dark:border-gray-800 opacity-85'
                            }`}
                        >
                            {/* Window Header Row */}
                            <div
                                onClick={() => onToggleExpandWindow(windowKey)}
                                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none group/win"
                            >
                                <div className="flex items-start sm:items-center gap-3.5">
                                    <div className="flex flex-col">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h5 className={`text-lg sm:text-xl font-extrabold tracking-tight ${
                                                win.isAvailable
                                                    ? 'text-gray-900 dark:text-white'
                                                    : 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300'
                                            }`}>
                                                {formatTime12(win.startTime)} <span className="text-gray-300 dark:text-gray-600 font-normal mx-1">→</span> {formatTime12(win.endTime)}
                                            </h5>

                                            {win.isAvailable ? (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200/60 dark:border-emerald-800/40">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                                                    Paused
                                                </span>
                                            )}

                                            {win.isSeriesPart && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-widest border border-blue-200/60 dark:border-blue-800/40 flex items-center gap-1">
                                                    <Layers className="w-3 h-3" /> Series ({win.seriesDates?.length || 0} dates)
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <Hourglass className="w-3 h-3 text-gray-400" /> {win.slotDuration}m slots
                                            </span>
                                            {typeof win.bufferTime === 'number' && win.bufferTime > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                                                    <AlarmClock className="w-3 h-3 text-gray-400" /> {win.bufferTime}m buffer
                                                </span>
                                            )}
                                            {win.departmentName && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                                                    <Stethoscope className="w-3 h-3" /> {win.departmentName}
                                                </span>
                                            )}
                                            <span className="text-xs font-semibold text-gray-400">
                                                ({subSlots.length} bookable intervals &middot; {formatMinutesToHours(durationMins)})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Window Action Buttons */}
                                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-center" onClick={e => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleWindowActive(win);
                                        }}
                                        disabled={saving}
                                        className={`h-9 w-9 min-w-[36px] min-h-[36px] p-0 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                                            win.isAvailable
                                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/30'
                                                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30'
                                        } disabled:opacity-50`}
                                        title={win.isAvailable ? 'Pause Window' : 'Resume Window'}
                                    >
                                        {win.isAvailable ? (
                                            <PauseCircle className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                                        ) : (
                                            <PlayCircle className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditWindow(win, 'single');
                                        }}
                                        disabled={saving}
                                        className="h-9 min-h-[36px] px-3.5 shrink-0 rounded-xl bg-gray-50 hover:bg-emerald-50 dark:bg-gray-800/60 dark:hover:bg-emerald-900/20 text-gray-700 hover:text-emerald-700 dark:text-gray-300 dark:hover:text-emerald-400 border border-gray-200/80 dark:border-gray-700/80 hover:border-emerald-300 dark:hover:border-emerald-700/60 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                                        title="Edit this schedule window"
                                    >
                                        <Edit3 className="w-4 h-4 shrink-0" />
                                        <span>Edit</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteWindow(win);
                                        }}
                                        disabled={saving}
                                        className="h-9 w-9 min-w-[36px] min-h-[36px] p-0 shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                        title="End this schedule window"
                                    >
                                        <Trash2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                                    </button>

                                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleExpandWindow(windowKey);
                                        }}
                                        className="h-9 w-9 min-w-[36px] min-h-[36px] shrink-0 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        title={isExpanded ? 'Collapse Intervals' : 'View Intervals'}
                                    >
                                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-emerald-600' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Bookable Intervals for this Window */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 p-4 sm:p-5 overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                Bookable Intervals ({subSlots.length} slots)
                                            </span>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                                Click slot to block/unblock
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {subSlots.map(timeRange => {
                                                const timeSlot = timeRange.split(' - ')[0];
                                                const slotKey = `${win.slot_date}_${timeSlot}`;

                                                const booked = isBooked(win.slot_date, timeSlot);
                                                let blocked = isBlocked(win.slot_date, timeSlot);
                                                if (optimisticBlocks.has(slotKey)) blocked = true;
                                                if (optimisticUnblocks.has(slotKey)) blocked = false;

                                                const isPast = isSlotPast(win.slot_date, timeSlot, currentTimeInfo.istDate, currentTimeInfo.istTime);
                                                const isInteractive = !booked && !isPast && win.isAvailable;

                                                let statusLabel = 'Available';
                                                let statusClass = '';
                                                let titleText = 'Available (Click to Block)';

                                                if (!win.isAvailable) {
                                                    statusLabel = 'Paused';
                                                    statusClass = 'bg-gray-100/60 text-gray-400 border-gray-200/80 cursor-not-allowed dark:bg-gray-800/40 dark:border-gray-700/50 dark:text-gray-500 opacity-70';
                                                    titleText = 'Schedule window is paused';
                                                } else if (booked) {
                                                    statusLabel = 'Booked';
                                                    statusClass = isPast
                                                        ? 'bg-blue-50/70 text-blue-800/70 border-blue-200/70 cursor-not-allowed dark:bg-blue-950/30 dark:border-blue-800/40 dark:text-blue-300/70 opacity-60'
                                                        : 'bg-blue-50 text-blue-800 border-blue-200 cursor-not-allowed dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-300';
                                                    titleText = isPast ? 'Booked by a patient (Past)' : 'Booked by a patient';
                                                } else if (blocked) {
                                                    statusLabel = 'Blocked';
                                                    statusClass = isPast
                                                        ? 'bg-amber-50/70 text-amber-800/70 border-amber-200/60 cursor-not-allowed dark:bg-amber-950/30 dark:text-amber-300/70 dark:border-amber-800/40 opacity-60'
                                                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 dark:hover:bg-amber-900/50 cursor-pointer';
                                                    titleText = isPast ? 'Blocked by doctor (Past - Cannot modify)' : 'Blocked by doctor (Click to Unblock)';
                                                } else if (isPast) {
                                                    statusLabel = 'Past';
                                                    statusClass = 'bg-gray-100/70 text-gray-400 border-gray-200/70 dark:bg-gray-800/50 dark:border-gray-700/40 dark:text-gray-500 cursor-not-allowed opacity-60';
                                                    titleText = 'Time slot has passed (Cannot block/unblock)';
                                                } else {
                                                    statusLabel = 'Available';
                                                    statusClass = 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:bg-gray-900 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-gray-800 dark:hover:border-emerald-600 cursor-pointer';
                                                    titleText = 'Available (Click to Block)';
                                                }

                                                return (
                                                    <button
                                                        key={timeRange}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isInteractive) {
                                                                onToggleBlock(win.slot_date, timeRange);
                                                            }
                                                        }}
                                                        disabled={!isInteractive}
                                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 relative overflow-hidden group/slot shadow-sm ${statusClass}`}
                                                        title={titleText}
                                                    >
                                                        <span className={`text-sm font-extrabold ${blocked && !booked ? 'line-through decoration-amber-600 dark:decoration-amber-400' : ''}`}>
                                                            {timeSlot}
                                                        </span>
                                                        <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                                                            !win.isAvailable ? 'text-gray-400 dark:text-gray-500'
                                                            : booked ? (isPast ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-blue-600 dark:text-blue-400')
                                                            : blocked ? (isPast ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-amber-600 dark:text-amber-400')
                                                            : isPast ? 'text-gray-400 dark:text-gray-500'
                                                            : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}>
                                                            {statusLabel}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </DoctorPortalCard>
    );
}
