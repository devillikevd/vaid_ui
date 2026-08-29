import type { Department } from '@/stores/clinicStore';

/**
 * Normalizes text for case-insensitive, punctuation-resilient comparison.
 */
export function normalizeDeptName(name?: string | null): string {
    if (!name || typeof name !== 'string') return '';
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Maps medical specializations to canonical smart department suggestions.
 * Returns null if specialization is missing, generic, or unavailable.
 */
export function getSuggestedDepartment(specialization?: string | null): string | null {
    if (!specialization || typeof specialization !== 'string') return null;
    const clean = specialization.trim();
    if (!clean || clean.toLowerCase() === 'specialization not provided' || clean.toLowerCase() === 'general') {
        return null;
    }

    const lower = clean.toLowerCase();

    // ENT
    if (lower.includes('ent') || lower.includes('ear') || lower.includes('nose') || lower.includes('throat') || lower.includes('otolaryng')) {
        return 'ENT';
    }

    // General Medicine / OPD
    if (
        lower.includes('general physician') ||
        lower.includes('general medicine') ||
        lower.includes('internal medicine') ||
        lower.includes('family medicine') ||
        lower.includes('family physician') ||
        lower.includes('general practitioner') ||
        lower.includes('physician') ||
        lower === 'mbbs'
    ) {
        return 'General OPD';
    }

    // Cardiology
    if (lower.includes('cardio') || lower.includes('heart')) {
        return 'Cardiology';
    }

    // Dermatology
    if (lower.includes('derma') || lower.includes('skin')) {
        return 'Dermatology';
    }

    // Pediatrics
    if (lower.includes('pediatr') || lower.includes('paediatr') || lower.includes('child')) {
        return 'Pediatrics';
    }

    // Orthopedics
    if (lower.includes('ortho') || lower.includes('bone') || lower.includes('joint')) {
        return 'Orthopedics';
    }

    // Gynecology & Obstetrics
    if (lower.includes('gynec') || lower.includes('gynaec') || lower.includes('obstetr') || lower.includes('ob-gyn') || lower.includes('obgyn')) {
        return 'Gynecology & Obstetrics';
    }

    // Ophthalmology
    if (lower.includes('ophthalm') || lower.includes('eye')) {
        return 'Ophthalmology';
    }

    // Dentistry
    if (lower.includes('dent') || lower.includes('oral')) {
        return 'Dentistry';
    }

    // Psychiatry
    if (lower.includes('psych') || lower.includes('mental')) {
        return 'Psychiatry';
    }

    // Neurology
    if (lower.includes('neuro')) {
        return 'Neurology';
    }

    // Gastroenterology
    if (lower.includes('gastro') || lower.includes('digest')) {
        return 'Gastroenterology';
    }

    // Pulmonology
    if (lower.includes('pulmon') || lower.includes('chest') || lower.includes('respirat') || lower.includes('lung')) {
        return 'Pulmonology';
    }

    // Urology
    if (lower.includes('urolog') || lower.includes('nephro') || lower.includes('kidney')) {
        return 'Urology';
    }

    // Oncology
    if (lower.includes('oncolog') || lower.includes('cancer')) {
        return 'Oncology';
    }

    // Endocrinology
    if (lower.includes('endocrin') || lower.includes('diabetes') || lower.includes('thyroid')) {
        return 'Endocrinology';
    }

    // Ayurveda
    if (lower.includes('ayurved')) {
        return 'Ayurveda';
    }

    // Homeopathy
    if (lower.includes('homeopath') || lower.includes('homoeopath')) {
        return 'Homeopathy';
    }

    // Format any other specific specialization cleanly into Title Case (e.g. "Sports Medicine")
    return clean
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Finds an existing active department matching the suggested name.
 * Uses exact normalized match or semantic prefix/word match.
 */
export function findMatchingDepartment(
    suggestedName: string | null,
    departments: Department[]
): Department | null {
    if (!suggestedName || !departments || departments.length === 0) return null;

    const normalizedSuggested = normalizeDeptName(suggestedName);
    if (!normalizedSuggested) return null;

    // 1. Exact normalized match
    for (const dept of departments) {
        if (!dept.is_active) continue;
        if (normalizeDeptName(dept.name) === normalizedSuggested) {
            return dept;
        }
    }

    // 2. Contains match (e.g. "ENT" in "ENT & Head Neck" or "General OPD" in "General OPD & Day Care")
    for (const dept of departments) {
        if (!dept.is_active) continue;
        const normDept = normalizeDeptName(dept.name);
        if (normDept.includes(normalizedSuggested) || normalizedSuggested.includes(normDept)) {
            return dept;
        }
    }

    return null;
}
