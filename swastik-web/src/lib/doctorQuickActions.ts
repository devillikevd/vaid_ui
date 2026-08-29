import {
    UserPlus,
    PenLine,
    User,
    Calendar,
    Share2,
    QrCode,
    Video,
    TrendingUp,
    Settings,
    type LucideIcon
} from 'lucide-react';

export interface QuickActionDef {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    href?: string;
    isButton?: boolean;
    color: 'emerald' | 'blue' | 'yellow' | 'purple' | 'cyan' | 'indigo' | 'gray';
    isLocked?: boolean;
}

// 1. Two permanent / locked actions that are ALWAYS fixed on the dashboard
export const LOCKED_TOP_ACTION: QuickActionDef = {
    id: 'record_visit',
    label: 'Record Direct / Walk-in Visit',
    description: 'Directly register, consult and prescribe a walk-in patient',
    icon: UserPlus,
    isButton: true,
    color: 'emerald',
    isLocked: true,
};

export const LOCKED_BOTTOM_ACTION: QuickActionDef = {
    id: 'scan_patient_qr',
    label: 'Scan Patient QR Code',
    description: 'Instant patient check-in via digital health QR card',
    icon: QrCode,
    href: '/doctor/scan-patient',
    color: 'emerald',
    isLocked: true,
};

export const LOCKED_ACTION_IDS = ['record_visit', 'scan_patient_qr'] as const;

// 2. Canonical pool of customizable actions (exactly 4 must be selected)
export const CUSTOMIZABLE_ACTIONS_POOL: QuickActionDef[] = [
    {
        id: 'new_prescription',
        label: 'New Prescription',
        description: 'Create a digital prescription with Rx, lab tests and advice',
        icon: PenLine,
        href: '/doctor/prescriptions/new',
        color: 'emerald',
    },
    {
        id: 'patients',
        label: 'Patients',
        description: 'View patient directory, medical histories and vitals',
        icon: User,
        href: '/doctor/patients',
        color: 'blue',
    },
    {
        id: 'schedule',
        label: 'Schedule',
        description: 'Manage OPD hours, video slots and weekly availability',
        icon: Calendar,
        href: '/doctor/schedule',
        color: 'yellow',
    },
    {
        id: 'referrals',
        label: 'Referrals',
        description: 'Track incoming and outgoing patient medical referrals',
        icon: Share2,
        href: '/doctor/referrals',
        color: 'purple',
    },
    {
        id: 'consultations',
        label: 'Consultations',
        description: 'Active video calls, queue status and consultation sessions',
        icon: Video,
        href: '/doctor/consultations',
        color: 'cyan',
    },
    {
        id: 'analytics',
        label: 'Earnings & Analytics',
        description: 'Review monthly earnings, appointment trends and metrics',
        icon: TrendingUp,
        href: '/doctor/analytics',
        color: 'indigo',
    },
    {
        id: 'settings',
        label: 'Settings & Profile',
        description: 'Manage clinic preferences, fees, and verification info',
        icon: Settings,
        href: '/doctor/settings',
        color: 'gray',
    },
];

export const EXACT_CUSTOMIZABLE_COUNT = 4;
export const TOTAL_QUICK_ACTIONS_COUNT = 6;

// Default 4 customizable actions for new / uncustomized doctors
export const DEFAULT_CUSTOMIZABLE_ACTION_IDS: string[] = [
    'new_prescription',
    'patients',
    'schedule',
    'referrals',
];

const STORAGE_KEY_PREFIX = 'swastik:doctor-custom-quick-actions';
const LEGACY_STORAGE_KEY_PREFIX = 'swastik:doctor-quick-actions';

function getStorageKey(userId?: string): string {
    return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

function getLegacyStorageKey(userId?: string): string {
    return userId ? `${LEGACY_STORAGE_KEY_PREFIX}:${userId}` : LEGACY_STORAGE_KEY_PREFIX;
}

/**
 * Normalizes any raw array of action IDs or preference objects into
 * an array of EXACTLY 4 unique valid customizable action IDs.
 */
export function normalizeCustomizableActions(raw: unknown): string[] {
    const validPoolIds = new Set(CUSTOMIZABLE_ACTIONS_POOL.map(a => a.id));
    const lockedSet = new Set<string>(LOCKED_ACTION_IDS);
    const result: string[] = [];
    const seen = new Set<string>();

    if (Array.isArray(raw)) {
        for (const item of raw) {
            let id = '';
            if (typeof item === 'string') {
                id = item;
            } else if (item && typeof item === 'object' && 'id' in item) {
                // If it came from legacy toggle object format, check enabled flag
                if ('enabled' in item && !item.enabled) continue;
                id = String((item as { id: unknown }).id);
            }

            // Exclude locked actions and invalid IDs
            if (id && validPoolIds.has(id) && !lockedSet.has(id) && !seen.has(id)) {
                result.push(id);
                seen.add(id);
                if (result.length === EXACT_CUSTOMIZABLE_COUNT) break;
            }
        }
    }

    // Fill missing slots from default list if fewer than 4 valid actions
    if (result.length < EXACT_CUSTOMIZABLE_COUNT) {
        for (const defaultId of DEFAULT_CUSTOMIZABLE_ACTION_IDS) {
            if (!seen.has(defaultId)) {
                result.push(defaultId);
                seen.add(defaultId);
                if (result.length === EXACT_CUSTOMIZABLE_COUNT) break;
            }
        }
    }

    return result.slice(0, EXACT_CUSTOMIZABLE_COUNT);
}

/**
 * Loads doctor's saved customizable action IDs with automatic legacy migration.
 * Guaranteed to return exactly 4 unique valid IDs.
 */
export function loadDoctorCustomizableActions(userId?: string): string[] {
    if (typeof window === 'undefined') {
        return [...DEFAULT_CUSTOMIZABLE_ACTION_IDS];
    }

    try {
        // 1. Try current storage key
        const currentRaw = localStorage.getItem(getStorageKey(userId));
        if (currentRaw) {
            const parsed = JSON.parse(currentRaw);
            return normalizeCustomizableActions(parsed);
        }

        // 2. Try legacy storage key migration
        const legacyRaw = localStorage.getItem(getLegacyStorageKey(userId));
        if (legacyRaw) {
            const parsedLegacy = JSON.parse(legacyRaw);
            const normalized = normalizeCustomizableActions(parsedLegacy);
            // Save to new format
            localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
            return normalized;
        }

        return [...DEFAULT_CUSTOMIZABLE_ACTION_IDS];
    } catch {
        return [...DEFAULT_CUSTOMIZABLE_ACTION_IDS];
    }
}

/**
 * Saves doctor's 4 selected customizable action IDs.
 */
export function saveDoctorCustomizableActions(userId: string | undefined, actionIds: string[]): boolean {
    if (typeof window === 'undefined') return false;

    const normalized = normalizeCustomizableActions(actionIds);
    if (normalized.length !== EXACT_CUSTOMIZABLE_COUNT) {
        return false;
    }

    try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
        return true;
    } catch {
        return false;
    }
}
