/**
 * Canonical Role Matching and Portal Normalization Utility
 * Centralizes all role hierarchies and portal authorization mappings.
 */

export const PORTAL_ROLE_MAP: Record<string, string[]> = {
    doctor: ['doctor', 'doctor_pending'],
    clinic: ['clinic', 'clinic_owner', 'clinic_manager', 'clinic_staff'],
    pharmacy: ['pharmacy', 'pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff'],
    diagnostic_center: ['diagnostic_center', 'diagnostic_center_owner', 'diagnostic_manager', 'lab_technician'],
    hospital: ['hospital_owner', 'hospital_manager'],
    patient: ['patient'],
    wellness: ['wellness_coach', 'wellness'],
    wellness_coach: ['wellness_coach', 'wellness'],
    fitness_center: ['fitness_center_owner', 'fitness_trainer', 'fitness-center', 'gym'],
    fitness_center_owner: ['fitness_center_owner', 'fitness_trainer', 'fitness-center', 'gym'],
    admin: ['admin', 'super_admin'],
};

export function doesRoleMatchPortal(
    userRole: string | undefined | null,
    portalOrRoles: string | string[]
): boolean {
    if (!userRole) return false;
    const normalizedUserRole = String(userRole).toLowerCase().trim();

    const allowed = (Array.isArray(portalOrRoles) ? portalOrRoles.flat() : [portalOrRoles])
        .map((r) => String(r).toLowerCase().trim());

    for (const target of allowed) {
        if (target === normalizedUserRole) return true;
        if (PORTAL_ROLE_MAP[target]?.includes(normalizedUserRole)) return true;
        for (const group of Object.values(PORTAL_ROLE_MAP)) {
            if (group.includes(target) && group.includes(normalizedUserRole)) return true;
        }
    }
    return false;
}

/**
 * Validates whether a user's role matches the required portal.
 */
export function isRoleValidForPortal(
    role: string | undefined | null,
    portal: string
): boolean {
    return doesRoleMatchPortal(role, portal);
}

/**
 * Checks if the active session is an authenticated Patient.
 * Ensures provider roles (clinic_owner, doctor, hospital_owner, etc.)
 * are never treated as authenticated patients on the Patient Portal.
 */
export function isPatientAuthenticated(
    user: { role?: string } | null | undefined,
    isAuthenticated: boolean
): boolean {
    return Boolean(isAuthenticated && user?.role && String(user.role).toLowerCase().trim() === 'patient');
}

/**
 * Sanitizes redirect destination URLs to prevent Open Redirect vulnerabilities.
 * Ensures the target is a relative path and does not execute scripts or redirect to external hosts.
 */
export function getSafeRedirectUrl(
    redirectUrl: string | null | undefined,
    fallbackRoute: string
): string {
    if (!redirectUrl || typeof redirectUrl !== 'string') return fallbackRoute;
    const trimmed = redirectUrl.trim();
    if (!trimmed.startsWith('/')) return fallbackRoute;
    // Disallow protocol-relative URLs (//evil.com) or backslash evasion (/\evil.com, /\\evil.com)
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) return fallbackRoute;
    // Disallow scheme execution or embedded colons in the path
    const pathOnly = trimmed.split('?')[0].split('#')[0];
    if (pathOnly.includes(':')) return fallbackRoute;
    // Disallow redirecting back into auth loops
    if (pathOnly.startsWith('/login') || pathOnly.startsWith('/register') || pathOnly.startsWith('/reset-password')) {
        return fallbackRoute;
    }
    return trimmed;
}


