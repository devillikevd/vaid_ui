'use client';

import { ReactNode } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Video,
    Users,
    Clock,
    Settings,
    Stethoscope,
    ClipboardList,
    Activity,
    MailCheck,
    Radar,
    MessageCircleQuestion,
    Star,
    IndianRupee,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';
import { IncomingAppointmentAlert } from '@/components/shared/IncomingAppointmentAlert';

const DOCTOR_CONFIG: DashboardConfig = {
    role: 'doctor',
    loginPath: '/login/doctor',
    portalTitle: 'Doctor Portal',
    portalSubtitle: 'Clinical Workstation',
    portalIcon: Stethoscope,
    theme: { color: 'emerald', dataTheme: 'doctor' },
    showApprovalBanner: true,
    showFullDropdown: true,
    settingsHref: '/doctor/settings',
    userDisplayName: 'Doctor',
    navItems: [
        { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
        { name: 'Appointments', href: '/doctor/appointments', icon: Calendar, section: 'Clinical Work' },

        { name: 'Prescriptions', href: '/doctor/prescriptions', icon: ClipboardList, section: 'Clinical Work' },
        { name: 'Patients', href: '/doctor/patients', icon: Users, section: 'Clinical Work' },
        { name: 'Vitals', href: '/doctor/vitals', icon: Activity, section: 'Health & Monitoring' },
        { name: 'Health Alerts', href: '/doctor/health-alerts', icon: Radar, section: 'Health & Monitoring' },
        { name: 'Schedule', href: '/doctor/schedule', icon: Clock, section: 'Management' },
        { name: 'Invites', href: '/doctor/invites', icon: MailCheck, section: 'Management' },
        { name: 'Community Q&A', href: '/doctor/community', icon: MessageCircleQuestion, section: 'Management' },
        { name: 'Reviews', href: '/doctor/reviews', icon: Star, section: 'Management' },
        { name: 'Earnings', href: '/doctor/earnings', icon: IndianRupee, section: 'Management' },
        { name: 'Settings', href: '/doctor/settings', icon: Settings, section: 'Management' },
    ],
};

export default function DoctorLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <DashboardLayout config={DOCTOR_CONFIG}>{children}</DashboardLayout>
            <IncomingAppointmentAlert />
        </>
    );
}
