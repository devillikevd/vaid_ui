'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar, CalendarClock, Clock, User, Video, Search, RefreshCw, Loader2, AlertCircle, Play, XCircle as XCircleIcon, CheckCircle, Bell, UserCheck, CalendarX, Inbox, FileText, ClipboardList, SearchX, X, Mic, Compass, Stethoscope, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { DoctorPortalCard } from '@/components/doctor/DoctorPortalCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { useDoctorStore } from '@/stores/doctorStore';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doctorApi } from '@/lib/api';
import { useAppointmentUpdates, type AppointmentUpdate } from '@/hooks/useSocket';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import {
    SOURCE_FILTER_OPTIONS,
    VISIT_TYPE_FILTER_OPTIONS,
    getSourceDisplay,
    getVisitTypeDisplay,
    resolveCanonicalSource,
    resolveCanonicalVisitType
} from '@/lib/clinicalDimensions';
import { getAppointmentStartTimingInfo, isAppointmentTimePast } from '@/lib/utils';

// --- Sub-components for better UX and Performance ---

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-yellow-100 rounded-sm px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

const AppointmentSkeleton = () => (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="flex gap-5 w-full lg:w-[70%]">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0 mt-1 hidden sm:block"></div>
            <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    <div className="h-5 bg-gray-100 dark:bg-gray-800/50 rounded w-16"></div>
                </div>
                <div className="flex gap-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-24"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-20"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className="h-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-800"></div>
                </div>
            </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-[30%]">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-24 mb-2"></div>
            <div className="flex gap-2 w-full lg:justify-end">
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20"></div>
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20"></div>
            </div>
        </div>
    </div>
);

const EmptyState = ({ statusFilter, searchQuery }: { statusFilter: string; searchQuery: string }) => {
    let icon = <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />;
    let title = 'No appointments found';
    let desc = 'You have no appointments matching the current filters.';

    if (searchQuery) {
        icon = <SearchX className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />;
        title = 'No appointments found';
        desc = `We couldn't find any patients matching "${searchQuery}".`;
    } else if (statusFilter === 'active') {
        icon = <CalendarX className="h-12 w-12 text-emerald-200 dark:text-emerald-900 mb-4" />;
        title = 'No active appointments';
        desc = 'You are all caught up! There are no upcoming or pending appointments right now.';
    } else if (statusFilter === 'scheduled') {
        icon = <Clock className="h-12 w-12 text-blue-200 dark:text-blue-900 mb-4" />;
        title = 'No scheduled appointments';
        desc = 'There are no newly scheduled appointments awaiting review.';
    } else if (statusFilter === 'confirmed') {
        icon = <Calendar className="h-12 w-12 text-emerald-200 dark:text-emerald-900 mb-4" />;
        title = 'No confirmed appointments';
        desc = 'There are no confirmed appointments right now.';
    } else if (statusFilter === 'in_progress') {
        icon = <Play className="h-12 w-12 text-indigo-200 dark:text-indigo-900 mb-4" />;
        title = 'No appointments in progress';
        desc = 'There are no consultations currently in progress.';
    } else if (statusFilter === 'completed') {
        icon = <CheckCircle className="h-12 w-12 text-emerald-200 dark:text-emerald-900 mb-4" />;
        title = 'No completed appointments';
        desc = 'You have not completed any appointments yet.';
    } else if (statusFilter === 'cancelled') {
        icon = <XCircleIcon className="h-12 w-12 text-red-200 dark:text-red-900/50 mb-4" />;
        title = 'No cancelled appointments';
        desc = 'There are no cancelled appointments to show.';
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{desc}</p>
        </div>
    );
};

