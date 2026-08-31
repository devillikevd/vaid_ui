'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Clock, Video, Building2, ChevronRight, ChevronLeft, Loader2,
    CheckCircle, Sparkles, ArrowRight, Calendar, AlertCircle,
    User, FileText, CreditCard, Check, Lock
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import { useAuthGate } from '@/hooks/useAuthGate';

interface PatientBookingWidgetProps {
    doctor: any;
    initialConsultationType?: 'clinic' | 'video';
    mode?: 'in_person' | 'video';
}

interface TimeSlotItem {
    time: string;
    start_time?: string;
    end_time?: string;
    period?: string;
    is_available?: boolean;
    isAvailable?: boolean;
}

interface NextAvailableSuggestion {
    dateStr: string;
    dateObj: Date;
    availableSlotCount: number;
    firstSlot?: string;
}

// Booking wizard steps
type BookingStep = 1 | 2 | 3 | 4;

function formatDateToYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Stepper Component ────────────────────────────────────────────────────────
function BookingStepper({ currentStep }: { currentStep: BookingStep }) {
    const steps = [
        { n: 1, label: 'Schedule' },
        { n: 2, label: 'Details' },
        { n: 3, label: 'Review' },
    ];

    if (currentStep === 4) return null; // Hide stepper on confirmed screen

    return (
        <div className="flex items-center gap-0 mb-5">
            {steps.map((step, idx) => {
                const isCompleted = (currentStep as number) > step.n;
                const isActive = currentStep === step.n;
                return (
                    <React.Fragment key={step.n}>
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    isCompleted
                                        ? 'bg-vd-forest text-white'
                                        : isActive
                                        ? 'bg-vd-forest text-white ring-2 ring-vd-forest/30 ring-offset-1'
                                        : 'bg-stone-200 text-stone-400'
                                }`}
                            >
                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.n}
                            </div>
                            <span
                                className={`text-[10px] font-semibold ${
                                    isActive || isCompleted ? 'text-vd-forest' : 'text-stone-400'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all ${
                                    (currentStep as number) > step.n ? 'bg-vd-forest' : 'bg-stone-200'
                                }`}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PatientBookingWidget({ doctor, initialConsultationType, mode }: PatientBookingWidgetProps) {
    const router = useRouter();

    const rawVideoFee = doctor.video_consultation_fee ?? doctor.videoConsultationFee;
    const rawClinicFee = doctor.consultation_fee ?? doctor.consultationFee;

    const hasVideo =
        (rawVideoFee !== null && rawVideoFee !== undefined) ||
        doctor.consultation_types?.includes('Video') ||
        doctor.consultation_types?.includes('video');
    const hasClinic =
        (rawClinicFee !== null && rawClinicFee !== undefined) ||
        doctor.consultation_types?.includes('Clinic') ||
        doctor.consultation_types?.includes('clinic') ||
        doctor.consultation_types?.includes('in_person');

    const computeDefaultType = useCallback((): 'clinic' | 'video' => {
        if (initialConsultationType) return initialConsultationType;
        if (mode === 'video') return 'video';
        if (mode === 'in_person') return 'clinic';
        if (hasVideo && !hasClinic) return 'video';
        return 'clinic';
    }, [initialConsultationType, mode, hasVideo, hasClinic]);

    const searchParams = useSearchParams();
    const { user, isAuthenticated } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const { requireAuth, openAuthGate } = useAuthGate();

    // ─── Wizard State ─────────────────────────────────────────────────────────
    const [step, setStep] = useState<BookingStep>(() => {
        // If slot is pre-selected from redirect, resume on Step 2
        return (searchParams.get('slot') && searchParams.get('date')) ? 2 : 1;
    });

    // Step 1: Schedule
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const parsed = new Date(dateParam + 'T00:00:00');
            if (!isNaN(parsed.getTime())) return parsed;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    });
    const [slots, setSlots] = useState<TimeSlotItem[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(() => searchParams.get('slot') || null);
    const [consultationType, setConsultationType] = useState<'clinic' | 'video'>(() => {
        const typeParam = searchParams.get('type');
        if (typeParam === 'video' || typeParam === 'clinic') return typeParam;
        return computeDefaultType();
    });
    const [slotError, setSlotError] = useState('');

    // Step 2: Visit Details
    const [reasonForVisit, setReasonForVisit] = useState(() => searchParams.get('reason') || '');
    const [briefDescription, setBriefDescription] = useState('');

    // Step 3: Confirm / booking state
    const [isBooking, setIsBooking] = useState(false);
    const [bookingError, setBookingError] = useState('');

    // Step 4: Success
    const [bookedAppointment, setBookedAppointment] = useState<any>(null);

    // Look-ahead state
    const [isSearchingNextAvailable, setIsSearchingNextAvailable] = useState(false);
    const [nextAvailableSuggestion, setNextAvailableSuggestion] = useState<NextAvailableSuggestion | null>(null);

    // In-memory slot cache: `${doctorId}_${type}_${dateStr}` → TimeSlotItem[]
    const slotCacheRef = useRef<Map<string, TimeSlotItem[]>>(new Map());

    // Sync consultationType when props change
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (!typeParam) {
            setConsultationType(computeDefaultType());
        }
    }, [doctor.id, mode, initialConsultationType, computeDefaultType, searchParams]);

    // ─── Date Strip ───────────────────────────────────────────────────────────
    const dateStrip = React.useMemo(() => {
        const list: Date[] = [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        for (let i = 0; i < 14; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            list.push(d);
        }
        return list;
    }, []);

    // ─── Slot Helpers ─────────────────────────────────────────────────────────
    const getSlotTimeString = (slot: TimeSlotItem | string): string => {
        if (typeof slot === 'string') return slot;
        return slot.time || slot.start_time || '';
    };

    const isSlotAvailable = (slot: TimeSlotItem | string): boolean => {
        if (typeof slot === 'string') return true;
        return slot.is_available !== false && slot.isAvailable !== false;
    };

    // ─── Slot Fetching ────────────────────────────────────────────────────────
    const getSlotsForDate = useCallback(
        async (doctorId: string, targetDateStr: string, slotMode: 'clinic' | 'video'): Promise<TimeSlotItem[]> => {
            const cacheKey = `${doctorId}_${slotMode}_${targetDateStr}`;
            if (slotCacheRef.current.has(cacheKey)) {
                return slotCacheRef.current.get(cacheKey) || [];
            }

            const res = await patientApi.getDoctorSlots(
                doctorId,
                targetDateStr,
                slotMode === 'video' ? 'video' : 'clinic'
            );

            if (res.success && res.data) {
                const raw = Array.isArray(res.data) ? res.data : ((res.data as any).slots || []);
                // Store ALL slots (available + unavailable) for full display
                slotCacheRef.current.set(cacheKey, raw || []);
                return raw || [];
            }

            slotCacheRef.current.set(cacheKey, []);
            return [];
        },
        []
    );

    // Look-ahead: scan next 14 days for the first date with available slots
    const scanNextAvailable = useCallback(
        async (baseDate: Date, slotMode: 'clinic' | 'video') => {
            setIsSearchingNextAvailable(true);
            setNextAvailableSuggestion(null);

            try {
                for (let i = 1; i <= 14; i++) {
                    const candidate = new Date(baseDate);
                    candidate.setDate(baseDate.getDate() + i);
                    const candidateStr = formatDateToYMD(candidate);
                    const candidateSlots = await getSlotsForDate(doctor.id, candidateStr, slotMode);
                    const availableCount = candidateSlots.filter(isSlotAvailable).length;
                    if (availableCount > 0) {
                        setNextAvailableSuggestion({
                            dateStr: candidateStr,
                            dateObj: candidate,
                            availableSlotCount: availableCount,
                            firstSlot: getSlotTimeString(candidateSlots.find(isSlotAvailable)!),
                        });
                        break;
                    }
                }
            } catch (err) {
                console.error('Error scanning next available dates:', err);
            } finally {
                setIsSearchingNextAvailable(false);
            }
        },
        [doctor.id, getSlotsForDate]
    );

    // Load slots for the currently selected date
    const loadSelectedDateSlots = useCallback(
        async (date: Date, slotMode: 'clinic' | 'video') => {
            setLoadingSlots(true);
            setSlotError('');
            setSelectedSlot(null);
            setNextAvailableSuggestion(null);

            try {
                const dateStr = formatDateToYMD(date);
                const fetchedSlots = await getSlotsForDate(doctor.id, dateStr, slotMode);
                setSlots(fetchedSlots);

                const hasAnyAvailable = fetchedSlots.some(isSlotAvailable);
                if (!hasAnyAvailable) {
                    scanNextAvailable(date, slotMode);
                }
            } catch (err: any) {
                console.error('Failed to load slots:', err);
                setSlotError(err.response?.data?.message || err.message || 'Unable to load availability.');
                setSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        },
        [doctor.id, getSlotsForDate, scanNextAvailable]
    );

    // Reload when date or consultation type changes
    useEffect(() => {
        loadSelectedDateSlots(selectedDate, consultationType);
    }, [selectedDate, consultationType, loadSelectedDateSlots]);

    // Reset cache when doctor changes
    useEffect(() => {
        slotCacheRef.current.clear();
    }, [doctor.id]);

    // ─── Navigation Helpers ───────────────────────────────────────────────────
    const handleJumpToDate = (targetDate: Date) => {
        setSelectedDate(targetDate);
        setSelectedSlot(null);
    };

    const handlePrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (prev >= today) {
            setSelectedDate(prev);
            setSelectedSlot(null);
        }
    };

    const handleNextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
        setSelectedSlot(null);
    };

    // ─── Booking Handler ──────────────────────────────────────────────────────
    const handleConfirmBooking = async () => {
        if (!selectedSlot) return;

        // Auth Gate: If guest or non-patient session, prompt patient login while preserving full booking context
        if (!isPatient) {
            const returnUrl = `/doctors/${doctor.id}?date=${formatDateToYMD(selectedDate)}&slot=${encodeURIComponent(selectedSlot)}&type=${consultationType}&reason=${encodeURIComponent(reasonForVisit)}`;
            openAuthGate({
                actionType: 'book_appointment',
                title: 'Sign In to Confirm Appointment',
                description: `Please sign in or create a patient account to confirm your ${consultationType === 'video' ? 'video consultation' : 'in-clinic visit'} with ${doctor.name}. Your selected date and slot are saved.`,
                returnUrl,
            });
            return;
        }

        setIsBooking(true);
        setBookingError('');
        try {
            const res = await patientApi.bookAppointment({
                doctorId: doctor.id,
                date: formatDateToYMD(selectedDate),
                timeSlot: selectedSlot,
                type: consultationType === 'video' ? 'video' : 'clinic',
                reason: reasonForVisit || undefined,
                patientNotes: briefDescription || undefined,
            } as any);

            if (res.success) {
                setBookedAppointment((res as any).data);
                setStep(4);
            } else {
                setBookingError((res as any).message || (res as any).error || 'Failed to book appointment');
            }
        } catch (err: any) {
            console.error('Booking error:', err);
            setBookingError(
                err.response?.data?.message ||
                err.message ||
                'Failed to book appointment. Please make sure you are logged in as a patient.'
            );
        } finally {
            setIsBooking(false);
        }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ─── Fee Display ──────────────────────────────────────────────────────────
    const feeDisplay =
        consultationType === 'clinic' &&
        rawClinicFee !== null &&
        rawClinicFee !== undefined &&
        !isNaN(Number(rawClinicFee))
            ? `₹${Number(rawClinicFee)}`
            : null;

    // ─── STEP 4: Confirmed ────────────────────────────────────────────────────
    if (step === 4) {
        const apptNum = bookedAppointment?.appointment_number;
        return (
            <div className="bg-white rounded-3xl p-6 text-center space-y-5 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-stone-900 font-heading">Booking Confirmed!</h3>
                    {apptNum && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                            <span className="text-[10px] text-emerald-700 font-semibold tracking-widest uppercase">
                                Appointment ID
                            </span>
                            <span className="text-xs font-bold text-emerald-900 font-mono">{apptNum}</span>
                        </div>
                    )}
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 text-left space-y-2.5 border border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-vd-forest/10 text-vd-forest font-bold text-base flex items-center justify-center shrink-0">
                            {doctor.name?.charAt(0) || 'D'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-stone-900">{doctor.name}</p>
                            <p className="text-xs text-stone-500">{doctor.specialization || 'General Practitioner'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Date</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{formatDisplayDate(selectedDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Time</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">{selectedSlot}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                        {consultationType === 'video' ? (
                            <Video className="w-3.5 h-3.5 text-vd-forest" />
                        ) : (
                            <Building2 className="w-3.5 h-3.5 text-teal-700" />
                        )}
                        <span className="text-xs font-semibold text-stone-700">
                            {consultationType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'}
                        </span>
                    </div>
                </div>

                <p className="text-[11px] text-stone-400 font-light leading-relaxed">
                    A confirmation has been sent. Please arrive on time for your appointment.
                </p>

                <div className="space-y-2 pt-1">
                    <Button
                        className="w-full bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl py-2.5 text-xs font-bold cursor-pointer"
                        onClick={() => router.push('/patient/appointments')}
                    >
                        View My Appointments
                    </Button>
                    <button
                        type="button"
                        className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-700 transition-all cursor-pointer"
                        onClick={() => {
                            // Reset the whole widget to book again
                            setStep(1);
                            setSelectedSlot(null);
                            setReasonForVisit('');
                            setBriefDescription('');
                            setBookingError('');
                            setBookedAppointment(null);
                        }}
                    >
                        Book Another Appointment
                    </button>
                </div>
            </div>
        );
    }

    // ─── STEP 3: Review & Confirm ─────────────────────────────────────────────
    if (step === 3) {
        return (
            <div className="bg-white rounded-3xl p-1 space-y-4 animate-in fade-in slide-in-from-right-2">
                <BookingStepper currentStep={3} />

                <h3 className="font-heading font-bold text-base text-stone-900 px-1">Review Appointment</h3>

                {/* Appointment Summary Card */}
                <div className="bg-stone-50 rounded-2xl border border-stone-200/80 overflow-hidden">
                    {/* Doctor */}
                    <div className="flex items-center gap-3 p-4 border-b border-stone-200/60">
                        <div className="w-11 h-11 rounded-xl bg-vd-forest/10 text-vd-forest font-bold text-base flex items-center justify-center shrink-0">
                            {doctor.name?.charAt(0) || 'D'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-stone-900">{doctor.name}</p>
                            <p className="text-xs text-stone-500">{doctor.specialization || 'General Practitioner'}</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                consultationType === 'video'
                                    ? 'bg-vd-forest/10 text-vd-forest border border-vd-forest/20'
                                    : 'bg-teal-50 text-teal-800 border border-teal-200'
                            }`}>
                                {consultationType === 'video' ? (
                                    <><Video className="w-3 h-3" /> Video</>
                                ) : (
                                    <><Building2 className="w-3 h-3" /> Clinic</>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-0 divide-x divide-stone-200/60 border-b border-stone-200/60">
                        <div className="p-3.5">
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Date</p>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-vd-forest" />
                                <span className="text-xs font-bold text-stone-900">{formatDisplayDate(selectedDate)}</span>
                            </div>
                        </div>
                        <div className="p-3.5">
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Time</p>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-vd-forest" />
                                <span className="text-xs font-bold text-stone-900">{selectedSlot}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reason (if provided) */}
                    {reasonForVisit && (
                        <div className="p-3.5 border-b border-stone-200/60">
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-0.5">Reason for Visit</p>
                            <p className="text-xs text-stone-700 font-medium">{reasonForVisit}</p>
                            {briefDescription && (
                                <p className="text-[11px] text-stone-500 italic mt-0.5">{briefDescription}</p>
                            )}
                        </div>
                    )}

                    {/* Billing / Fee */}
                    <div className="p-3.5">
                        <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold mb-2">Billing</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                                <span className="text-xs text-stone-600 font-medium">Consultation Fee</span>
                            </div>
                            <span className="text-sm font-bold text-stone-900 font-mono">
                                {feeDisplay || (consultationType === 'video' ? 'Confirmed at Visit' : '—')}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-stone-400" />
                                <span className="text-xs text-stone-600 font-medium">Payment Mode</span>
                            </div>
                            <span className="text-xs font-semibold text-stone-700">Pay at Visit</span>
                        </div>
                        <p className="text-[10px] text-stone-400 italic mt-2 leading-relaxed">
                            Payment is collected at the time of your appointment. No advance payment required.
                        </p>
                    </div>
                </div>

                {bookingError && (
                    <div className="flex items-start gap-2 bg-rose-50 p-3 rounded-2xl border border-rose-200 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-rose-700 font-medium">{bookingError}</p>
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => { setStep(2); setBookingError(''); }}
                        className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 rounded-2xl transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <Button
                        className="flex-1 bg-vd-forest hover:bg-vd-forest-deep text-white py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                        onClick={handleConfirmBooking}
                        isLoading={isBooking}
                    >
                        {!isBooking && (
                            <>
                                {consultationType === 'video' ? 'Confirm Video Consultation' : 'Confirm In-Clinic Booking'}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    // ─── STEP 2: Visit Details ────────────────────────────────────────────────
    if (step === 2) {
        return (
            <div className="bg-white rounded-3xl p-1 space-y-4 animate-in fade-in slide-in-from-right-2">
                <BookingStepper currentStep={2} />

                <div className="space-y-1 px-1">
                    <h3 className="font-heading font-bold text-base text-stone-900">Visit Details</h3>
                    <p className="text-xs text-stone-500 font-light">Help your doctor prepare for your visit (optional).</p>
                </div>

                {/* Selected slot summary */}
                <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-200/60 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        {consultationType === 'video' ? (
                            <Video className="w-4 h-4 text-vd-forest" />
                        ) : (
                            <Building2 className="w-4 h-4 text-teal-700" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-stone-900">{formatDisplayDate(selectedDate)} at {selectedSlot}</p>
                        <p className="text-[11px] text-stone-500">{consultationType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'} with {doctor.name}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                            <FileText className="w-3.5 h-3.5 inline mr-1.5 text-stone-400" />
                            Primary Reason for Visit
                        </label>
                        <input
                            type="text"
                            className="w-full border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-vd-forest/30 focus:border-vd-forest outline-none transition-all placeholder:text-stone-400"
                            placeholder="e.g., Routine check-up, fever, back pain..."
                            value={reasonForVisit}
                            onChange={(e) => setReasonForVisit(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                            Brief Description
                            <span className="ml-1 text-stone-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            rows={3}
                            className="w-full border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-vd-forest/30 focus:border-vd-forest outline-none transition-all placeholder:text-stone-400 resize-none"
                            placeholder="Describe your symptoms or any additional context for the doctor..."
                            value={briefDescription}
                            onChange={(e) => setBriefDescription(e.target.value)}
                            maxLength={500}
                        />
                        <p className="text-[10px] text-stone-400 text-right mt-0.5">{briefDescription.length}/500</p>
                    </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 rounded-2xl transition-all cursor-pointer"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-vd-forest hover:bg-vd-forest-deep text-white py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                    >
                        Review Appointment
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // ─── STEP 1: Select Schedule ──────────────────────────────────────────────
    return (
        <div className="bg-white rounded-3xl p-1 space-y-4">
            <BookingStepper currentStep={1} />

            {/* Consultation Type Toggle */}
            {(hasClinic || hasVideo) && (
                <div className="flex gap-2 bg-stone-100 p-1 rounded-2xl">
                    {hasClinic && (
                        <button
                            type="button"
                            onClick={() => { setConsultationType('clinic'); setSelectedSlot(null); }}
                            className={`flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                consultationType === 'clinic'
                                    ? 'bg-white shadow-xs text-stone-900'
                                    : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5 text-teal-700" />
                            <span>
                                In-Clinic
                                {feeDisplay && (
                                    <span className="ml-1 font-bold">({feeDisplay})</span>
                                )}
                            </span>
                        </button>
                    )}
                    {hasVideo && (
                        <button
                            type="button"
                            onClick={() => { setConsultationType('video'); setSelectedSlot(null); }}
                            className={`flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                consultationType === 'video'
                                    ? 'bg-white shadow-xs text-stone-900'
                                    : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <Video className="w-3.5 h-3.5 text-vd-forest" />
                            <span>Video Consultation</span>
                        </button>
                    )}
                </div>
            )}

            {/* Date Selector */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-1.5 text-stone-900">
                        <Calendar className="w-4 h-4 text-vd-forest" />
                        <span className="font-heading font-bold text-xs">Select Date</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handlePrevDay}
                            disabled={selectedDate <= today}
                            className="p-1 rounded-xl hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-stone-700 min-w-[85px] text-center">
                            {formatDisplayDate(selectedDate)}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextDay}
                            className="p-1 rounded-xl hover:bg-stone-100 text-stone-600 transition-all"
                            title="Next day"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 14-Day Rolling Date Strip */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                    {dateStrip.map((d) => {
                        const isSelected = formatDateToYMD(d) === formatDateToYMD(selectedDate);
                        const isToday = formatDateToYMD(d) === formatDateToYMD(today);
                        const dStr = formatDateToYMD(d);
                        const cacheKey = `${doctor.id}_${consultationType}_${dStr}`;
                        const cachedSlots = slotCacheRef.current.get(cacheKey);
                        const hasCachedAvailability = cachedSlots && cachedSlots.some(isSlotAvailable);
                        const isCachedEmpty = cachedSlots && !cachedSlots.some(isSlotAvailable);

                        return (
                            <button
                                key={dStr}
                                type="button"
                                onClick={() => handleJumpToDate(d)}
                                className={`shrink-0 w-14 py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                                    isSelected
                                        ? 'bg-vd-forest text-white border-vd-forest shadow-sm'
                                        : isToday
                                        ? 'bg-emerald-50/60 border-emerald-300/80 text-stone-900 hover:border-vd-forest/50'
                                        : 'bg-stone-50/80 border-stone-200/80 text-stone-700 hover:border-vd-forest/40 hover:bg-stone-100/70'
                                }`}
                            >
                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                                    {isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' })}
                                </span>
                                <span className="text-sm font-bold my-0.5">{d.getDate()}</span>
                                <div className="h-1.5 flex items-center justify-center">
                                    {hasCachedAvailability && (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`}
                                            title="Slots available"
                                        />
                                    )}
                                    {isCachedEmpty && (
                                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/40' : 'bg-stone-300'}`} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots */}
            <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                    <div className="flex items-center gap-1.5 text-stone-900">
                        <Clock className="w-4 h-4 text-vd-forest" />
                        <span className="font-heading font-bold text-xs">Available Slots</span>
                    </div>
                    {slots.length > 0 && !loadingSlots && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                            {slots.filter(isSlotAvailable).length} available
                        </span>
                    )}
                </div>

                {/* Loading */}
                {loadingSlots && (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-500 bg-stone-50/60 rounded-3xl border border-stone-200/60">
                        <Loader2 className="w-6 h-6 animate-spin text-vd-forest" />
                        <p className="text-xs font-medium text-stone-600">Checking available slots...</p>
                    </div>
                )}

                {/* Error */}
                {!loadingSlots && slotError && (
                    <div className="bg-rose-50 rounded-3xl p-5 border border-rose-200 text-center space-y-2 text-rose-800">
                        <p className="text-xs font-semibold">{slotError}</p>
                        <button
                            type="button"
                            onClick={() => loadSelectedDateSlots(selectedDate, consultationType)}
                            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Slots Grid — show ALL (available + booked/past) */}
                {!loadingSlots && !slotError && slots.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in">
                        {slots.map((slot, idx) => {
                            const timeStr = getSlotTimeString(slot);
                            const available = isSlotAvailable(slot);
                            const isSelected = selectedSlot === timeStr;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => available && setSelectedSlot(timeStr)}
                                    title={!available ? 'This slot is unavailable' : undefined}
                                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border text-center truncate ${
                                        !available
                                            ? 'bg-stone-50 border-stone-200/60 text-stone-300 cursor-not-allowed line-through'
                                            : isSelected
                                            ? 'bg-vd-forest border-vd-forest text-white shadow-xs cursor-pointer'
                                            : 'bg-stone-50 border-stone-200 text-stone-800 hover:border-vd-forest/60 hover:bg-emerald-50/40 cursor-pointer'
                                    }`}
                                >
                                    {timeStr}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* No Slots — with Look-Ahead */}
                {!loadingSlots && !slotError && slots.length === 0 && (
                    <div className="bg-stone-50/80 rounded-3xl p-5 border border-stone-200 text-center space-y-3 animate-in fade-in">
                        <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-sm">
                            📅
                        </div>
                        <div>
                            <h4 className="font-heading font-bold text-xs text-stone-900">
                                No appointments available on this date
                            </h4>
                            <p className="text-[11px] text-stone-500 font-light mt-0.5">
                                There are no open slots on {formatDisplayDate(selectedDate)}.
                            </p>
                        </div>

                        {isSearchingNextAvailable && (
                            <div className="flex items-center justify-center gap-2 py-2 text-xs text-vd-forest font-medium border-t border-stone-200/60">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-vd-forest" />
                                <span>Checking upcoming available dates...</span>
                            </div>
                        )}

                        {!isSearchingNextAvailable && nextAvailableSuggestion && (
                            <div className="pt-2 space-y-2 border-t border-stone-200/60">
                                <div className="text-xs text-stone-700 flex items-center justify-center gap-1.5 flex-wrap">
                                    <Sparkles className="w-3.5 h-3.5 text-vd-forest" />
                                    <span>Next available: </span>
                                    <span className="font-bold text-vd-forest">{formatDisplayDate(nextAvailableSuggestion.dateObj)}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                        {nextAvailableSuggestion.availableSlotCount}{' '}
                                        {nextAvailableSuggestion.availableSlotCount === 1 ? 'slot' : 'slots'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleJumpToDate(nextAvailableSuggestion.dateObj)}
                                    className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-vd-forest border border-emerald-300/80 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    <span>View Available Slots</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {!isSearchingNextAvailable && !nextAvailableSuggestion && (
                            <p className="text-[11px] text-stone-400 font-light pt-2 border-t border-stone-200/60">
                                No appointments available in the next 14 days.
                            </p>
                        )}
                    </div>
                )}

                {/* No slots (all unavailable) — also show look-ahead if relevant */}
                {!loadingSlots && !slotError && slots.length > 0 && !slots.some(isSlotAvailable) && (
                    <div className="bg-amber-50/60 rounded-2xl p-3 border border-amber-200/60 text-center mt-2 space-y-2">
                        <p className="text-[11px] text-amber-800 font-medium">All slots on this date are booked or past.</p>
                        {isSearchingNextAvailable && (
                            <div className="flex items-center justify-center gap-2 text-xs text-vd-forest font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Finding next available date...</span>
                            </div>
                        )}
                        {!isSearchingNextAvailable && nextAvailableSuggestion && (
                            <button
                                type="button"
                                onClick={() => handleJumpToDate(nextAvailableSuggestion.dateObj)}
                                className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-vd-forest border border-emerald-300/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Jump to {formatDisplayDate(nextAvailableSuggestion.dateObj)} ({nextAvailableSuggestion.availableSlotCount} slots)
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* CTA: Continue to Step 2 */}
            {selectedSlot && (
                <div className="pt-1 border-t border-stone-100 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between bg-emerald-50/60 rounded-2xl px-3.5 py-2.5 border border-emerald-200/60">
                        <div className="text-xs">
                            <span className="text-stone-500 font-medium">Selected: </span>
                            <span className="font-bold text-stone-900">{formatDisplayDate(selectedDate)} at {selectedSlot}</span>
                        </div>
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full flex items-center justify-center gap-1.5 bg-vd-forest hover:bg-vd-forest-deep text-white py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                        Continue
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
