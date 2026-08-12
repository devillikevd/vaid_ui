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
    BarChart3,
    Building2,
    Lightbulb,
    MessageSquare,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';
import { IncomingAppointmentAlert } from '@/components/shared/IncomingAppointmentAlert';

const DOCTOR_CONFIG: DashboardConfig = {
    role: ['doctor', 'doctor_pending'],
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
        { name: 'Dashboard',       href: '/doctor',                  icon: LayoutDashboard },
        { name: 'My Care Networks',href: '/doctor/care-networks',     icon: Building2,               section: 'Workspace' },
        { name: 'Analytics',       href: '/doctor/analytics',         icon: BarChart3,               section: 'Workspace' },
        { name: 'AI Insights',     href: '/doctor/insights',          icon: Lightbulb,               section: 'Workspace' },
        { name: 'Appointments',    href: '/doctor/appointments',      icon: Calendar,                section: 'Clinical Work' },
        { name: 'Prescriptions',   href: '/doctor/prescriptions',     icon: ClipboardList,           section: 'Clinical Work' },
        { name: 'Patients',        href: '/doctor/patients',          icon: Users,                   section: 'Clinical Work' },
        { name: 'Vitals',          href: '/doctor/vitals',            icon: Activity,                section: 'Clinical Work' },
        { name: 'Health Alerts',   href: '/doctor/health-alerts',     icon: Radar,                   section: 'Clinical Work' },
        { name: 'Schedule',        href: '/doctor/schedule',          icon: Clock,                   section: 'Management' },
        { name: 'Community Q&A',   href: '/doctor/community',         icon: MessageCircleQuestion,   section: 'Management' },
        { name: 'Reviews',         href: '/doctor/reviews',           icon: Star,                    section: 'Management' },
        { name: 'Earnings',        href: '/doctor/earnings',          icon: IndianRupee,             section: 'Management' },
        { name: 'Feedback',        href: '/doctor/feedback',          icon: MessageSquare,           section: 'Account' },
        { name: 'Settings',        href: '/doctor/settings',          icon: Settings,                section: 'Account' },
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
