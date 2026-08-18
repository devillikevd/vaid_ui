'use client';

import { Bell, Calendar, FileText, AlertTriangle, UserPlus } from 'lucide-react';
import { NotificationCenter, NotificationCategory } from '@/components/shared/NotificationCenter';

const DIAGNOSTIC_CATEGORIES: NotificationCategory[] = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'bookings', label: 'Bookings & Appointments', icon: Calendar, types: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_check_in', 'appointment_status_changed'] },
    { id: 'reports', label: 'Reports & Records', icon: FileText, types: ['medical_record_access'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['health_alert', 'outbreak_alert'] },
    { id: 'partnerships', label: 'Partnerships', icon: UserPlus, types: ['hospital_invite', 'clinic_invite_response', 'clinic_invite'] },
];

const getDiagnosticIconForType = (type: string) => {
    if (type.includes('appointment') || type.includes('booking')) return <Calendar className="w-5 h-5 text-blue-500" />;
    if (type.includes('record') || type.includes('report')) return <FileText className="w-5 h-5 text-emerald-500" />;
    if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert') || type.includes('outbreak')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type.includes('invite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
};

export default function DiagnosticNotificationsPage() {
    return (
        <NotificationCenter
            title="Notification Center"
            description="Bookings, reports, partnerships and diagnostic updates"
            categories={DIAGNOSTIC_CATEGORIES}
            getIconForType={getDiagnosticIconForType}
            theme="default"
        />
    );
}
