/**
 * Clinical Dimensions: Source vs Visit Type
 * 
 * Source: WHERE did the patient / consultation originate?
 * - vaididea: Vaididea Platform (App, Web, Network Referrals)
 * - direct: Direct Practice (Walk-in, Phone, Home Visit outside Vaididea)
 * 
 * Visit Type: HOW did the consultation happen?
 * - video_consultation: Video / Teleconsultation / Online
 * - in_person_clinic: Scheduled In-Person Clinic Visit (Vaididea or booked clinic)
 * - walk_in_clinic: Unscheduled Walk-in Clinic Visit
 * - phone_consultation: Direct Phone Consultation
 * - home_visit: Direct Home Visit
 */

export type CanonicalSource = 'vaididea' | 'direct';
export type PatientSourceSummary = 'vaididea' | 'direct' | 'mixed';

export type CanonicalVisitType = 
  | 'video_consultation'
  | 'in_person_clinic'
  | 'walk_in_clinic'
  | 'phone_consultation'
  | 'home_visit';

export interface SourceOption {
  value: 'all' | CanonicalSource | 'mixed';
  label: string;
}

export interface VisitTypeOption {
  value: 'all' | CanonicalVisitType;
  label: string;
}

export const SOURCE_FILTER_OPTIONS: SourceOption[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'vaididea', label: 'Vaididea' },
  { value: 'direct', label: 'Direct Practice' },
  { value: 'mixed', label: 'Direct + Vaididea' },
];

export const VISIT_TYPE_FILTER_OPTIONS: VisitTypeOption[] = [
  { value: 'all', label: 'All Visit Types' },
  { value: 'video_consultation', label: 'Video Consultation' },
  { value: 'in_person_clinic', label: 'In-Person Clinic' },
  { value: 'walk_in_clinic', label: 'Walk-in Clinic' },
  { value: 'phone_consultation', label: 'Phone Consultation' },
  { value: 'home_visit', label: 'Home Visit' },
];

/**
 * Resolves the Canonical Source of an appointment, consultation or prescription
 */
export function resolveCanonicalSource(record: any): CanonicalSource {
  if (!record) return 'vaididea';

  const payRef = String(record?.payment_reference || record?.paymentReference || '').toUpperCase();
  const reason = String(record?.reason_for_visit || record?.reasonForVisit || record?.reason || '').toLowerCase();
  const rawSource = String(record?.source || '').toLowerCase();
  const notes = String(record?.doctor_notes || record?.notes || '').toLowerCase();

  if (rawSource === 'direct' || rawSource === 'direct_practice' || rawSource === 'direct_walk_in' || rawSource === 'direct_phone' || rawSource === 'walk_in' || rawSource === 'offline') {
    return 'direct';
  }

  if (
    payRef.startsWith('DIRECT_') ||
    payRef === 'WAIVED' ||
    payRef.includes('DIRECT_CASH') ||
    payRef.includes('DIRECT_UPI') ||
    payRef.includes('DIRECT_PHONE') ||
    payRef.includes('DIRECT_WALK_IN') ||
    payRef.includes('DIRECT_CARD')
  ) {
    return 'direct';
  }

  if (
    reason.includes('direct walk-in') ||
    reason.includes('direct practice') ||
    reason.includes('direct consultation') ||
    reason.includes('direct phone') ||
    reason.includes('outside vaididea')
  ) {
    return 'direct';
  }

  return 'vaididea';
}

/**
 * Resolves the Canonical Visit Type of an appointment, consultation or prescription
 */
export function resolveCanonicalVisitType(record: any): CanonicalVisitType {
  if (!record) return 'in_person_clinic';

  const rawType = String(record?.type || record?.visit_type || record?.visitType || record?.consultation_mode || '').toLowerCase();
  const rawSource = String(record?.source || '').toLowerCase();
  const reason = String(record?.reason_for_visit || record?.reasonForVisit || record?.reason || '').toLowerCase();
  const payRef = String(record?.payment_reference || record?.paymentReference || '').toUpperCase();

  // Video / Online
  if (
    rawType === 'video' ||
    rawType === 'video_consultation' ||
    rawType === 'online' ||
    rawType === 'teleconsultation'
  ) {
    return 'video_consultation';
  }

  // Home Visit
  if (
    rawType === 'home_visit' ||
    rawType === 'home' ||
    rawSource === 'direct_home_visit' ||
    reason.includes('home visit')
  ) {
    return 'home_visit';
  }

  // Phone Consultation
  if (
    rawType === 'phone' ||
    rawType === 'phone_consultation' ||
    rawType === 'direct_appointment' ||
    rawSource === 'direct_phone' ||
    payRef.includes('DIRECT_PHONE') ||
    reason.includes('phone')
  ) {
    return 'phone_consultation';
  }

  // Walk-in Clinic
  if (
    rawType === 'walk_in' ||
    rawType === 'walk_in_clinic' ||
    rawSource === 'direct_walk_in' ||
    payRef.includes('DIRECT_WALK_IN') ||
    reason.includes('walk-in') ||
    reason.includes('walk in')
  ) {
    return 'walk_in_clinic';
  }

  // In-Person Clinic (Scheduled Clinic Consultation, Vaididea Clinic, etc.)
  return 'in_person_clinic';
}

export function getSourceDisplay(source: CanonicalSource | PatientSourceSummary | string | undefined): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const s = String(source || 'vaididea').toLowerCase();

  if (s === 'direct' || s === 'direct_practice') {
    return {
      label: 'Direct Practice',
      badgeClass: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-sm',
      dotClass: 'bg-blue-500',
    };
  }

  if (s === 'mixed' || s === 'direct_and_vaididea' || s === 'direct + vaididea') {
    return {
      label: 'Direct + Vaididea',
      badgeClass: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-sm',
      dotClass: 'bg-purple-500',
    };
  }

  return {
    label: 'Vaididea',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shadow-sm',
    dotClass: 'bg-emerald-500',
  };
}

export function getVisitTypeDisplay(visitType: CanonicalVisitType | string | undefined): {
  label: string;
  badgeClass: string;
} {
  const v = String(visitType || 'in_person_clinic').toLowerCase();

  switch (v) {
    case 'video_consultation':
    case 'video':
      return {
        label: 'Video Consultation',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      };
    case 'walk_in_clinic':
    case 'walk_in':
      return {
        label: 'Walk-in Clinic',
        badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      };
    case 'phone_consultation':
    case 'phone':
      return {
        label: 'Phone Consultation',
        badgeClass: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
      };
    case 'home_visit':
      return {
        label: 'Home Visit',
        badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      };
    case 'in_person_clinic':
    case 'clinic':
    default:
      return {
        label: 'In-Person Clinic',
        badgeClass: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
      };
  }
}
