'use client';

import { Bell, Calendar, FileText, AlertTriangle, UserPlus, HeartPulse } from 'lucide-react';
import { NotificationCenter, NotificationCategory } from '@/components/shared/NotificationCenter';

const HOSPITAL_CATEGORIES: NotificationCategory[] = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'appointments', label: 'Appointments & Consultations', icon: Calendar, types: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_check_in', 'appointment_status_changed', 'consultation_started', 'consultation_ready', 'consultation_ended'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['sos_contact_alert', 'sos_update', 'ambulance_arrived', 'health_alert', 'outbreak_alert', 'fall_detected', 'crash_sos'] },
    { id: 'invitations', label: 'Invitations & Providers', icon: UserPlus, types: ['hospital_invite', 'clinic_invite_response', 'clinic_invite'] },
];

const getHospitalIconForType = (type: string) => {
    if (type.includes('appointment') || type.includes('consultation')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert') || type.includes('ambulance') || type.includes('outbreak')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type.includes('invite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
};

export default function HospitalNotificationsPage() {
    return (
        <NotificationCenter
            title="Notification Center"
            description="Hospital alerts and updates"
            categories={HOSPITAL_CATEGORIES}
            getIconForType={getHospitalIconForType}
            theme="default"
        />
    );
}
