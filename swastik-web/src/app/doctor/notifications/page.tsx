'use client';

import { Bell, Calendar, FileText, AlertTriangle, UserPlus, Building2, ShieldAlert } from 'lucide-react';
import { NotificationCenter, NotificationCategory } from '@/components/shared/NotificationCenter';

const DOCTOR_CATEGORIES: NotificationCategory[] = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'invitations', label: 'Care Networks & Invites', icon: UserPlus, types: ['new_coach_invite', 'hospital_invite', 'clinic_reinvite', 'clinic_affiliation_ended', 'clinic_invite', 'clinic_invite_response'] },
    { id: 'appointments', label: 'Appointments', icon: Calendar, types: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_reminder', 'consultation_started', 'consultation_ready', 'consultation_ended'] },
    { id: 'patients', label: 'Patients & Prescriptions', icon: FileText, types: ['prescription_ready', 'prescription_expiry_reminder', 'medicine_missed'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['sos_contact_alert', 'sos_update', 'sos_accepted', 'ambulance_arrived', 'health_alert', 'fall_detected', 'crash_sos'] },
];

const getDoctorIconForType = (type: string) => {
    if (type.includes('appointment') || type.includes('consultation')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type === 'clinic_affiliation_ended') return <Building2 className="w-5 h-5 text-amber-500" />;
    if (type.includes('invite') || type.includes('reinvite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    if (type.includes('prescription') || type.includes('medicine')) return <FileText className="w-5 h-5 text-emerald-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
};

export default function NotificationsPage() {
    return (
        <NotificationCenter
            title="Notification Center"
            description="Manage all your alerts, messages, and updates in one place."
            categories={DOCTOR_CATEGORIES}
            getIconForType={getDoctorIconForType}
            theme="default"
        />
    );
}
