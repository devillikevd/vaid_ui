'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Clock, Plus, Loader2, RefreshCw, Trash2, AlertCircle, X,
    Info, CalendarPlus, ChevronDown, PauseCircle,
    PlayCircle, CalendarX, CalendarDays, Hourglass, Activity, ShieldAlert, FileText, CheckCircle2,
    Calendar as CalendarIcon, Building2, Video as VideoIcon, Stethoscope, MapPin, AlarmClock,
    Globe, Eye, Ban, Palmtree, Check, AlertTriangle
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

interface GroupedRow extends TimeSlot {
    _idx: number;
}

interface ScheduleGroup {
    key: string;
    mode: ScheduleMode;
    organizationType?: 'clinic' | 'hospital' | null;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentName?: string | null;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    bufferTime?: number;
    rows: GroupedRow[];
    dates: string[];
    isAvailable: boolean;
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

const todayStr = () => new Date().toISOString().split('T')[0];

function groupKeyOf(slot: TimeSlot): string {
    const mode: ScheduleMode = slot.consultationMode === 'in_person' ? 'in_person' : 'video';
    const orgKey = mode === 'in_person' ? `${slot.organizationType ?? ''}:${slot.organizationId ?? ''}` : 'video';
    return `${mode}|${orgKey}|${slot.startTime}-${slot.endTime}`;
}

function buildGroups(schedule: TimeSlot[]): ScheduleGroup[] {
    const map = new Map<string, ScheduleGroup>();
    schedule.forEach((slot, idx) => {
        const mode: ScheduleMode = slot.consultationMode === 'in_person' ? 'in_person' : 'video';
        const orgKey = mode === 'in_person' ? `${slot.organizationType ?? ''}:${slot.organizationId ?? ''}` : 'video';
        const timeKey = `${slot.startTime}-${slot.endTime}`;
        const key = `${mode}|${orgKey}|${timeKey}`;

        if (!map.has(key)) {
            map.set(key, {
                key,
                mode,
                organizationType: slot.organizationType || null,
                organizationId: slot.organizationId || null,
                organizationName: slot.organizationName || null,
                departmentName: slot.departmentName || null,
                startTime: slot.startTime,
                endTime: slot.endTime,
                slotDuration: slot.slotDuration,
                bufferTime: slot.bufferTime,
                rows: [],
                dates: [],
                isAvailable: true,
            });
        }
        const group = map.get(key)!;
        group.rows.push({ ...slot, _idx: idx });
        if (!group.dates.includes(slot.slot_date)) group.dates.push(slot.slot_date);
    });

    const groups = Array.from(map.values());
    groups.forEach(g => {
        g.dates.sort();
        g.isAvailable = g.rows.some(r => r.isAvailable);
    });
    groups.sort((a, b) => {
        if (a.mode !== b.mode) return a.mode === 'video' ? -1 : 1;
        const orgA = a.organizationName || '';
        const orgB = b.organizationName || '';
        if (orgA !== orgB) return orgA.localeCompare(orgB);
        return a.startTime.localeCompare(b.startTime);
    });
    return groups;
}

function generateDates(startDate: string, isRecurring: boolean, recurringWeeks: number): string[] {
    if (!isRecurring || recurringWeeks <= 0) return [startDate];
    const dates: string[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    for (let i = 0; i < recurringWeeks; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function findClientConflicts(dates: string[], startTime: string, endTime: string, schedule: TimeSlot[], excludeKeys?: Set<string>): ScheduleConflict[] {
    const startM = parseTimeToMinutes(startTime);
    const endM = parseTimeToMinutes(endTime);
    if (startM === null || endM === null || startM >= endM) return [];

    const conflicts: ScheduleConflict[] = [];
    schedule.forEach(slot => {
        if (!slot.isAvailable) return;
        if (!dates.includes(slot.slot_date)) return;
        if (excludeKeys && excludeKeys.has(groupKeyOf(slot))) return;

        const s = parseTimeToMinutes(slot.startTime);
        const e = parseTimeToMinutes(slot.endTime);
        if (s === null || e === null) return;
        if (e > startM && s < endM) {
            conflicts.push({
                id: slot.id,
                date: slot.slot_date,
                start_time: slot.startTime,
                end_time: slot.endTime,
                mode: slot.consultationMode === 'in_person' ? 'in_person' : 'video',
                organization_type: slot.organizationType || null,
                organization_id: slot.organizationId || null,
                organization_name: slot.organizationName || null,
            });
        }
    });
    return conflicts;
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

    const [activeTab, setActiveTab] = useState<'schedule' | 'leaves'>('schedule');
    const [leaveTab, setLeaveTab] = useState<'upcoming' | 'history'>('upcoming');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<ScheduleGroup | null>(null);
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
    const [modalError, setModalError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<ScheduleConflict[] | null>(null);

    const [saving, setSaving] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    };

    const openCreateModal = () => {
        resetModalForm();
        setEditingGroup(null);
        setShowAddModal(true);
    };

    const openEditModal = (group: ScheduleGroup) => {
        setEditingGroup(group);
        setMode(group.mode);
        setOrgId(group.organizationId || '');
        setDeptId('');
        setForm({
            slot_date: group.dates[0] || todayStr(),
            startTime: group.startTime,
            endTime: group.endTime,
            slotDuration: group.slotDuration || 15,
            bufferTime: group.bufferTime || 0,
        });
        setIsRecurring(false);
        setModalError(null);
        setConflicts(null);
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingGroup(null);
        setModalError(null);
        setConflicts(null);
    };

    const handleToggleGroup = async (group: ScheduleGroup) => {
        const nextActive = !group.isAvailable;
        setSaving(true);
        for (const row of group.rows) {
            if (row.id) await updateScheduleById(row.id, { is_active: nextActive });
        }
        setSaving(false);
    };

    const handleEndGroup = async (group: ScheduleGroup) => {
        const confirmed = await confirmAction({
            title: 'End Schedule',
            message: group.rows.some(r => r.id)
                ? 'End this schedule? Existing appointments will remain intact and no new bookings will be accepted for it.'
                : 'Remove this schedule?',
            confirmLabel: 'End Schedule',
            variant: 'warning',
        });
        if (!confirmed) return;
        setSaving(true);
        for (const row of group.rows) {
            if (row.id) await disableSchedule(row.id);
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

        const dates = generateDates(form.slot_date, isRecurring, recurringWeeks);
        const localConflicts = findClientConflicts(dates, form.startTime, form.endTime, schedule);
        if (localConflicts.length > 0) {
            setConflicts(localConflicts);
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
        if (!editingGroup) return;
        setModalError(null);

        const startM = parseTimeToMinutes(form.startTime);
        const endM = parseTimeToMinutes(form.endTime);
        if (startM === null || endM === null || startM >= endM) {
            setModalError('End time must be after start time.');
            return;
        }

        const excludeKeys = new Set<string>([editingGroup.key]);
        const localConflicts = findClientConflicts(editingGroup.dates, form.startTime, form.endTime, schedule, excludeKeys);
        if (localConflicts.length > 0) {
            setConflicts(localConflicts);
            return;
        }

        setSaving(true);
        for (const row of editingGroup.rows) {
            if (!row.id) continue;
            await updateScheduleById(row.id, {
                startTime: form.startTime,
                endTime: form.endTime,
                slotDuration: form.slotDuration,
                bufferTime: form.bufferTime,
            });
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

    const toggleExpand = (key: string) => {
        const next = new Set(expandedGroups);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpandedGroups(next);
    };

    const now = new Date();
    const today = todayStr();
    const futureSchedule = schedule.filter(s => s.slot_date >= today);
    const groups = useMemo(() => buildGroups(futureSchedule), [futureSchedule]);

    const activeSlots = groups.filter(g => g.isAvailable).length;
    const inactiveSlots = groups.filter(g => !g.isAvailable).length;
    const workingDays = Array.from(new Set(futureSchedule.map(s => s.slot_date))).length;

    let todayMinutes = 0;
    futureSchedule.filter(s => s.slot_date === today && s.isAvailable).forEach(s => {
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

    const orgDisplayName = (group: ScheduleGroup): string => {
        if (group.organizationName) return group.organizationName;
        const org = group.organizationId
            ? orgLookup.get(`${group.organizationType || ''}:${group.organizationId}`)
            : null;
        return org?.name || 'Organization';
    };

    const conflictLine = (c: ScheduleConflict): string => {
        const range = `${formatTime12(c.start_time)} – ${formatTime12(c.end_time)}`;
        const label = c.mode === 'in_person'
            ? (c.organization_name || 'your organization')
            : 'your Video availability';
        return `${dayName(c.date)} ${range} overlaps with ${label}.`;
    };

    const inputCls = 'w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900/80 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 [color-scheme:light] dark:[color-scheme:dark] transition-all outline-none';
    const selectCls = 'w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-900/80 focus:ring-4 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] transition-all outline-none appearance-none';

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Premium Linear-style Info Banner */}
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
                        {loadingSchedule ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-transparent">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                <span className="font-bold text-gray-500">Syncing schedule...</span>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-24 px-6 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6">
                                    <CalendarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" strokeWidth={1} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">No schedules yet</h3>
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
                                    const videoGroups = groups.filter(g => g.mode === 'video');
                                    const inPersonGroups = groups.filter(g => g.mode === 'in_person');
                                    return (
                                        <>
                                            {videoGroups.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                                            <VideoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight uppercase">Video</h3>
                                                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                                                    </div>
                                                    {videoGroups.map(g => (
                                                        <ScheduleCard
                                                            key={g.key}
                                                            group={g}
                                                            orgName="Video"
                                                            orgTypeLabel="Platform"
                                                            orgIcon={<VideoIcon className="w-5 h-5" />}
                                                            orgIconCls="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                                            expanded={expandedGroups.has(g.key)}
                                                            onToggleExpand={() => toggleExpand(g.key)}
                                                            onToggleActive={() => handleToggleGroup(g)}
                                                            onEdit={() => openEditModal(g)}
                                                            onEnd={() => handleEndGroup(g)}
                                                            onToggleBlock={handleToggleBlock}
                                                            isBlocked={(date, time) => blockedSlots.some(b => b.date === date && b.time === time)}
                                                            isBooked={(date, time) => bookedSlots.some(b => b.date === date && b.time === time)}
                                                            optimisticBlocks={optimisticBlocks}
                                                            optimisticUnblocks={optimisticUnblocks}
                                                            saving={saving}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* ── IN-PERSON section ── */}
                                            {inPersonGroups.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                                                            <Stethoscope className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight uppercase">In-Person</h3>
                                                        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                                                    </div>
                                                    {inPersonGroups.map(g => (
                                                        <ScheduleCard
                                                            key={g.key}
                                                            group={g}
                                                            orgName={orgDisplayName(g)}
                                                            orgTypeLabel={g.organizationType === 'clinic' ? 'Clinic' : g.organizationType === 'hospital' ? 'Hospital' : 'Organization'}
                                                            orgIcon={<Building2 className="w-5 h-5" />}
                                                            orgIconCls="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                                            expanded={expandedGroups.has(g.key)}
                                                            onToggleExpand={() => toggleExpand(g.key)}
                                                            onToggleActive={() => handleToggleGroup(g)}
                                                            onEdit={() => openEditModal(g)}
                                                            onEnd={() => handleEndGroup(g)}
                                                            onToggleBlock={handleToggleBlock}
                                                            isBlocked={(date, time) => blockedSlots.some(b => b.date === date && b.time === time)}
                                                            isBooked={(date, time) => bookedSlots.some(b => b.date === date && b.time === time)}
                                                            optimisticBlocks={optimisticBlocks}
                                                            optimisticUnblocks={optimisticUnblocks}
                                                            saving={saving}
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
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Total records logged</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Leave Action Header ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Time-Off & Leave Windows</h3>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                    Manage global and organization-specific leave. Overlapping slot bookings will be blocked automatically.
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setLeaveError(null);
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
                                    setShowLeaveModal(true);
                                }}
                                className="h-11 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 font-bold px-6 shadow-sm shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Request Leave
                            </Button>
                        </div>

                        {loadingLeaves ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-transparent">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                                <span className="font-bold text-gray-500">Loading leaves...</span>
                            </div>
                        ) : leaves.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800 py-20 px-6 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-5">
                                    <CalendarX className="w-14 h-14 text-gray-400 dark:text-gray-500" strokeWidth={1} />
                                </div>
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">No Leaves Scheduled</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mb-6 text-sm">
                                    You have no time-off scheduled. You can request global or organization-specific leaves anytime.
                                </p>
                                <Button
                                    onClick={() => {
                                        setLeaveError(null);
                                        setShowLeaveModal(true);
                                    }}
                                    className="h-11 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-800 text-white shadow-sm font-bold px-6 text-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Request Leave
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
                                    <button
                                        onClick={() => setLeaveTab('upcoming')}
                                        className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${leaveTab === 'upcoming' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        Upcoming Leaves
                                    </button>
                                    <button
                                        onClick={() => setLeaveTab('history')}
                                        className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${leaveTab === 'history' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        Leave History
                                    </button>
                                </div>
                                
                                {(leaveTab === 'upcoming' ? upcomingLeaves : historyLeaves).length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium">
                                        No {leaveTab} leaves found.
                                    </div>
                                ) : (leaveTab === 'upcoming' ? upcomingLeaves : historyLeaves).map((leave) => {
                                    const startDate = new Date(leave.start_date);
                                    const endDate = new Date(leave.end_date);
                                    const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1);
                                    const isCancelled = leave.status === 'cancelled';
                                    const isGlobal = !leave.scope || leave.scope === 'global';

                                    return (
                                        <div
                                            key={leave.id}
                                            className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all p-5 sm:p-6 shadow-sm hover:shadow-md ${isCancelled ? 'border-gray-200/60 dark:border-gray-800/60 opacity-60' : 'border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Scope Badge */}
                                                        {isGlobal ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30">
                                                                <Globe className="w-3.5 h-3.5" /> Global Leave
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30">
                                                                <Building2 className="w-3.5 h-3.5" /> {leave.organization_name || (leave.organization_type === 'hospital' ? 'Hospital Leave' : 'Clinic Leave')}
                                                            </span>
                                                        )}

                                                        {/* Status Badge */}
                                                        {isCancelled ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                                <Ban className="w-3 h-3" /> Cancelled
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                            </span>
                                                        )}

                                                        {/* Duration Badge */}
                                                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                            {leave.leave_type === 'partial_day' ? 'Partial Day' : `${durationDays} Day${durationDays > 1 ? 's' : ''}`}
                                                        </span>
                                                    </div>

                                                    {/* Dates and Times */}
                                                    <div className="pt-1">
                                                        <h4 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                                            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            {leave.start_date !== leave.end_date && (
                                                                <> <span className="text-gray-400 font-normal">→</span> {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                                            )}
                                                        </h4>

                                                        {leave.leave_type === 'partial_day' && leave.start_time && leave.end_time && (
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 mt-1">
                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{formatTime12(leave.start_time.slice(0, 5))} – {formatTime12(leave.end_time.slice(0, 5))}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Scope details & reason */}
                                                    <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                        <p className="flex items-center gap-1.5 text-xs text-gray-400">
                                                            {isGlobal ? (
                                                                <span>Blocks: Video, all affiliated Clinics & Hospitals</span>
                                                            ) : (
                                                                <span>Blocks: {leave.organization_name || 'Selected organization'} only (other orgs & video unaffected)</span>
                                                            )}
                                                        </p>
                                                        {leave.reason && (
                                                            <p className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                                                <FileText className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                                                                <span>{leave.reason}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 self-start pt-1 sm:pt-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedLeaveDetails(leave)}
                                                        className="h-9 px-3.5 rounded-xl text-xs font-bold border-gray-200 dark:border-gray-700"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Details
                                                    </Button>

                                                    {!isCancelled && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelLeave(leave.id)}
                                                            className="h-9 px-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title="Cancel Leave"
                                                        >
                                                            <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Create / Edit Schedule Modal ── */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => !saving && closeModal()}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.98 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-800 w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
                        >
                            {/* Header (fixed) */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                        <CalendarPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                        {editingGroup ? 'Edit Schedule' : 'Create Schedule'}
                                    </h3>
                                </div>
                                <button onClick={() => !saving && closeModal()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-8">
                                {editingGroup && editingGroup.mode === 'in_person' && (
                                    <div className="flex items-center gap-3 p-4 bg-purple-50/70 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">Organization (locked)</span>
                                            <span className="text-sm font-extrabold text-gray-900 dark:text-white">{orgDisplayName(editingGroup)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Consultation Mode */}
                                {!editingGroup && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Consultation Mode</label>
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
                                {mode === 'in_person' && !editingGroup && (
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

                                {/* Schedule Fields */}
                                {!editingGroup && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Consultation Date</label>
                                        <input
                                            type="date"
                                            value={form.slot_date}
                                            onChange={e => setForm(s => ({ ...s, slot_date: e.target.value }))}
                                            className={inputCls}
                                            min={today}
                                            disabled={saving}
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
                                {!editingGroup && (
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
                                    onClick={editingGroup ? handleEditSchedule : handleCreateSchedule}
                                    isLoading={saving}
                                    className="h-11 rounded-xl px-6 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-sm font-bold border-0 transition-all active:scale-95 hover:-translate-y-0.5"
                                >
                                    {editingGroup ? 'Save Changes' : 'Create Schedule'}
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

            {/* ── Leave Details Modal ── */}
            <AnimatePresence>
                {selectedLeaveDetails && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => setSelectedLeaveDetails(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.98 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                        <Eye className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Leave Details</h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Record #{selectedLeaveDetails.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLeaveDetails(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Scope</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            {selectedLeaveDetails.scope === 'organization' ? (
                                                <><Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Organization</>
                                            ) : (
                                                <><Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Global</>
                                            )}
                                        </span>
                                    </div>

                                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Status</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            {selectedLeaveDetails.status === 'cancelled' ? (
                                                <span className="text-gray-500 flex items-center gap-1"><Ban className="w-4 h-4" /> Cancelled</span>
                                            ) : (
                                                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Active</span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {selectedLeaveDetails.scope === 'organization' && (
                                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Target Organization</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedLeaveDetails.organization_name || (selectedLeaveDetails.organization_type === 'hospital' ? 'Hospital' : 'Clinic')}
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Video consultation and other clinics remain active.</p>
                                    </div>
                                )}

                                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Dates & Duration</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white block">
                                        {selectedLeaveDetails.start_date} {selectedLeaveDetails.start_date !== selectedLeaveDetails.end_date && `→ ${selectedLeaveDetails.end_date}`}
                                    </span>
                                    {selectedLeaveDetails.leave_type === 'partial_day' && selectedLeaveDetails.start_time && selectedLeaveDetails.end_time ? (
                                        <span className="text-xs font-semibold text-gray-500 mt-1 block">
                                            Partial Day: {formatTime12(selectedLeaveDetails.start_time.slice(0, 5))} – {formatTime12(selectedLeaveDetails.end_time.slice(0, 5))}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-gray-500 mt-1 block">Full Day Leave</span>
                                    )}
                                </div>

                                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Doctor's Note / Reason</span>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {selectedLeaveDetails.reason || 'No specific reason provided.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                                <Button variant="outline" onClick={() => setSelectedLeaveDetails(null)} className="h-11 rounded-xl px-6 font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    Close
                                </Button>
                                {selectedLeaveDetails.status !== 'cancelled' && (
                                    <Button
                                        variant="danger"
                                        onClick={() => handleCancelLeave(selectedLeaveDetails.id)}
                                        isLoading={saving}
                                        className="h-11 rounded-xl px-6 font-bold"
                                    >
                                        Cancel This Leave
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Premium Request Leave Modal ── */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-sm bg-gray-900/40 dark:bg-black/60"
                            onClick={() => setShowLeaveModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.98 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-gray-700/80 w-full sm:max-w-xl max-h-[92dvh] flex flex-col overflow-hidden"
                        >
                            {/* ── Modal Header ── */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                        <CalendarX className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Request Leave / Time-Off</h3>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Temporarily block availability without affecting active contracts</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowLeaveModal(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    aria-label="Close modal"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* ── Modal Body (Scrollable) ── */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">

                                {/* Error Alert */}
                                {leaveError && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                                        <span className="text-sm font-bold text-red-700 dark:text-red-300">{leaveError}</span>
                                    </div>
                                )}

                                {/* ── 1. Scope Selector ── */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                                        Leave Scope
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">

                                        {/* Global Leave */}
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
                                                    <Globe className={`w-4 h-4 ${
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
                                                    Video + all Clinics & Hospitals
                                                </span>
                                            </div>
                                        </button>

                                        {/* Specific Organization */}
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

                                {/* ── Organization Picker ── */}
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

                                {/* ── 2. Duration Type ── */}
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

                                {/* ── 3. Date Pickers ── */}
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

                                {/* ── 4. Time Pickers (Partial Day Only) ── */}
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

                                {/* ── 5. Reason ── */}
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

                                {/* ── 6. Real-Time Affected Appointments Preview ── */}
                                {checkingAffected && (
                                    <div className="flex items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500 shrink-0" />
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Scanning appointments for overlapping bookings...</span>
                                    </div>
                                )}

                                {affectedPreview && affectedPreview.affected_count > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-2xl overflow-hidden">
                                        {/* Warning header */}
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
                                        {/* Appointment rows */}
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

                                {/* Bottom spacer so footer never clips last field */}
                                <div className="h-1" aria-hidden="true" />

                            </div>{/* end scrollable body */}

                            {/* ── Sticky Footer ── */}
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
// Schedule Card
// ────────────────────────────────────────────────────────────────
interface ScheduleCardProps {
    group: ScheduleGroup;
    orgName: string;
    orgTypeLabel: string;
    orgIcon: React.ReactNode;
    orgIconCls: string;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleActive: () => void;
    onEdit: () => void;
    onEnd: () => void;
    onToggleBlock: (date: string, timeRange: string) => void;
    isBlocked: (date: string, time: string) => boolean;
    isBooked: (date: string, time: string) => boolean;
    optimisticBlocks: Set<string>;
    optimisticUnblocks: Set<string>;
    saving: boolean;
}

function ScheduleCard({
    group, orgName, orgTypeLabel, orgIcon, orgIconCls,
    expanded, onToggleExpand, onToggleActive, onEdit, onEnd,
    onToggleBlock, isBlocked, isBooked, optimisticBlocks, optimisticUnblocks, saving,
}: ScheduleCardProps) {
    const isVideo = group.mode === 'video';

    return (
        <DoctorPortalCard
            variant="compact"
            onClick={onToggleExpand}
            className={`!p-0 cursor-pointer group/card relative transition-all duration-300 hover:-translate-y-1 overflow-hidden
                ${group.isAvailable
                    ? 'hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:shadow-[0_8px_30px_rgb(16,185,129,0.06)]'
                    : 'opacity-80 hover:opacity-100 hover:shadow-lg'}`}
        >
            {/* Main Card */}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-5">
                    <div className={`p-4 rounded-2xl shrink-0 ${isVideo ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                        {orgIcon}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-3">
                            <h4 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${group.isAvailable ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300'}`}>
                                {formatTime12(group.startTime)} <span className="text-gray-300 dark:text-gray-600 font-normal mx-1">→</span> {formatTime12(group.endTime)}
                            </h4>
                            {group.isAvailable ? (
                                <span className="px-2.5 py-1 rounded-md bg-emerald-50/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200/50 dark:border-emerald-800/30">Active</span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest border border-gray-200 dark:border-gray-700">Paused</span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                            {!isVideo && (
                                <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${group.organizationType === 'hospital' ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'}`}>
                                    <Building2 className="w-3.5 h-3.5" /> {orgName}
                                    <span className="opacity-70 font-semibold">· {orgTypeLabel}</span>
                                </span>
                            )}
                            {isVideo && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                    <VideoIcon className="w-3.5 h-3.5" /> Video
                                </span>
                            )}
                            {group.departmentName && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                    <Stethoscope className="w-3.5 h-3.5" /> {group.departmentName}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-800/50">
                                <Hourglass className="w-3.5 h-3.5" /> {(group.slotDuration || 30)}m
                            </span>
                            {typeof group.bufferTime === 'number' && group.bufferTime > 0 && (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-800/50">
                                    <AlarmClock className="w-3.5 h-3.5" /> {group.bufferTime}m buffer
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-gray-800/50">
                                <CalendarDays className="w-3.5 h-3.5" /> {Array.from(new Set(group.dates.map(dayName))).join(' • ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center" onClick={e => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        onClick={onToggleActive}
                        disabled={saving}
                        className={`h-11 w-11 p-0 rounded-xl transition-colors ${group.isAvailable ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/30' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30'}`}
                        title={group.isAvailable ? 'Pause Schedule' : 'Resume Schedule'}
                    >
                        {group.isAvailable ? <PauseCircle className="h-6 w-6" strokeWidth={1.5} /> : <PlayCircle className="h-6 w-6" strokeWidth={1.5} />}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onEdit}
                        disabled={saving}
                        className="h-11 px-3 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-xs font-bold"
                        title="Edit Schedule"
                    >
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onEnd}
                        disabled={saving}
                        className="h-11 w-11 p-0 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="End Schedule"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-400 group-hover/card:bg-gray-50 dark:group-hover/card:bg-gray-800 transition-colors">
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Expanded Sub-slots per date */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 overflow-hidden"
                    >
                        <div className="p-5 sm:p-6 space-y-5">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Bookable Intervals
                                </div>
                            </div>
                            {group.dates.map(date => {
                                const subSlots = generateSubSlots(group.startTime, group.endTime, group.slotDuration || 30);
                                const dateObj = new Date(`${date}T00:00:00`);
                                return (
                                    <div key={date}>
                                        <p className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2.5">
                                            {dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {subSlots.map(timeRange => {
                                                const timeSlot = timeRange.split(' - ')[0];
                                                const slotKey = `${date}_${timeSlot}`;

                                                const booked = isBooked(date, timeSlot);
                                                let blocked = isBlocked(date, timeSlot);
                                                if (optimisticBlocks.has(slotKey)) blocked = true;
                                                if (optimisticUnblocks.has(slotKey)) blocked = false;

                                                return (
                                                    <button
                                                        key={timeRange}
                                                        onClick={() => !booked && onToggleBlock(date, timeRange)}
                                                        disabled={booked}
                                                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center relative overflow-hidden group/slot shadow-sm
                                                            ${booked
                                                                ? 'bg-blue-50/50 text-blue-700 border-blue-200 cursor-not-allowed dark:bg-blue-900/10 dark:border-blue-800/30 dark:text-blue-400'
                                                                : blocked
                                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/80 dark:text-gray-500 dark:border-gray-700 dark:hover:bg-gray-700'
                                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:bg-gray-900 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-gray-800 dark:hover:border-emerald-600'}`}
                                                        title={booked ? "Booked by a patient" : blocked ? "Click to Unblock" : "Click to Block"}
                                                    >
                                                        <span className={`z-10 text-sm ${blocked && !booked ? 'line-through decoration-gray-400' : ''}`}>{timeSlot}</span>
                                                        {booked && (
                                                            <div className="absolute inset-0 bg-blue-100/90 dark:bg-blue-900/80 flex items-center justify-center backdrop-blur-[1px]">
                                                                <span className="text-[10px] uppercase tracking-widest font-extrabold text-blue-800 dark:text-blue-300">Booked</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DoctorPortalCard>
    );
}
