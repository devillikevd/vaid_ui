
export type ReferralUrgency = 'routine' | 'urgent' | 'emergency';
export type ReferralStatus = 'awaiting_consent' | 'consent_declined' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

export interface ReferralPatient {
    id: string;
    user_id: string;
    full_name: string;
    users?: { name: string; email: string; phone: string };
}

export interface ReferralAttachment {
    id: string;
    referral_id: string;
    report_id?: string;
    prescription_id?: string;
    document_type: string;
    file_name: string;
    storage_path?: string;
    uploaded_by: string;
    created_at: string;
}

export interface UniversalReferral {
    id: string;
    patient_id: string;
    sender_type: string;
    sender_id: string;
    receiver_type: string;
    receiver_id: string;
    sender_snapshot: any;
    receiver_snapshot: any;
    sender_user_id: string;
    sender_user_name_snapshot: string;
    reason: string;
    urgency: ReferralUrgency;
    clinical_summary?: string;
    status: ReferralStatus;
    hospital_admission_status?: string;
    consent_granted: boolean;
    created_at: string;
    updated_at: string;
    accepted_at?: string;
    completed_at?: string;
    patient?: ReferralPatient;
    attachments?: ReferralAttachment[];
}
