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
    { name: 'Control Tower', href: '/hospital', icon: Gauge },
    { name: 'Departments', href: '/hospital/departments', icon: Building2 },
    { name: 'Doctors', href: '/hospital/doctors', icon: Users },
    { name: 'Appointments', href: '/hospital/appointments', icon: Calendar },
    { name: 'Consultations', href: '/hospital/consultations', icon: Stethoscope },
    // ── Clinical Operations ──
    { name: 'IPD Management', href: '/hospital/ipd', icon: BedDouble, section: 'Clinical' },
    { name: 'Bed Management', href: '/hospital/beds', icon: Activity },
    { name: 'OPD Queue', href: '/hospital/queue', icon: ListOrdered },
    { name: 'OT Scheduling', href: '/hospital/ot', icon: Scissors },
    { name: 'In-House Pharmacy', href: '/hospital/inhouse-pharmacy', icon: Pill },
    { name: 'Lab Orders', href: '/hospital/lab-orders', icon: TestTube },
    { name: 'Radiology', href: '/hospital/radiology-orders', icon: ScanLine },
    { name: 'Nursing Station', href: '/hospital/nursing', icon: HeartPulse },
    // ── Administration ──
    { name: 'Encounters', href: '/hospital/encounters', icon: ClipboardList, section: 'Administration' },
    { name: 'Service Catalog', href: '/hospital/services', icon: IndianRupee },
    { name: 'Billing', href: '/hospital/billing', icon: IndianRupee },
    { name: 'Quality', href: '/hospital/quality', icon: ShieldCheck },
    // ── Partnerships ──
    { name: 'Partnerships', href: '/hospital/partnerships', icon: Network, section: 'Partners' },
    { name: 'Referrals', href: '/hospital/referrals', icon: Share2 },
    { name: 'Pharmacies', href: '/hospital/pharmacies', icon: Pill },
    { name: 'Diagnostics', href: '/hospital/diagnostic-centers', icon: Microscope },
    // ── Other ──
    { name: 'Emergency', href: '/hospital/emergency', icon: AlertTriangle, section: 'Other' },
    { name: 'Ambulances', href: '/hospital/ambulances', icon: Ambulance },
    { name: 'Managers', href: '/hospital/managers', icon: UserCog },
    { name: 'Reports', href: '/hospital/reports', icon: BarChart3 },
    { name: 'Health Alerts', href: '/hospital/health-alerts', icon: Radar },
    { name: 'Community Q&A', href: '/hospital/community', icon: MessageCircle },
    { name: 'Reviews', href: '/hospital/reviews', icon: Star },
    { name: 'Reels', href: '/hospital/reels', icon: Star },
    { name: 'Settings', href: '/hospital/settings', icon: Settings },
];

const ROLE_ALLOWED_HREFS: Record<string, string[]> = {
    receptionist: [
        '/hospital/queue',
        '/hospital/appointments',
        '/hospital/ipd',
        '/hospital/departments',
        '/hospital/consultations',
    ],
    nurse: [
        '/hospital/nursing',
        '/hospital/beds',
        '/hospital/ipd',
        '/hospital/emergency',
    ],
    pharmacist: [
        '/hospital/inhouse-pharmacy',
        '/hospital/pharmacies',
        '/hospital/reports',
    ],
    lab_technician: [
        '/hospital/lab-orders',
        '/hospital/reports',
    ],
    radiologist: [
        '/hospital/radiology-orders',
        '/hospital/reports',
    ],
    billing_cashier: [
        '/hospital/billing',
        '/hospital/services',
        '/hospital/encounters',
        '/hospital/reports',
    ],
    tpa_officer: [
        '/hospital/billing',
        '/hospital/services',
        '/hospital/ipd',
        '/hospital/reports',
    ],
    ot_coordinator: [
        '/hospital/ot',
        '/hospital/doctors',
        '/hospital/ipd',
    ],
};

const ROLE_SUBTITLES: Record<string, string> = {
    receptionist: 'Reception Desk',
    nurse: 'Nursing Station',
    pharmacist: 'In-House Pharmacy Desk',
    lab_technician: 'Pathology Lab Desk',
    radiologist: 'Radiology Desk',
    billing_cashier: 'Billing & Cashier Counter',
    tpa_officer: 'TPA & Insurance Desk',
    ot_coordinator: 'OT Scheduling Desk',
    hospital_admin: 'Operations Hub',
    hospital_owner: 'Operations Hub',
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
