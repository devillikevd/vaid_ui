'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import {
    Building2,
    Users,
    Calendar,
    AlertTriangle,
    BarChart3,
    Settings,
    Stethoscope,
    UserCog,
    Pill,
    Microscope,
    Radar,
    Ambulance,
    Star,
    Network,
    MessageCircle,
    BedDouble,
    Activity,
    ListOrdered,
    TestTube,
    ScanLine,
    Scissors,
    HeartPulse,
    IndianRupee,
    ShieldCheck,
    ClipboardList,
    Gauge,
    Share2,
} from 'lucide-react';
import DashboardLayout, { type DashboardConfig, type NavItem } from '@/components/shared/DashboardLayout';
import { hospitalApi } from '@/lib/api';

const ALL_NAV_ITEMS: NavItem[] = [
    // ── Overview ──
    { name: 'Control Tower', href: '/hospital', icon: Gauge, section: 'Overview' },

    // ── Patient Care ──
    { name: 'Appointments', href: '/hospital/appointments', icon: Calendar, section: 'Patient Care' },
    { name: 'Consultations', href: '/hospital/consultations', icon: Stethoscope, section: 'Patient Care' },
    { name: 'OPD Queue', href: '/hospital/queue', icon: ListOrdered, section: 'Patient Care' },
    { name: 'IPD Management', href: '/hospital/ipd', icon: BedDouble, section: 'Patient Care' },
    { name: 'Encounters', href: '/hospital/encounters', icon: ClipboardList, section: 'Patient Care' },

    // ── Clinical Operations ──
    { name: 'Doctors', href: '/hospital/doctors', icon: Users, section: 'Clinical Operations' },
    { name: 'Departments', href: '/hospital/departments', icon: Building2, section: 'Clinical Operations' },
    { name: 'Nursing Station', href: '/hospital/nursing', icon: HeartPulse, section: 'Clinical Operations' },
    { name: 'OT Scheduling', href: '/hospital/ot', icon: Scissors, section: 'Clinical Operations' },
    { name: 'Laboratory', href: '/hospital/lab-orders', icon: TestTube, section: 'Clinical Operations' },
    { name: 'Radiology', href: '/hospital/radiology-orders', icon: ScanLine, section: 'Clinical Operations' },
    { name: 'In-House Pharmacy', href: '/hospital/inhouse-pharmacy', icon: Pill, section: 'Clinical Operations' },

    // ── Hospital Operations ──
    { name: 'Bed Management', href: '/hospital/beds', icon: Activity, section: 'Hospital Operations' },
    { name: 'Service Catalog', href: '/hospital/services', icon: IndianRupee, section: 'Hospital Operations' },
    { name: 'Ambulances', href: '/hospital/ambulances', icon: Ambulance, section: 'Hospital Operations' },
    { name: 'Emergency', href: '/hospital/emergency', icon: AlertTriangle, section: 'Hospital Operations' },

    // ── Finance & Revenue ──
    { name: 'Billing', href: '/hospital/billing', icon: IndianRupee, section: 'Finance & Revenue' },
    { name: 'Reports & Revenue', href: '/hospital/reports', icon: BarChart3, section: 'Finance & Revenue' },

    // ── Quality & Compliance ──
    { name: 'Quality', href: '/hospital/quality', icon: ShieldCheck, section: 'Quality & Compliance' },
    { name: 'Health Alerts', href: '/hospital/health-alerts', icon: Radar, section: 'Quality & Compliance' },

    // ── Network ──
    { name: 'Partnerships', href: '/hospital/partnerships', icon: Network, section: 'Network' },
    { name: 'Referrals', href: '/hospital/referrals', icon: Share2, section: 'Network' },
    { name: 'Pharmacies', href: '/hospital/pharmacies', icon: Pill, section: 'Network' },
    { name: 'Diagnostic Centers', href: '/hospital/diagnostic-centers', icon: Microscope, section: 'Network' },

    // ── Administration ──
    { name: 'Managers', href: '/hospital/managers', icon: UserCog, section: 'Administration' },
    { name: 'Settings', href: '/hospital/settings', icon: Settings, section: 'Administration' },

    // ── Community ──
    { name: 'Community Q&A', href: '/hospital/community', icon: MessageCircle, section: 'Community' },
    { name: 'Reviews', href: '/hospital/reviews', icon: Star, section: 'Community' },
    { name: 'Reels', href: '/hospital/reels', icon: Star, section: 'Community' },
];

