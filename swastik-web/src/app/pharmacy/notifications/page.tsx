'use client';

import { Bell, FileText, AlertTriangle, UserPlus } from 'lucide-react';
import { NotificationCenter, NotificationCategory } from '@/components/shared/NotificationCenter';

const PHARMACY_CATEGORIES: NotificationCategory[] = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'orders', label: 'Orders & Prescriptions', icon: FileText, types: ['prescription_ready', 'prescription_expiry_reminder', 'medicine_missed'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['health_alert', 'outbreak_alert'] },
    { id: 'partnerships', label: 'Partnerships', icon: UserPlus, types: ['hospital_invite', 'clinic_invite_response', 'clinic_invite'] },
];

const getPharmacyIconForType = (type: string) => {
    if (type.includes('prescription') || type.includes('medicine') || type.includes('order')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert') || type.includes('outbreak')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type.includes('invite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
    return <Bell className="w-5 h-5 text-gray-500" />;
};

export default function PharmacyNotificationsPage() {
    return (
        <NotificationCenter
            title="Notification Center"
            description="Orders, prescriptions, partnerships and pharmacy updates"
            categories={PHARMACY_CATEGORIES}
            getIconForType={getPharmacyIconForType}
            theme="orange"
        />
    );
}
