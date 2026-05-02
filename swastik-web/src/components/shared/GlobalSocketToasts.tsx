'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import {
    useConsultationStarted,
    useConsultationEnded,
    usePrescriptionUpdates,
    useOrderUpdates,
    useAppointmentUpdates,
    useDiagnosticUpdates,
} from '@/hooks/useSocket';

/**
 * I3: Global toast listener that shows real-time toast notifications for socket events.
 * I4: Shows consultation started/ended notifications.
 * Must be placed inside a <ToastProvider> and should only render for authenticated users.
 */
export default function GlobalSocketToasts() {
    const { user, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const toast = useToast();
    const toastRef = useRef(toast);
    toastRef.current = toast;
    const userRole = user?.role;

    // I4: Consultation started (patient gets notified doctor is ready)
    const onConsultationStarted = useCallback((data: { consultationId: string; doctorName: string }) => {
        if (userRole !== 'patient') return;
        toastRef.current.info(
            '📹 Consultation Ready',
            `Dr. ${data.doctorName || 'Your doctor'} is ready for the video consultation`,
            {
                duration: 15000,
                action: {
                    label: 'Join Now',
                    onClick: () => router.push(`/consultation/${data.consultationId}`),
                },
            }
        );
    }, [router, userRole]);

    // I4: Consultation ended
    const onConsultationEnded = useCallback((data: { consultationId: string; duration?: number }) => {
        const mins = data.duration ? Math.round(data.duration / 60) : null;
        toastRef.current.success(
            'Consultation Completed',
            mins ? `Session lasted ${mins} minutes` : 'Your consultation has ended'
        );
    }, []);

    // C2: Prescription created
    const onPrescription = useCallback((data: { doctorName?: string }) => {
        toastRef.current.success(
            '💊 New Prescription',
            `${data.doctorName ? `Dr. ${data.doctorName}` : 'Your doctor'} has written a new prescription`
        );
    }, []);

    // Appointment update
    const onAppointmentUpdate = useCallback((data: { status: string; doctorName?: string }) => {
        if (userRole === 'patient') {
            const statusMessages: Record<string, string> = {
                confirmed: `Your appointment${data.doctorName ? ` with Dr. ${data.doctorName}` : ''} is confirmed`,
                cancelled: 'Your appointment has been cancelled',
                rescheduled: 'Your appointment has been rescheduled',
                completed: 'Your appointment has been completed',
            };
            const message = statusMessages[data.status];
            if (message) {
                toastRef.current.info('📅 Appointment Update', message);
            }
            return;
        }

        const statusMessages: Record<string, string> = {
            scheduled: 'A new appointment has been booked',
            confirmed: 'A new appointment has been booked',
            cancelled: 'An appointment has been cancelled',
            rescheduled: 'An appointment has been rescheduled',
            completed: 'An appointment has been completed',
        };
        const message = statusMessages[data.status] || `Appointment status changed to ${data.status}`;
        toastRef.current.info('📅 Appointment Update', message);
    }, [userRole]);

    // Order update (for patients and pharmacies)
    const onOrderUpdate = useCallback((data: { status: string; orderNumber?: string }) => {
        if (userRole === 'pharmacy_owner') {
            const orderLabel = data.orderNumber ? `Order ${data.orderNumber}` : 'An order';
            toastRef.current.info('📦 Order Update', `${orderLabel} is now ${data.status}`);
            return;
        }

        const statusMessages: Record<string, string> = {
            confirmed: 'Your order has been confirmed',
            shipped: 'Your order is on the way',
            delivered: 'Your order has been delivered',
            cancelled: 'Your order has been cancelled',
            ready_for_pickup: 'Your order is ready for pickup',
        };
        const message = statusMessages[data.status] || `Order status: ${data.status}`;
        toastRef.current.info('📦 Order Update', message);
    }, [userRole]);

    // New order (for pharmacy owners)
    const onNewOrder = useCallback(() => {
        toastRef.current.info('🛒 New Order', 'A new order has been placed');
    }, []);

    // Diagnostic updates
    const onDiagnosticNew = useCallback(() => {
        toastRef.current.info('🔬 New Booking', 'A new diagnostic booking request has been received');
    }, []);

    const onDiagnosticStatus = useCallback((data: { status: string }) => {
        const statusMessages: Record<string, string> = {
            confirmed: 'A diagnostic booking has been confirmed',
            dispatched: 'A home collection team has been dispatched',
            sample_collected: 'A diagnostic sample has been collected',
            processing: 'A diagnostic booking is now processing',
            completed: 'A diagnostic booking has been completed',
            cancelled: 'A diagnostic booking has been cancelled',
        };
        toastRef.current.info('🔬 Booking Update', statusMessages[data.status] || `Diagnostic booking status: ${data.status}`);
    }, []);

    const onDiagnosticResult = useCallback(() => {
        toastRef.current.success('🔬 Results Ready', 'Your diagnostic test results are now available');
    }, []);

    // Wire up all hooks — they only fire when the user is authenticated (socket connected)
    useConsultationStarted(isAuthenticated ? onConsultationStarted : undefined);
    useConsultationEnded(isAuthenticated ? onConsultationEnded : undefined);
    usePrescriptionUpdates(isAuthenticated ? onPrescription : undefined);
    useAppointmentUpdates(isAuthenticated ? onAppointmentUpdate : undefined);
    useOrderUpdates(
        isAuthenticated ? onOrderUpdate : undefined,
        isAuthenticated && user?.role === 'pharmacy_owner' ? onNewOrder : undefined
    );
    useDiagnosticUpdates(
        isAuthenticated && user?.role === 'diagnostic_center_owner' ? onDiagnosticNew : undefined,
        isAuthenticated ? onDiagnosticStatus : undefined,
        isAuthenticated ? onDiagnosticResult : undefined
    );

    // This component renders nothing — it's purely a side-effect listener
    return null;
}
