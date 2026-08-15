export interface ClinicProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
    websiteUrl: string;
    establishedYear: string;
    description: string;
    facilities: string[];
    specializations: string[];
    accreditations: string[];
    insuranceAccepted: string[];
    registrationNumber: string;
    licenseNumber: string;
    licenseDocumentUrl: string;
    profileImageUrl: string | null;
    galleryUrls: string[];
    virtualTourUrl: string;
    is24Hours: boolean;
    approvalStatus: string;
    approvalNotes: string | null;
    approvedAt: string | null;
    updatedAt: string | null;
    createdAt: string | null;
    rating: number | null;
    totalReviews: number;
}

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item));
        } catch {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
};

export function normalizeClinicProfile(data: Record<string, unknown> | null | undefined): ClinicProfile | null {
    if (!data || typeof data !== 'object') return null;
    const p = data;
    const approvalStatus = String(p.approval_status || 'pending');

    return {
        id: String(p.id || ''),
        name: String(p.name || ''),
        email: String(p.email || ''),
        phone: String(p.phone || ''),
        address: String(p.address || ''),
        city: String(p.city || ''),
        state: String(p.state || ''),
        pincode: String(p.pincode || ''),
        latitude: typeof p.latitude === 'number' ? p.latitude : null,
        longitude: typeof p.longitude === 'number' ? p.longitude : null,
        websiteUrl: String(p.website_url || ''),
        establishedYear: p.established_year ? String(p.established_year) : '',
        description: String(p.description || ''),
        facilities: toStringArray(p.facilities),
        specializations: toStringArray(p.specializations),
        accreditations: toStringArray(p.accreditations),
        insuranceAccepted: toStringArray(p.insurance_accepted),
        registrationNumber: String(p.registration_number || ''),
        licenseNumber: String(p.license_number || ''),
        licenseDocumentUrl: String(p.license_document_url || ''),
        profileImageUrl: (p.profile_image_url as string | null) || (p.image_url as string | null) || null,
        galleryUrls: toStringArray(p.gallery_urls),
        virtualTourUrl: String(p.virtual_tour_url || ''),
        is24Hours: Boolean(p.is_24_hours),
        approvalStatus,
        approvalNotes: p.approval_notes ? String(p.approval_notes) : null,
        approvedAt: p.approved_at ? String(p.approved_at) : null,
        updatedAt: p.updated_at ? String(p.updated_at) : null,
        createdAt: p.created_at ? String(p.created_at) : null,
        rating: typeof p.rating === 'number' ? p.rating : null,
        totalReviews: typeof p.total_reviews === 'number' ? p.total_reviews : 0,
    };
}
