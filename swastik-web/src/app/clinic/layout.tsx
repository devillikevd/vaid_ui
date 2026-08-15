'use client';

import { ReactNode } from 'react';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Clock,
    Settings,
    Building,
    Stethoscope,
    Pill,
    Microscope,
    Radar,
    Star,
    UserRound,
    HeartPulse,
    Bell,
    Building2,
    ListChecks,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig } from '@/components/shared/DashboardLayout';

const CLINIC_CONFIG: DashboardConfig = {
    role: 'clinic_owner',
    loginPath: '/login/clinic',
    portalTitle: 'Clinic Portal',
    portalSubtitle: 'Clinic Operating System',
    portalIcon: Building,
    theme: { color: 'pink', dataTheme: 'clinic' },
    showApprovalBanner: true,
    showFullDropdown: false,
    settingsHref: '/clinic/settings',
    userDisplayName: 'Clinic',
    navItems: [
        // GENERAL
        { name: 'Dashboard', href: '/clinic', icon: LayoutDashboard, section: 'General' },
        { name: 'Appointments', href: '/clinic/appointments', icon: Calendar, section: 'General' },
        { name: 'Consultations', href: '/clinic/consultations', icon: Stethoscope, section: 'General' },
        { name: 'Team', href: '/clinic/staff', icon: Users, section: 'General' },

        // CLINICAL OPS
        { name: 'Doctors', href: '/clinic/doctors', icon: UserRound, section: 'Clinical Ops' },
        { name: 'Patients', href: '/clinic/patients', icon: HeartPulse, section: 'Clinical Ops' },
        { name: 'Departments', href: '/clinic/departments', icon: Building2, section: 'Clinical Ops' },
        { name: 'Schedule', href: '/clinic/schedule', icon: Clock, section: 'Clinical Ops' },

        // PARTNERS
        { name: 'Pharmacies', href: '/clinic/pharmacies', icon: Pill, section: 'Partners' },
        { name: 'Diagnostics', href: '/clinic/diagnostic-centers', icon: Microscope, section: 'Partners' },

        // GROWTH
        { name: 'Reviews', href: '/clinic/reviews', icon: Star, section: 'Growth' },
        { name: 'Reels', href: '/clinic/reels', icon: Star, section: 'Growth' },

        // OPERATIONS
        { name: 'Reports', href: '/clinic/reports', icon: ListChecks, section: 'Operations' },
        { name: 'Health Alerts', href: '/clinic/health-alerts', icon: Radar, section: 'Operations' },

        // COMMUNICATION
        { name: 'Notifications', href: '/clinic/notifications', icon: Bell, section: 'Communication' },

        // SETTINGS
        { name: 'Settings', href: '/clinic/settings', icon: Settings, section: 'Settings' },
    ],
};

export default function ClinicLayout({ children }: { children: ReactNode }) {
    return <DashboardLayout config={CLINIC_CONFIG}>{children}</DashboardLayout>;
}
