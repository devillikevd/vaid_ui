'use client';

import { Bell, Calendar, FileText, AlertTriangle, UserPlus, UserCheck } from 'lucide-react';
import { NotificationCenter, NotificationCategory } from '@/components/shared/NotificationCenter';

const CLINIC_CATEGORIES: NotificationCategory[] = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'appointments', label: 'Appointments', icon: Calendar, types: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_check_in', 'appointment_status_changed', 'consultation_started', 'consultation_ready', 'consultation_ended'] },
    { id: 'invitations', label: 'Doctor Invitations', icon: UserPlus, types: ['clinic_invite_response', 'clinic_invite'] },
    { id: 'patients', label: 'Patients & Records', icon: FileText, types: ['prescription_ready', 'medical_record_access'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['sos_contact_alert', 'sos_update', 'health_alert', 'outbreak_alert'] },
];

const getClinicIconForType = (type: string) => {
    if (type.includes('appointment') || type.includes('consultation')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (type.includes('invite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    if (type.includes('check_in')) return <UserCheck className="w-5 h-5 text-emerald-500" />;
    if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert') || type.includes('outbreak')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type.includes('prescription') || type.includes('record')) return <FileText className="w-5 h-5 text-emerald-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
};

export default function ClinicNotificationsPage() {
    return (
        <NotificationCenter
            title="Notification Center"
            description="Alerts, messages, and updates for your clinic."
            categories={CLINIC_CATEGORIES}
            getIconForType={getClinicIconForType}
            theme="default"
        />
    );
}
