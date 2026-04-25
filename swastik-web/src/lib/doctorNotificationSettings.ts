import { doctorApi } from '@/lib/api';

export interface DoctorNotificationSettings {
    emailNotifications: boolean;
    smsNotifications: boolean;
}

const STORAGE_KEY_PREFIX = 'swastik:doctor-notification-settings';

const DEFAULT_SETTINGS: DoctorNotificationSettings = {
    emailNotifications: true,
    smsNotifications: true,
};

const SERVER_SETTINGS_ENABLED = process.env.NEXT_PUBLIC_DOCTOR_NOTIFICATION_SETTINGS_API === 'true';

function getStorageKey(userId?: string) {
    return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

function normalizeSettings(raw: Record<string, unknown> | null | undefined): DoctorNotificationSettings {
    const emailNotifications = raw?.emailNotifications ?? raw?.['email_notifications'];
    const smsNotifications = raw?.smsNotifications ?? raw?.['sms_notifications'];

    return {
        emailNotifications: typeof emailNotifications === 'boolean' ? emailNotifications : DEFAULT_SETTINGS.emailNotifications,
        smsNotifications: typeof smsNotifications === 'boolean' ? smsNotifications : DEFAULT_SETTINGS.smsNotifications,
    };
}

function isMissingEndpoint(error?: string) {
    const normalized = error?.toLowerCase() || '';
    return normalized.includes('not found') || normalized.includes('404') || normalized.includes('method not allowed');
}

function readLocalSettings(userId?: string): DoctorNotificationSettings {
    if (typeof window === 'undefined') {
        return { ...DEFAULT_SETTINGS };
    }

    try {
        const raw = localStorage.getItem(getStorageKey(userId));
        if (!raw) return { ...DEFAULT_SETTINGS };
        return normalizeSettings(JSON.parse(raw) as Record<string, unknown>);
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function persistLocalSettings(userId: string | undefined, settings: DoctorNotificationSettings) {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
}

export async function loadDoctorNotificationSettings(userId?: string) {
    if (!SERVER_SETTINGS_ENABLED) {
        return {
            success: true as const,
            settings: readLocalSettings(userId),
            source: 'local' as const,
            message: 'Notification settings are stored locally in this browser until the server endpoint is available.',
        };
    }

    const response = await doctorApi.getNotificationSettings();

    if (response.success) {
        const settings = normalizeSettings(response.data as Record<string, unknown>);
        persistLocalSettings(userId, settings);
        return { success: true as const, settings, source: 'server' as const };
    }

    if (isMissingEndpoint(response.error)) {
        return {
            success: true as const,
            settings: readLocalSettings(userId),
            source: 'local' as const,
            message: 'Notification settings are stored locally in this browser until the server endpoint is available.',
        };
    }

    return {
        success: false as const,
        error: response.error || 'Failed to load notification settings.',
    };
}

export async function saveDoctorNotificationSettings(userId: string | undefined, settings: DoctorNotificationSettings) {
    const normalizedSettings = normalizeSettings(settings as unknown as Record<string, unknown>);

    if (!SERVER_SETTINGS_ENABLED) {
        persistLocalSettings(userId, normalizedSettings);
        return {
            success: true as const,
            settings: normalizedSettings,
            source: 'local' as const,
            message: 'Notification settings are saved locally in this browser until the server endpoint is available.',
        };
    }

    const response = await doctorApi.updateNotificationSettings(normalizedSettings);

    if (response.success) {
        persistLocalSettings(userId, normalizedSettings);
        return {
            success: true as const,
            settings: normalizedSettings,
            source: 'server' as const,
            message: response.message,
        };
    }

    if (isMissingEndpoint(response.error)) {
        persistLocalSettings(userId, normalizedSettings);
        return {
            success: true as const,
            settings: normalizedSettings,
            source: 'local' as const,
            message: 'Notification settings are saved locally in this browser until the server endpoint is available.',
        };
    }

    return {
        success: false as const,
        error: response.error || 'Failed to update notification settings.',
    };
}
