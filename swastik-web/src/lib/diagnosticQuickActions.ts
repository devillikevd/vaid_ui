import {
    PlusCircle,
    FlaskConical,
    FileText,
    Truck,
    Shield,
    ClipboardList,
    Users,
    Activity,
    UserPlus,
    Star,
    Film,
    Building2,
    type LucideIcon
} from 'lucide-react';

export interface DiagnosticQuickActionDef {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    href: string;
    isPrimary?: boolean;
    category: string;
}

export interface QuickActionConfigItem {
    id: string;
    enabled: boolean;
}

// Complete catalog of supported Diagnostic Center quick actions
export const DIAGNOSTIC_ACTIONS_CATALOG: DiagnosticQuickActionDef[] = [
    {
        id: 'new_booking',
        label: 'New Booking',
        description: 'Book a walk-in or home collection test',
        icon: PlusCircle,
        href: '/diagnostic-center/bookings/new',
        isPrimary: true,
        category: 'Bookings',
    },
    {
        id: 'tests',
        label: 'Add Test',
        description: 'Create and price lab tests in test catalog',
        icon: FlaskConical,
        href: '/diagnostic-center/tests',
        category: 'Tests',
    },
    {
        id: 'results',
        label: 'Results',
        description: 'Upload lab findings & deliver reports',
        icon: FileText,
        href: '/diagnostic-center/results',
        category: 'Diagnostics',
    },
    {
        id: 'logistics',
        label: 'Logistics',
        description: 'Manage home collection & fleet dispatch',
        icon: Truck,
        href: '/diagnostic-center/agents',
        category: 'Operations',
    },
    {
        id: 'partners',
        label: 'Partners',
        description: 'Collaborate with clinics & care networks',
        icon: Shield,
        href: '/diagnostic-center/partnerships',
        category: 'Network',
    },
    {
        id: 'work_queue',
        label: 'Work Queue',
        description: 'Technician test processing workflow',
        icon: ClipboardList,
        href: '/diagnostic-center/work-queue',
        category: 'Operations',
    },
    {
        id: 'patients',
        label: 'Patients',
        description: 'View patient records & test histories',
        icon: Users,
        href: '/diagnostic-center/patients',
        category: 'Patients',
    },
    {
        id: 'reports',
        label: 'Reports',
        description: 'View analytics, volume & revenue reports',
        icon: Activity,
        href: '/diagnostic-center/reports',
        category: 'Analytics',
    },
    {
        id: 'staff',
        label: 'Staff',
        description: 'Manage center staff, technicians & roles',
        icon: UserPlus,
        href: '/diagnostic-center/staff',
        category: 'Team',
    },
    {
        id: 'reviews',
        label: 'Reviews',
        description: 'View patient ratings & reply to feedback',
        icon: Star,
        href: '/diagnostic-center/reviews',
        category: 'Feedback',
    },
    {
        id: 'reels',
        label: 'Health Reels',
        description: 'Promotional medical health video reels',
        icon: Film,
        href: '/diagnostic-center/reels',
        category: 'Marketing',
    },
    {
        id: 'settings',
        label: 'Settings',
        description: 'Facility configuration & profile setup',
        icon: Building2,
        href: '/diagnostic-center/settings',
        category: 'Management',
    },
];

// Default configuration with original 5 actions enabled in sequence
export const DEFAULT_DIAGNOSTIC_ACTION_CONFIG: QuickActionConfigItem[] = [
    { id: 'new_booking', enabled: true },
    { id: 'tests', enabled: true },
    { id: 'results', enabled: true },
    { id: 'logistics', enabled: true },
    { id: 'partners', enabled: true },
    { id: 'work_queue', enabled: false },
    { id: 'patients', enabled: false },
    { id: 'reports', enabled: false },
    { id: 'staff', enabled: false },
    { id: 'reviews', enabled: false },
    { id: 'reels', enabled: false },
    { id: 'settings', enabled: false },
];

const STORAGE_KEY_PREFIX = 'swastik:diagnostic-quick-actions';

function getStorageKey(userId?: string): string {
    return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

/**
 * Normalizes any stored config to ensure all catalog items are represented,
 * invalid IDs are cleaned up, and order + enabled states are preserved.
 */
export function normalizeDiagnosticActionConfig(raw: unknown): QuickActionConfigItem[] {
    const catalogIds = new Set(DIAGNOSTIC_ACTIONS_CATALOG.map((a) => a.id));
    const result: QuickActionConfigItem[] = [];
    const seen = new Set<string>();

    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (typeof item === 'string' && catalogIds.has(item) && !seen.has(item)) {
                result.push({ id: item, enabled: true });
                seen.add(item);
            } else if (item && typeof item === 'object' && 'id' in item) {
                const id = String((item as { id: unknown }).id);
                const enabled = (item as { enabled?: unknown }).enabled !== false;
                if (catalogIds.has(id) && !seen.has(id)) {
                    result.push({ id, enabled });
                    seen.add(id);
                }
            }
        }
    }

    // Append any missing catalog actions from default template
    for (const def of DEFAULT_DIAGNOSTIC_ACTION_CONFIG) {
        if (!seen.has(def.id)) {
            result.push({ ...def });
            seen.add(def.id);
        }
    }

    return result;
}

/**
 * Loads diagnostic quick actions config for the user from localStorage.
 */
export function loadDiagnosticQuickActions(userId?: string): QuickActionConfigItem[] {
    if (typeof window === 'undefined') {
        return [...DEFAULT_DIAGNOSTIC_ACTION_CONFIG];
    }

    try {
        const stored = localStorage.getItem(getStorageKey(userId));
        if (stored) {
            const parsed = JSON.parse(stored);
            return normalizeDiagnosticActionConfig(parsed);
        }
        return [...DEFAULT_DIAGNOSTIC_ACTION_CONFIG];
    } catch {
        return [...DEFAULT_DIAGNOSTIC_ACTION_CONFIG];
    }
}

/**
 * Saves diagnostic quick actions config for the user to localStorage.
 */
export function saveDiagnosticQuickActions(
    userId: string | undefined,
    config: QuickActionConfigItem[]
): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const normalized = normalizeDiagnosticActionConfig(config);
        localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
        return true;
    } catch {
        return false;
    }
}