// Memoized single row component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppointmentCard = React.memo(({ apt, searchQuery, handleConfirm, handleStartConsultation, handleCheckIn, handleComplete, openNewSchedule, handleCancel, setAuditTrailModal, isActing, router, nowMs }: any) => {
    const isActive = ['scheduled', 'confirmed', 'pending', 'in_progress'].includes((apt.status || '').toLowerCase());
    const consultationId = apt.consultation_id || apt.consultation_room_id;
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Overdue check (canonical IST date-time comparison)
    const isOverdue = ['scheduled', 'confirmed'].includes((apt.status || '').toLowerCase()) &&
        isAppointmentTimePast(apt.date || apt.appointment_date, apt.time || apt.timeSlot || apt.time_slot, nowMs);

    // Start timing eligibility (canonical 10-minute early start window in IST)
    const startTimingInfo = getAppointmentStartTimingInfo(apt.date || apt.appointment_date, apt.time || apt.timeSlot, nowMs);

    const age = apt.patient?.date_of_birth ? Math.abs(new Date(Date.now() - new Date(apt.patient.date_of_birth).getTime()).getUTCFullYear() - 1970) : null;
    const hasDetails = Boolean(apt.reason || (apt.symptoms && apt.symptoms.length > 0) || apt.patient_notes || apt.severity_current !== undefined || apt.onset_type || apt.voice_note_url || apt.known_allergies?.length || apt.current_medications || apt.medical_history);

    return (
        <div 
            className={`group flex flex-col lg:flex-row lg:items-start justify-between gap-4 p-5 transition-all duration-200 border-b last:border-b-0 border-gray-100 dark:border-gray-800/60 ${
                isOverdue
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-l-4 border-l-red-500'
                    : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 border-l-4 border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600'
            } ${hasDetails ? 'cursor-pointer' : ''}`}
            onClick={() => { if (hasDetails) setIsExpanded(!isExpanded); }}
            aria-expanded={hasDetails ? isExpanded : undefined}
            role={hasDetails ? 'button' : undefined}
            tabIndex={hasDetails ? 0 : undefined}
            onKeyDown={(e) => {
                if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                }
            }}
        >
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full lg:w-[70%]">
                <div className="flex-shrink-0 mt-1 hidden sm:block">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shadow-sm group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:group-hover:bg-emerald-900/40 dark:group-hover:text-emerald-400 group-hover:border-emerald-200 dark:group-hover:border-emerald-800/50 transition-colors">
                        <User className="h-6 w-6" />
                    </div>
                </div>
                
                <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`/doctor/patients/${apt.patientId || apt.patient?.id || ''}`}
                            className="font-semibold text-lg text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center gap-1.5 transition-colors"
                            title="Click to view full patient medical record & vitals"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <HighlightedText text={apt.patientName || 'Patient'} highlight={searchQuery} />
                        </Link>
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            ID: {apt.id.substring(0, 8).toUpperCase()}
                        </span>
                        {/* Independent Source Badge */}
                        {(() => {
                            const srcDisplay = getSourceDisplay(resolveCanonicalSource(apt));
                            const vtDisplay = getVisitTypeDisplay(resolveCanonicalVisitType(apt));
                            return (
                                <>
                                    <span className={`text-[11px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded border ${srcDisplay.badgeClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${srcDisplay.dotClass}`}></span>
                                        {srcDisplay.label}
                                    </span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${vtDisplay.badgeClass}`}>
                                        {vtDisplay.label}
                                    </span>
                                </>
                            );
                        })()}
                        {(apt.fee !== undefined || apt.consultation_fee !== undefined) && (
                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                ₹{apt.fee ?? apt.consultation_fee ?? 0} · {(apt.payment_status || 'PAID').toUpperCase()}
                            </span>
                        )}
                        {apt.patient?.gender && (
                            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 capitalize">
                                {apt.patient.gender}
                            </span>
                        )}
                        {age !== null && (
                            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                {age} yrs
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {apt.date ? new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {apt.time || apt.timeSlot || '—'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {apt.type?.toLowerCase() === 'video' ? <Video className="h-4 w-4 text-indigo-500" /> : <UserCheck className="h-4 w-4 text-emerald-500" />}
                            <span className={apt.type?.toLowerCase() === 'video' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                {apt.type || 'Clinic'}
                            </span>
                        </div>
                    </div>

                    {isOverdue && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Appointment time has passed. Reschedule required.
                        </div>
                    )}

                    {hasDetails && (
                        <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-500 select-none">
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-4 w-4" />
                                    Hide Details
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4" />
                                    View Details
                                </>
                            )}
                        </div>
                    )}

                    {isExpanded && hasDetails && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                            {apt.reason && (
                                <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Reason</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 leading-relaxed">{apt.reason}</p>
                                </div>
                            )}
                            
                            {apt.symptoms && apt.symptoms.length > 0 && (
                                <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1.5 flex justify-between">
                                        <span>Symptoms</span>
                                        {apt.symptom_duration && <span className="text-gray-500 lowercase normal-case">{apt.symptom_duration}</span>}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {apt.symptoms.map((sym: string) => (
                                            <span key={sym} className="text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 px-2 py-0.5 rounded border border-red-100 dark:border-red-800/30">
                                                {sym}
                                            </span>
                                        ))}
                                    </div>
                                    {apt.symptom_pattern && <p className="text-xs text-gray-500 mt-2 italic">{apt.symptom_pattern}</p>}
                                </div>
                            )}

                            {(apt.severity_current !== undefined || apt.onset_type) && (
                                <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Severity & Onset</p>
                                    {apt.severity_current !== undefined && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-gray-500">Current Pain:</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${apt.severity_current <= 3 ? 'bg-green-100 text-green-700' : apt.severity_current <= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {apt.severity_current}/10
                                                </span>
                                                {apt.severity_worst !== undefined && <span className="text-[10px] text-gray-400">(Worst: {apt.severity_worst}/10)</span>}
                                            </div>
                                        </div>
                                    )}
                                    {apt.onset_type && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Onset:</span>
                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium capitalize">{apt.onset_type}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(apt.known_allergies?.length || apt.current_medications || apt.medical_history) ? (
                                <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700 md:col-span-2 lg:col-span-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Medical History & Allergies</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {apt.known_allergies && apt.known_allergies.length > 0 && (
                                            <div>
                                                <p className="text-[10px] text-red-400 font-semibold mb-1">ALLERGIES</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {apt.known_allergies.map((a: string) => <span key={a} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{a}</span>)}
                                                </div>
                                            </div>
                                        )}
                                        {apt.current_medications && (
                                            <div>
                                                <p className="text-[10px] text-blue-400 font-semibold mb-1">CURRENT MEDICATIONS</p>
                                                <p className="text-xs text-gray-700 dark:text-gray-300">{apt.current_medications}</p>
                                            </div>
                                        )}
                                        {apt.medical_history && (
                                            <div>
                                                <p className="text-[10px] text-teal-400 font-semibold mb-1">MEDICAL HISTORY</p>
                                                <p className="text-xs text-gray-700 dark:text-gray-300">{apt.medical_history}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {apt.voice_note_url && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800/30 shadow-sm md:col-span-2 lg:col-span-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                            <Mic className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">Patient Voice Note</p>
                                            <p className="text-[10px] text-teal-600/70 dark:text-teal-400/70">{apt.voice_note_duration || 'Audio message'}</p>
                                        </div>
                                    </div>
                                    <audio src={apt.voice_note_url} controls className="h-8 max-w-[200px]" />
                                </div>
                            )}

                            {apt.patient_notes && !apt.reason && (
                                <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700 md:col-span-2 lg:col-span-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Notes</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 leading-relaxed">{apt.patient_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div 
                className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-[30%] pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between lg:justify-end w-full">
                    <div className="lg:hidden font-medium text-gray-500 text-sm">Status</div>
                    <StatusBadge status={apt.status || 'scheduled'} size="md" />
                </div>
                
                <div className="flex flex-wrap lg:flex-row items-center justify-start lg:justify-end gap-2 w-full mt-2">
                    {apt.status === 'scheduled' && (
                        <>
                            <Button aria-label="Approve Appointment" size="sm" variant="primary" onClick={() => handleConfirm(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}>
                                Approve
                            </Button>
                            <Button aria-label="Reschedule Appointment" size="sm" variant={isOverdue ? 'danger' : 'outline'} onClick={() => openNewSchedule(apt)} disabled={isActing} leftIcon={<CalendarClock className={`h-4 w-4 ${isOverdue ? 'text-white' : 'text-gray-500'}`} />} className={isOverdue ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 animate-pulse' : 'text-gray-700 hover:text-gray-900'}>
                                {isOverdue ? 'Reschedule Now' : 'Reschedule'}
                            </Button>
                            <Button aria-label="Cancel Appointment" size="sm" variant="outline" onClick={() => handleCancel(apt.id)} disabled={isActing}>
                                <XCircleIcon className="h-4 w-4 text-gray-500 hover:text-red-600 transition-colors" />
                            </Button>
                        </>
                    )}
                    {apt.status === 'confirmed' && (
                        <>
                            {(apt.type === 'video' || apt.type === 'Video') ? (
                                <Button
                                    aria-label="Start Consultation"
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleStartConsultation(apt.id)}
                                    disabled={isActing || isOverdue || !startTimingInfo.canStart}
                                    leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                                    className={
                                        isOverdue
                                            ? 'opacity-50 cursor-not-allowed'
                                            : !startTimingInfo.canStart
                                                ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed font-medium'
                                                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold'
                                    }
                                    title={!startTimingInfo.canStart ? 'Consultation can be started 10 minutes before the scheduled time' : 'Click to start consultation'}
                                >
                                    {isOverdue ? 'Reschedule First' : startTimingInfo.label}
                                </Button>
                            ) : (
                                <Button
                                    aria-label="Check-In Patient"
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleCheckIn(apt.id)}
                                    disabled={isActing || isOverdue}
                                    leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                                    className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                                >
                                    Check-In
                                </Button>
                            )}
                            <Button aria-label="Reschedule Appointment" size="sm" variant={isOverdue ? 'danger' : 'outline'} onClick={() => openNewSchedule(apt)} disabled={isActing} leftIcon={<CalendarClock className={`h-4 w-4 ${isOverdue ? 'text-white' : 'text-gray-500'}`} />} className={isOverdue ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 animate-pulse' : 'text-gray-700 hover:text-gray-900'}>
                                {isOverdue ? 'Reschedule Now' : 'Reschedule'}
                            </Button>
                            <Button aria-label="Cancel Appointment" size="sm" variant="outline" onClick={() => handleCancel(apt.id)} disabled={isActing}>
                                <XCircleIcon className="h-4 w-4 text-gray-500 hover:text-red-600 transition-colors" />
                            </Button>
                        </>
                    )}
                    {apt.status === 'in_progress' && (
                        <>
                            {(apt.type === 'video' || apt.type === 'Video') && (
                                <Button aria-label="Rejoin Consultation" size="sm" variant="primary" onClick={() => handleStartConsultation(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />} className="bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white">
                                    Rejoin
                                </Button>
                            )}
                            <Button aria-label="Complete Appointment" size="sm" variant="primary" onClick={() => handleComplete(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}>
                                Complete
                            </Button>
                            {apt.patient_id && (
                                <Button aria-label="View Patient" size="sm" variant="outline" onClick={() => router.push(`/doctor/patients/${apt.patient_id}`)} leftIcon={<User className="h-4 w-4 text-gray-500" />}>
                                    Patient
                                </Button>
                            )}
                        </>
                    )}
                    {apt.status === 'completed' && (
                        <>
                            <Button aria-label="View Audit Trail" size="sm" variant="outline" onClick={() => setAuditTrailModal(apt)} leftIcon={<FileText className="h-4 w-4 text-gray-500" />}>
                                Details
                            </Button>
                            <Button aria-label="Write Prescription" size="sm" variant="outline" onClick={() => router.push(`/doctor/prescriptions/new?appointmentId=${apt.id}`)} leftIcon={<ClipboardList className="h-4 w-4 text-emerald-600" />} className="text-emerald-700 hover:text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50">
                                Prescription
                            </Button>
                        </>
                    )}
                    {apt.status === 'cancelled' && (
                        <Button aria-label="View Audit Trail" size="sm" variant="outline" onClick={() => setAuditTrailModal(apt)} leftIcon={<FileText className="h-4 w-4 text-gray-500" />}>
                            Details
                        </Button>
                    )}
                    
                    {/* Fallback for edge statuses like pending if any */}
                    {['pending'].includes(apt.status) && (
                        <>
                            <Button size="sm" variant="primary" onClick={() => handleConfirm(apt.id)} disabled={isActing} leftIcon={isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleCancel(apt.id)} disabled={isActing}><XCircleIcon className="h-4 w-4 text-red-500 hover:text-red-600 transition-colors" /></Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});
AppointmentCard.displayName = 'AppointmentCard';

// --- Main Page Component ---

export default function DoctorAppointmentsPage() {
    const router = useRouter();
    const { appointments, loadingAppointments, isLoading, error, fetchAppointments, startConsultation, completeAppointment, resendOtp, confirmAppointment, cancelAppointment, rescheduleAppointment, checkInAppointment, clearError } = useDoctorStore();
    const isListLoading = Boolean(loadingAppointments || isLoading);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState('all');
    
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [newApptAlert, setNewApptAlert] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [page, setPage] = useState(1);
    const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reschedulePrompt, setReschedulePrompt] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [newScheduleAppt, setNewScheduleAppt] = useState<any>(null);
    const [newScheduleDate, setNewScheduleDate] = useState('');
    const [newScheduleTime, setNewScheduleTime] = useState('');
    const [otpModal, setOtpModal] = useState<{ appointmentId: string } | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendSuccess, setResendSuccess] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [auditTrailModal, setAuditTrailModal] = useState<any>(null);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Heartbeat timer (every 30s) to continuously update start countdowns and gating
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const selectedStatus = statusFilter === 'all' ? undefined : statusFilter;
    const isActiveAppointment = useCallback((status?: string) => ['scheduled', 'confirmed', 'pending', 'in_progress'].includes((status || '').toLowerCase()), []);

    // Real-time Socket.IO auto-refresh when patient books/cancels
    useAppointmentUpdates(
        useCallback((update: AppointmentUpdate) => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                fetchAppointments(selectedStatus, undefined, 1);
            }, 900);
            const msg = update.status === 'scheduled' ? 'New appointment booked by a patient!' :
                update.status === 'cancelled' ? 'An appointment was cancelled' :
                `Appointment status changed to ${update.status}`;
            setNewApptAlert(msg);
            setTimeout(() => setNewApptAlert(null), 5000);
        }, [fetchAppointments, selectedStatus])
    );

    useEffect(() => () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    }, []);

    useEffect(() => {
        fetchAppointments(selectedStatus, undefined, 1);
    }, [fetchAppointments, selectedStatus]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setResendSuccess('');
        }
    }, [resendCooldown]);

    // Auto-refresh polling fallback
    useAutoRefresh(() => fetchAppointments(selectedStatus, undefined, 1));

    const searchParams = useSearchParams();
    const [facilityFilter, setFacilityFilter] = useState<string>(searchParams?.get('facilityId') || 'all');
    const [associatedFacilities, setAssociatedFacilities] = useState<Array<{ id: string; name: string; kind: 'hospital' | 'clinic' }>>([]);

    useEffect(() => {
        const loadFacilities = async () => {
            try {
                const [hRes, cRes] = await Promise.all([
                    doctorApi.getHospitalInvites(),
                    doctorApi.getClinicInvites(),
                ]);
                const facList: Array<{ id: string; name: string; kind: 'hospital' | 'clinic' }> = [];
                if (hRes.success && Array.isArray(hRes.data)) {
                    hRes.data.filter((i: any) => ['accepted', 'active'].includes(i.status)).forEach((i: any) => {
                        const h = i.hospital;
                        if (h && (h.id || i.hospital_id)) {
                            facList.push({ id: h.id || i.hospital_id, name: h.name || 'Hospital', kind: 'hospital' });
                        }
                    });
                }
                if (cRes.success && Array.isArray(cRes.data)) {
                    cRes.data.filter((i: any) => ['accepted', 'active'].includes(i.status)).forEach((i: any) => {
                        const c = i.clinic;
                        if (c && (c.id || i.clinic_id)) {
                            facList.push({ id: c.id || i.clinic_id, name: c.name || 'Clinic', kind: 'clinic' });
                        }
                    });
                }
                setAssociatedFacilities(facList);
            } catch (e) {
                console.error('Failed to load associated facilities', e);
            }
        };
        loadFacilities();
    }, []);

    const filtered = useMemo(() => {
        return (appointments || []).filter(apt => {
            const matchesSearch = (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' ? isActiveAppointment(apt.status) : 
                   (statusFilter === 'pending' ? apt.status === 'scheduled' : apt.status === statusFilter));
            
            // Source Dimension Filter
            const canonicalSrc = resolveCanonicalSource(apt);
            const matchesSource = sourceFilter === 'all' || canonicalSrc === sourceFilter;

            // Visit Type Dimension Filter
            const canonicalVisitType = resolveCanonicalVisitType(apt);
            const matchesVisitType = visitTypeFilter === 'all' || canonicalVisitType === visitTypeFilter;

            // Facility Dimension Filter
            let matchesFacility = true;
            if (facilityFilter === 'telemedicine') {
                matchesFacility = apt.type?.toLowerCase() === 'video' || (apt as any).consultation_mode === 'video' || apt.type === 'telemedicine';
            } else if (facilityFilter !== 'all') {
                const aptFacilityId = (apt as any).hospital_id || (apt as any).hospitalId || (apt as any).clinic_id || (apt as any).clinicId || (apt as any).facility_id || (apt as any).hospital?.id || (apt as any).clinic?.id;
                matchesFacility = aptFacilityId === facilityFilter || (apt as any).hospital?.name === facilityFilter;
            }

            return matchesSearch && matchesStatus && matchesSource && matchesVisitType && matchesFacility;
        });
    }, [appointments, searchQuery, statusFilter, sourceFilter, visitTypeFilter, facilityFilter, isActiveAppointment]);

    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 10);
    const paginatedItems = useMemo(() => paginate(page), [paginate, page]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchQuery, statusFilter, sourceFilter, visitTypeFilter, facilityFilter]);

    // Handlers
    const handleConfirm = async (id: string) => {
        setActionLoading(id);
        const apt = appointments.find(a => a.id === id);
        if (apt) {
            const isPast = isAppointmentTimePast(
                apt.date || apt.appointment_date,
                apt.time || apt.timeSlot || apt.time_slot,
                nowMs
            );
            if (isPast) {
                setReschedulePrompt(apt);
                setActionLoading(null);
                return;
            }
        }
        await confirmAppointment(id);
        setActionLoading(null);
    };

    const handleStartConsultation = async (id: string) => {
        setActionLoading(id);
        const consultationId = await startConsultation(id);
        setActionLoading(null);
        if (consultationId) {
            router.push(`/consultation/${consultationId}`);
        } else {
            fetchAppointments(selectedStatus, undefined, 1);
        }
    };

    const handleCheckIn = async (id: string) => {
        setActionLoading(id);
        await checkInAppointment(id);
        setActionLoading(null);
        fetchAppointments(selectedStatus, undefined, 1);
    };

    const handleComplete = async (id: string) => {
        setOtpModal({ appointmentId: id });
        setOtpInput('');
        setOtpError('');
    };

    const submitOtp = async () => {
        if (!otpModal || otpInput.length !== 6) return;
        setActionLoading('otp');
        try {
            await completeAppointment(otpModal.appointmentId, otpInput);
            setOtpModal(null);
        } catch (e: any) {
            setOtpError(e.response?.data?.message || 'Invalid OTP');
        }
        setActionLoading(null);
    };

    const handleResendOtp = async () => {
        if (!otpModal) return;
        setActionLoading('resend_otp');
        try {
            await resendOtp(otpModal.appointmentId);
            setResendSuccess('OTP sent successfully!');
            setResendCooldown(60);
        } catch (e: any) {
            setOtpError('Failed to resend OTP');
        }
        setActionLoading(null);
    };

    const confirmReschedule = async () => {
        if (!reschedulePrompt) return;
        setActionLoading(reschedulePrompt.id);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const newDate = now.toISOString().split('T')[0];
        const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        await rescheduleAppointment(reschedulePrompt.id, newDate, newTime);
        setActionLoading(null);
        setReschedulePrompt(null);
    };

    const openNewSchedule = (apt: any) => {
        setNewScheduleAppt(apt);
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const fallbackDate = now.toISOString().split('T')[0];
        const fallbackTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setNewScheduleDate(apt.date || apt.appointment_date || fallbackDate);
        setNewScheduleTime((apt.time || apt.timeSlot || fallbackTime).substring(0, 5));
    };

    const submitNewSchedule = async () => {
        if (!newScheduleAppt) return;
        if (!newScheduleDate || !newScheduleTime) {
            alert('Please choose a date and time for the new schedule.');
            return;
        }
        setActionLoading(newScheduleAppt.id);
        await rescheduleAppointment(newScheduleAppt.id, newScheduleDate, newScheduleTime);
        setActionLoading(null);
        setNewScheduleAppt(null);
        setNewScheduleDate('');
        setNewScheduleTime('');
    };

    const handleCancel = async (appointmentId: string) => {
        setCancelAppointmentId(appointmentId);
        setCancelReason('');
    };

    const confirmCancel = async () => {
        if (!cancelAppointmentId) return;
        const appointmentId = cancelAppointmentId;
        setActionLoading(appointmentId);
        await cancelAppointment(appointmentId, cancelReason.trim() || undefined);
        setActionLoading(null);
        setCancelAppointmentId(null);
        setCancelReason('');
    };

    return (
        <>
        <div className="space-y-6">
            {/* Real-time Alert */}
            {newApptAlert && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse" role="alert">
                    <Bell className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">🔔 {newApptAlert}</span>
                    <button onClick={() => setNewApptAlert(null)} aria-label="Dismiss alert" className="ml-auto text-emerald-800 underline text-sm">Dismiss</button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Appointments</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 font-medium">Manage and review your patient appointments</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => fetchAppointments(selectedStatus, undefined, 1)} 
                        leftIcon={isListLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        disabled={isListLoading}
                        variant="outline"
                        aria-label="Refresh appointments list"
                        className="shadow-sm hover:shadow transition-shadow bg-white dark:bg-gray-800 disabled:opacity-60"
                    >
                        {isListLoading ? 'Refreshing...' : 'Refresh List'}
                    </Button>
                </div>
            </div>

            {/* Associated Facilities & Consultation Mode Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setFacilityFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        facilityFilter === 'all'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                >
                    All OPD Sessions ({appointments.length})
                </button>
                <button
                    onClick={() => setFacilityFilter('telemedicine')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                        facilityFilter === 'telemedicine'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                >
                    <Video className="h-3.5 w-3.5" />
                    Online Telemedicine ({appointments.filter(a => a.type?.toLowerCase() === 'video' || (a as any).consultation_mode === 'video' || a.type === 'telemedicine').length})
                </button>
                {associatedFacilities.map(f => {
                    const count = appointments.filter(a => {
                        const fid = (a as any).hospital_id || (a as any).hospitalId || (a as any).clinic_id || (a as any).clinicId || (a as any).facility_id || (a as any).hospital?.id || (a as any).clinic?.id;
                        return fid === f.id || (a as any).hospital?.name === f.name;
                    }).length;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFacilityFilter(f.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                facilityFilter === f.id
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            <Building2 className="h-3.5 w-3.5" />
                            {f.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Search and Filters Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full lg:w-full max-w-sm group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                            <Search className="h-4 w-4" />
                        </div>
                        <Input
                            type="text"
                            placeholder="Search patient name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-emerald-500 focus:ring-emerald-500/20"
                            aria-label="Search patient name"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Independent Dimension Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        {/* 1. Source Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[140px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Compass className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="block w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-white dark:bg-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-bold appearance-none"
                            >
                                {SOURCE_FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Visit Type Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[160px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Stethoscope className="h-3.5 w-3.5" />
                            </div>
                            <select
                                value={visitTypeFilter}
                                onChange={(e) => setVisitTypeFilter(e.target.value)}
                                className="block w-full pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-xs bg-white dark:bg-gray-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-bold appearance-none"
                            >
                                {VISIT_TYPE_FILTER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="w-full overflow-x-auto no-scrollbar pb-1">
                    <div className="flex items-center gap-2.5 min-w-max">
                        {[
                            { id: 'active', label: 'Active' },
                            { id: 'scheduled', label: 'Scheduled' },
                            { id: 'confirmed', label: 'Confirmed' },
                            { id: 'in_progress', label: 'In Progress' },
                            { id: 'completed', label: 'Completed' },
                            { id: 'cancelled', label: 'Cancelled' },
                        ].map((status) => {
                            const isActive = statusFilter === status.id;
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => setStatusFilter(status.id)}
                                    aria-label={`Filter by ${status.label}`}
                                    aria-pressed={isActive}
                                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                                        isActive
                                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-md border border-gray-900 dark:border-gray-100'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-sm'
                                    }`}
                                >
                                    {status.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <DoctorPortalCard className="!p-0 overflow-hidden bg-white dark:bg-gray-900 border-none sm:border-solid">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isListLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <AppointmentSkeleton key={i} />)
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Unable to load appointments</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">{error}</p>
                            <Button 
                                onClick={() => { clearError(); fetchAppointments(selectedStatus, undefined, 1); }} 
                                leftIcon={<RefreshCw className="h-4 w-4" />}
                                className="rounded-xl shadow-xs"
                            >
                                Retry
                            </Button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState statusFilter={statusFilter} searchQuery={searchQuery} />
                    ) : (
                        paginatedItems.map((apt) => (
                            <AppointmentCard 
                                key={apt.id} 
                                apt={apt} 
                                searchQuery={searchQuery}
                                handleConfirm={handleConfirm}
                                handleStartConsultation={handleStartConsultation}
                                handleCheckIn={handleCheckIn}
                                handleComplete={handleComplete}
                                openNewSchedule={openNewSchedule}
                                handleCancel={handleCancel}
                                setAuditTrailModal={setAuditTrailModal}
                                isActing={actionLoading === apt.id}
                                router={router}
                                nowMs={nowMs}
                            />
                        ))
                    )}
                </div>
                {!isListLoading && !error && filtered.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                    />
                )}
            </DoctorPortalCard>
        </div>

        {/* OTP Verification Modal */}
        {otpModal && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(e) => { if (e.target === e.currentTarget && !actionLoading) { setOtpModal(null); } }}
                aria-modal="true"
                role="dialog"
            >
                <Card className="w-full max-w-sm">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enter Completion OTP</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Ask the patient for the 6-digit OTP shown on their screen and enter it below to complete the consultation.
                            </p>
                        </div>
                        <div className="relative flex justify-center gap-2 mt-4 mb-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-12 h-14 flex items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all ${
                                        otpInput.length === i
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20'
                                            : otpInput.length > i
                                                ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400'
                                    }`}
                                >
                                    {otpInput[i] || ''}
                                </div>
                            ))}
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={otpInput}
                                onChange={(e) => { setOtpError(''); setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                                aria-label="OTP Input"
                                autoFocus
                            />
                        </div>
                        {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}
                        {resendSuccess && <p className="text-sm text-emerald-500 text-center">{resendSuccess}</p>}
                        <div className="flex justify-center pt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResendOtp}
                                disabled={resendCooldown > 0 || actionLoading === 'resend_otp'}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            >
                                {actionLoading === 'resend_otp' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP to Patient'}
                            </Button>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setOtpModal(null)}
                                disabled={!!actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={submitOtp}
                                disabled={!!actionLoading || otpInput.length !== 6}
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Complete
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}

        {/* Cancel Appointment Modal */}
        {cancelAppointmentId && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== cancelAppointmentId) {
                        setCancelAppointmentId(null);
                        setCancelReason('');
                    }
                }}
                aria-modal="true"
                role="dialog"
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cancel Appointment</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Add an optional reason so the patient has more context in their appointment updates.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cancellation Reason</label>
                            <textarea
                                value={cancelReason}
                                onChange={(event) => setCancelReason(event.target.value)}
                                rows={4}
                                placeholder="Optional reason for cancellation"
                                aria-label="Cancellation reason"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => {
                                setCancelAppointmentId(null);
                                setCancelReason('');
                            }} disabled={actionLoading === cancelAppointmentId}>
                                Keep Appointment
                            </Button>
                            <Button variant="danger" onClick={confirmCancel} disabled={actionLoading === cancelAppointmentId}>
                                {actionLoading === cancelAppointmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Appointment'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        {/* Reschedule Prompt Modal */}
        {reschedulePrompt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== reschedulePrompt.id) {
                        setReschedulePrompt(null);
                    }
                }}
                aria-modal="true"
                role="dialog"
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reschedule Past Appointment</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                This appointment&apos;s requested time has already passed. Would you like to reschedule it to 15 minutes from now and approve?
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setReschedulePrompt(null)} disabled={actionLoading === reschedulePrompt.id}>
                                Cancel
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={async () => {
                                    setActionLoading(reschedulePrompt.id);
                                    await confirmAppointment(reschedulePrompt.id);
                                    setActionLoading(null);
                                    setReschedulePrompt(null);
                                }} 
                                disabled={actionLoading === reschedulePrompt.id}
                            >
                                Approve with Past Time
                            </Button>
                            <Button variant="primary" onClick={confirmReschedule} disabled={actionLoading === reschedulePrompt.id}>
                                {actionLoading === reschedulePrompt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reschedule & Approve'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        {/* New Schedule Modal */}
        {newScheduleAppt && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget && actionLoading !== newScheduleAppt.id) {
                        setNewScheduleAppt(null);
                    }
                }}
                aria-modal="true"
                role="dialog"
            >
                <Card className="w-full max-w-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Give New Schedule</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {newScheduleAppt.patientName} could not join at {newScheduleAppt.time || newScheduleAppt.timeSlot || 'the scheduled time'}. Choose a new date and time below — the patient will be notified instantly.
                            </p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Date</label>
                            <Input
                                type="date"
                                aria-label="New appointment date"
                                value={newScheduleDate}
                                onChange={(e) => setNewScheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">New Time</label>
                            <Input
                                type="time"
                                aria-label="New appointment time"
                                value={newScheduleTime}
                                onChange={(e) => setNewScheduleTime(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setNewScheduleAppt(null)} disabled={actionLoading === newScheduleAppt.id}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={submitNewSchedule} disabled={actionLoading === newScheduleAppt.id}>
                                {actionLoading === newScheduleAppt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save New Schedule'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
        
        {/* Audit Trail Modal */}
        {auditTrailModal && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget) {
                        setAuditTrailModal(null);
                    }
                }}
                aria-modal="true"
                role="dialog"
            >
                <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Appointment Details</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Lifecycle and clinical summary
                            </p>
                        </div>
                        <Button aria-label="Close" variant="ghost" size="sm" onClick={() => setAuditTrailModal(null)} className="rounded-full h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <X className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* 1. Patient Summary */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Patient Summary</h3>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Name</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{auditTrailModal.patientName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Age & Gender</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                        {auditTrailModal.patient?.date_of_birth ? `${Math.abs(new Date(Date.now() - new Date(auditTrailModal.patient.date_of_birth).getTime()).getUTCFullYear() - 1970)} yrs, ` : ''}
                                        {auditTrailModal.patient?.gender || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Blood Group</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{auditTrailModal.patient?.blood_group || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Patient ID</p>
                                    <p className="font-mono text-sm font-medium text-gray-600 dark:text-gray-300">{auditTrailModal.patient_id?.substring(0, 8).toUpperCase() || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Appointment Summary */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Appointment Summary</h3>
                            <div className="bg-white dark:bg-[#0B1020] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                            {auditTrailModal.date ? new Date(auditTrailModal.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{auditTrailModal.time || auditTrailModal.timeSlot || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Status & Type</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <StatusBadge status={auditTrailModal.status} size="sm" />
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${auditTrailModal.type?.toLowerCase() === 'video' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                                                {auditTrailModal.type || 'Clinic'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {auditTrailModal.reason && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Reason for visit</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200">{auditTrailModal.reason}</p>
                                        </div>
                                    )}
                                    {auditTrailModal.symptoms && auditTrailModal.symptoms.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">Symptoms</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {auditTrailModal.symptoms.map((sym: string) => (
                                                    <span key={sym} className="text-[11px] bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 px-2 py-0.5 rounded border border-red-100 dark:border-red-800/30 font-medium">
                                                        {sym}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Practice Source</p>
                                        {(auditTrailModal.source === 'direct_walk_in' || auditTrailModal.source === 'direct_phone' || auditTrailModal.source === 'direct' || auditTrailModal.type === 'home_visit') ? (
                                            <span className="inline-block text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800/50">
                                                Direct Practice (Outside Vaididea)
                                            </span>
                                        ) : (
                                            <span className="inline-block text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800/50">
                                                Vaididea Platform
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Consultation Fee</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            ₹{auditTrailModal.fee ?? auditTrailModal.consultation_fee ?? 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Payment Status</p>
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 uppercase">
                                            {auditTrailModal.payment_status || 'PAID'} {auditTrailModal.payment_reference ? `(${auditTrailModal.payment_reference})` : ''}
                                        </span>
                                    </div>
                                </div>
                                {(auditTrailModal.diagnosis || auditTrailModal.doctor_notes) && (
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                        {auditTrailModal.diagnosis && (
                                            <div>
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Clinical Diagnosis</p>
                                                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{auditTrailModal.diagnosis}</p>
                                            </div>
                                        )}
                                        {auditTrailModal.doctor_notes && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Doctor's Clinical Notes</p>
                                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">{auditTrailModal.doctor_notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Lifecycle Timeline */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Lifecycle Events</h3>
                            
                            {(!auditTrailModal.status_history || auditTrailModal.status_history.length === 0) ? (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Limited history available</h4>
                                        <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">Detailed lifecycle events are unavailable for this appointment.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative pl-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800 space-y-6 mt-4">
                                    {auditTrailModal.status_history.map((event: any, i: number) => {
                                        let icon = <CheckCircle className="w-4 h-4 text-emerald-500" />;
                                        let bg = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50";
                                        
                                        const statusLower = event.status?.toLowerCase() || '';
                                        if (statusLower === 'scheduled' || statusLower === 'pending') {
                                            icon = <Calendar className="w-4 h-4 text-blue-500" />;
                                            bg = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50";
                                        } else if (statusLower === 'in_progress' || statusLower === 'resumed') {
                                            icon = <Play className="w-4 h-4 text-indigo-500" />;
                                            bg = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50";
                                        } else if (statusLower === 'cancelled') {
                                            icon = <XCircleIcon className="w-4 h-4 text-red-500" />;
                                            bg = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50";
                                        } else if (statusLower === 'rescheduled') {
                                            icon = <CalendarClock className="w-4 h-4 text-orange-500" />;
                                            bg = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50";
                                        } else if (statusLower === 'paused') {
                                            icon = <Clock className="w-4 h-4 text-amber-500" />;
                                            bg = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50";
                                        }

                                        return (
                                            <div key={i} className="relative">
                                                {/* Node */}
                                                <div className={`absolute -left-6 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm ${bg} z-10 -translate-x-[1px]`}>
                                                    {icon}
                                                </div>
                                                
                                                {/* Content */}
                                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3.5 rounded-xl shadow-sm flex items-center justify-between gap-4 ml-4">
                                                    <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
                                                        {event.status}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {new Date(event.timestamp).toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center justify-end gap-3 mt-auto">
                        <Button 
                            variant="outline" 
                            onClick={() => router.push(`/doctor/patients/${auditTrailModal.patient_id}`)}
                            leftIcon={<User className="w-4 h-4" />}
                            className="bg-white dark:bg-gray-800"
                        >
                            Patient Record
                        </Button>
                        {auditTrailModal.has_prescription && (
                            <Button 
                                variant="outline" 
                                onClick={() => router.push(`/doctor/prescriptions?consultation=${auditTrailModal.consultation_id}`)}
                                leftIcon={<FileText className="w-4 h-4 text-emerald-500" />}
                                className="bg-white dark:bg-gray-800"
                            >
                                Prescription
                            </Button>
                        )}
                        <Button variant="primary" onClick={() => setAuditTrailModal(null)}>
                            Close Details
                        </Button>
                    </div>
                </Card>
            </div>
        )}
        </>
    );
}