const ROLE_ALLOWED_HREFS: Record<string, string[]> = {
    receptionist: [
        '/hospital',
        '/hospital/queue',
        '/hospital/appointments',
        '/hospital/consultations',
        '/hospital/ipd',
        '/hospital/departments',
        '/hospital/doctors',
        '/hospital/encounters',
    ],
    nurse: [
        '/hospital',
        '/hospital/nursing',
        '/hospital/beds',
        '/hospital/ipd',
        '/hospital/emergency',
        '/hospital/queue',
    ],
    doctor: [
        '/hospital',
        '/hospital/appointments',
        '/hospital/consultations',
        '/hospital/queue',
        '/hospital/ipd',
        '/hospital/ot',
        '/hospital/lab-orders',
        '/hospital/radiology-orders',
        '/hospital/nursing',
        '/hospital/departments',
    ],
    pharmacist: [
        '/hospital',
        '/hospital/inhouse-pharmacy',
        '/hospital/pharmacies',
        '/hospital/reports',
    ],
    lab_technician: [
        '/hospital',
        '/hospital/lab-orders',
        '/hospital/reports',
    ],
    radiologist: [
        '/hospital',
        '/hospital/radiology-orders',
        '/hospital/reports',
    ],
    billing_cashier: [
        '/hospital',
        '/hospital/billing',
        '/hospital/services',
        '/hospital/encounters',
        '/hospital/reports',
    ],
    tpa_officer: [
        '/hospital',
        '/hospital/billing',
        '/hospital/services',
        '/hospital/ipd',
        '/hospital/reports',
    ],
    ot_coordinator: [
        '/hospital',
        '/hospital/ot',
        '/hospital/doctors',
        '/hospital/ipd',
    ],
};

const ROLE_SUBTITLES: Record<string, string> = {
    receptionist: 'Reception Desk',
    nurse: 'Nursing Station',
    doctor: 'Clinical Desk',
    pharmacist: 'In-House Pharmacy Desk',
    lab_technician: 'Pathology Lab Desk',
    radiologist: 'Radiology Desk',
    billing_cashier: 'Billing & Cashier Counter',
    tpa_officer: 'TPA & Insurance Desk',
    ot_coordinator: 'OT Scheduling Desk',
    hospital_admin: 'Operations Hub',
    hospital_owner: 'Operations Hub',
    hospital_manager: 'Operations Hub',
};

export default function HospitalLayout({ children }: { children: ReactNode }) {
    const [staffRole, setStaffRole] = useState<string>('hospital_owner');

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await hospitalApi.getMyStaffRole();
                if (res.success && res.staffRole) {
                    setStaffRole(String(res.staffRole));
                }
            } catch (e) {
                console.error('Failed to fetch staff role context', e);
            }
        };
        fetchRole();
    }, []);

    const filteredNavItems = useMemo(() => {
        const allowedHrefs = ROLE_ALLOWED_HREFS[staffRole];
        if (!allowedHrefs) {
            return ALL_NAV_ITEMS; // Full access for owner / admin
        }
        return ALL_NAV_ITEMS.filter((item) => allowedHrefs.includes(item.href));
    }, [staffRole]);

    const portalSubtitle = ROLE_SUBTITLES[staffRole] || 'Operations Hub';

    const config: DashboardConfig = useMemo(() => ({
        role: ['hospital_owner', 'hospital_manager'],
        loginPath: '/login/hospital',
        portalTitle: 'Hospital Portal',
        portalSubtitle,
        portalIcon: Building2,
        theme: { color: 'teal', dataTheme: 'hospital' },
        showApprovalBanner: true,
        showFullDropdown: false,
        settingsHref: '/hospital/settings',
        userDisplayName: 'Hospital',
        navItems: filteredNavItems,
    }), [filteredNavItems, portalSubtitle]);

    return <DashboardLayout config={config}>{children}</DashboardLayout>;
}
