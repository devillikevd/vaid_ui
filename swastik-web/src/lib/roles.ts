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
