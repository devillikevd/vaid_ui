'use client';

import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, Video, Building2, ChevronRight, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import { doctorApi, appointmentsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface PatientBookingWidgetProps {
    doctor: any;
}

export function PatientBookingWidget({ doctor }: PatientBookingWidgetProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [consultationType, setConsultationType] = useState<'clinic' | 'video'>(doctor.video_consultation_fee > 0 ? 'video' : 'clinic');
    const [bookingReason, setBookingReason] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [error, setError] = useState('');

    const fetchSlots = async (date: Date) => {
        setLoadingSlots(true);
        setError('');
        try {
            const dateStr = date.toISOString().split('T')[0];
            const res = await doctorApi.getAvailableSlots(doctor.id, dateStr, consultationType);
            if (res.success) {
                setSlots(res.data);
            } else {
                setSlots([]);
            }
        } catch (err: any) {
            console.error("Failed to load slots:", err);
            setError(err.response?.data?.message || 'Failed to load available slots');
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        fetchSlots(selectedDate);
    }, [selectedDate, consultationType]);

    const handlePrevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        const today = new Date();
        today.setHours(0,0,0,0);
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

    const handleBook = async () => {
        if (!selectedSlot) return;
        setIsBooking(true);
        setError('');
        try {
            const res = await appointmentsApi.create({
                doctorId: doctor.id,
                date: selectedDate.toISOString().split('T')[0],
                timeSlot: selectedSlot,
                type: consultationType,
                reason: bookingReason
            });
            if (res.success) {
                setBookingSuccess(true);
            } else {
                setError(res.message || 'Failed to book appointment');
            }
        } catch (err: any) {
            console.error("Booking error:", err);
            setError(err.response?.data?.message || 'Failed to book appointment. Please make sure you are logged in as a patient.');
        } finally {
            setIsBooking(false);
        }
    };

    if (bookingSuccess) {
        return (
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-vd-beige text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-vd-blue mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600 mb-6">
                    Your {consultationType} consultation with Dr. {doctor.name.split(' ')[0]} has been scheduled for {selectedDate.toLocaleDateString()} at {selectedSlot}.
                </p>
                <Button className="w-full bg-vd-orange text-white" onClick={() => window.location.href = '/patient/dashboard'}>
                    Go to My Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-vd-beige">
            <h3 className="text-2xl font-bold text-vd-blue mb-6">Book Appointment</h3>
            
            {/* Consultation Type Toggle */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                {doctor.consultation_types?.includes('Clinic') && (
                    <button 
                        onClick={() => { setConsultationType('clinic'); setSelectedSlot(null); }}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${consultationType === 'clinic' ? 'bg-white shadow-sm text-vd-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Building2 className="w-4 h-4" /> Clinic
                    </button>
                )}
                {doctor.consultation_types?.includes('Video') && (
                    <button 
                        onClick={() => { setConsultationType('video'); setSelectedSlot(null); }}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${consultationType === 'video' ? 'bg-white shadow-sm text-vd-blue' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Video className="w-4 h-4" /> Video
                    </button>
                )}
            </div>

            {/* Date Selector */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 disabled:opacity-30" disabled={selectedDate.toDateString() === new Date().toDateString()}>
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="text-sm text-gray-500 font-medium">Select Date</p>
                    <p className="font-bold text-vd-blue">{selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Slots Grid */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/> Available Slots</h4>
                {loadingSlots ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-vd-orange" />
                    </div>
                ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot, idx) => {
                            const slotTime = typeof slot === 'string' ? slot : slot.start_time;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedSlot(slotTime)}
                                    className={`py-2 px-2 rounded-lg text-sm font-medium transition-all border ${
                                        selectedSlot === slotTime
                                            ? 'bg-vd-orange border-vd-orange text-white'
                                            : 'bg-white border-gray-200 text-gray-700 hover:border-vd-orange hover:text-vd-orange'
                                    }`}
                                >
                                    {slotTime}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-500">No slots available on this date.</p>
                    </div>
                )}
            </div>

            {/* Booking Details */}
            {selectedSlot && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit (Optional)</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-vd-orange focus:border-vd-orange"
                            placeholder="E.g., Fever and cold"
                            value={bookingReason}
                            onChange={(e) => setBookingReason(e.target.value)}
                        />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Consultation Fee</span>
                        <span className="text-xl font-bold text-vd-blue">₹{consultationType === 'video' ? doctor.video_consultation_fee : doctor.consultation_fee}</span>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <Button 
                        className="w-full bg-vd-blue hover:bg-vd-blue/90 text-white py-6"
                        onClick={handleBook}
                        isLoading={isBooking}
                    >
                        Confirm Booking
                    </Button>
                </div>
            )}
        </div>
    );
}
