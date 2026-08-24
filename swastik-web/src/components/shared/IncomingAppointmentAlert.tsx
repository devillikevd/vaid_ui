'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, X, CheckCircle, Calendar, Clock, User } from 'lucide-react';
import { useSocket, type AppointmentUpdate } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore } from '@/stores/doctorStore';

// Base64-encoded short ring tone (WAV). Embedded so the alert has zero network
// dependency. Modern browsers still gate autoplay behind a user gesture, so the
// unlock effect below warms the element on the doctor's first click.
const RING_SOUND_BASE64 = 'data:audio/wav;base64,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';

interface IncomingAlert {
    id: string;
    patientName?: string;
    date?: string;
    time?: string;
    type?: string;
    appointmentId?: string;
    receivedAt: number;
}

/**
 * IncomingAppointmentAlert
 * Shows a ringing popup notification when a new appointment is booked by a patient.
 * Only visible on doctor portal pages.
 */
export function IncomingAppointmentAlert() {
    const { user } = useAuthStore();
    const { confirmAppointment, fetchDashboardData } = useDoctorStore();
    const [alerts, setAlerts] = useState<IncomingAlert[]>([]);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Only show for doctors
    const isDoctor = user?.role === 'doctor';

    // Play the ring tone using a plain HTML <audio> element. Browsers block
    // unmuted autoplay until a user gesture, but MUTED playback is always
    // allowed — so every ring starts muted and immediately unmutes once the
    // element has started (works without a prior click in most browsers). The
    // unlock effect below also permanently unmutes after the first interaction.
    const playRingTone = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
            audio.currentTime = 0;
            audio.muted = true;
            audio.play().then(() => {
                audio.muted = false;
            }).catch((err) => {
                console.error('[Ring] Ringtone playback failed:', err);
            });
        } catch (e) {
            // Audio not supported, silent fail
        }
    }, []);

    // Unlock browser autoplay policy on first user interaction anywhere on the
    // dashboard by unmuting permanently. Subsequent rings (which fire from the
    // socket callback / interval) then play audibly with no tricks needed.
    useEffect(() => {
        const unlock = () => {
            const audio = audioRef.current;
            if (!audio) return;
            try {
                audio.muted = false;
                audio.currentTime = 0;
                audio.play().catch(() => {});
                audio.pause();
                console.log('[Ring] Audio unlocked (muted=false)');
            } catch (e) {}
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
        return () => {
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
        };
    }, []);

    const addAlert = useCallback((update: any) => {
        const alertId = `${update.id || update.appointmentId || Date.now()}`;
        const raw = update;
        const newAlert: IncomingAlert = {
            id: alertId,
            patientName: raw.patientName || raw.patient_name || raw.patient?.name || 'A patient',
            date: raw.date || raw.appointment_date,
            time: raw.timeSlot || raw.time_slot || raw.time,
            type: raw.type || raw.appointment_type || 'Appointment',
            appointmentId: raw.id || raw.appointmentId,
            receivedAt: Date.now(),
        };

        setAlerts(prev => {
            // Avoid duplicates
            if (prev.some(a => a.id === alertId)) return prev;
            return [newAlert, ...prev];
        });
        console.log('[Ring] incoming alert →', alertId, '|', newAlert.patientName);
        playRingTone();
    }, [playRingTone]);

    // Listen to appointment:new AND notification:new (as a foolproof fallback)
    const { on } = useSocket();
    useEffect(() => {
        if (!isDoctor) return;
        
        const unsubAppt = on('appointment:new', addAlert);
        const unsubNotif = on('notification:new', (notif: any) => {
            if (notif.type === 'appointment_booked' && notif.data) {
                addAlert(notif.data);
            }
        });
        
        return () => {
            unsubAppt();
            unsubNotif();
        };
    }, [on, addAlert, isDoctor]);
    // Auto-dismiss after 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            setAlerts(prev => prev.filter(a => now - a.receivedAt < 30000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Ring every 3 seconds while alerts are active
    useEffect(() => {
        if (alerts.length > 0) {
            if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
            ringIntervalRef.current = setInterval(() => {
                playRingTone();
            }, 3000);
        } else {
            if (ringIntervalRef.current) {
                clearInterval(ringIntervalRef.current);
                ringIntervalRef.current = null;
            }
        }
        return () => {
            if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
        };
    }, [alerts.length, playRingTone]);

    const dismissAlert = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const handleApprove = useCallback(async (alert: IncomingAlert) => {
        if (!alert.appointmentId) {
            dismissAlert(alert.id);
            return;
        }
        setApprovingId(alert.id);
        try {
            await confirmAppointment(alert.appointmentId);
            await fetchDashboardData();
        } finally {
            setApprovingId(null);
            dismissAlert(alert.id);
        }
    }, [confirmAppointment, fetchDashboardData, dismissAlert]);

    if (!isDoctor) return null;

    return (
        <>
            <audio
                ref={audioRef}
                src={RING_SOUND_BASE64}
                preload="auto"
                muted
                aria-hidden="true"
                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
            />
            {alerts.length > 0 && (
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full">
                {alerts.map((alert) => {
                    const isApproving = approvingId === alert.id;
                    const elapsed = Math.floor((Date.now() - alert.receivedAt) / 1000);
                    const remaining = Math.max(0, 30 - elapsed);

                    return (
                        <div
                            key={alert.id}
                            className="bg-white dark:bg-gray-900 border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
                            style={{ animation: 'slideInRight 0.3s ease-out' }}
                        >
                            {/* Animated top bar */}
                            <div
                                className="h-1 bg-emerald-500 transition-all duration-1000"
                                style={{ width: `${(remaining / 30) * 100}%` }}
                            />

                            <div className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {/* Ringing icon with pulse */}
                                        <div className="relative">
                                            <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                                                <Phone className="h-5 w-5 text-emerald-600 animate-bounce" />
                                            </div>
                                            {/* Pulse rings */}
                                            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-30" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                                New Appointment!
                                            </p>
                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {alert.patientName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => dismissAlert(alert.id)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Details */}
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4 pl-1">
                                    {alert.date && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {alert.date}
                                        </span>
                                    )}
                                    {alert.time && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {alert.time}
                                        </span>
                                    )}
                                    {alert.type && (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                            {alert.type}
                                        </span>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => dismissAlert(alert.id)}
                                        disabled={isApproving}
                                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => handleApprove(alert)}
                                        disabled={isApproving}
                                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {isApproving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4" />
                                                Approve
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <style jsx>{`
                    @keyframes slideInRight {
                        from { transform: translateX(110%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}</style>
            </div>
            )}
        </>
    );
}
