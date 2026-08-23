-- ============================================================
-- 097: Universal Referrals RLS & Security Definer Functions
-- Implements Phase 3 Database Authorization Layer
-- ============================================================

-- 1. Patient Ownership Helper
CREATE OR REPLACE FUNCTION check_patient_ownership(p_patient_id UUID, p_user_uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    is_owner BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM patients WHERE id = p_patient_id AND user_id = p_user_uid
    ) INTO is_owner;
    RETURN is_owner;
END;
$$;

-- 2. Provider Access Security Definer Function
-- Mirrors Phase 2 authorization logic at the database level for RLS.
CREATE OR REPLACE FUNCTION check_provider_access(org_type TEXT, org_id UUID, user_uid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    is_authorized BOOLEAN := false;
BEGIN
    -- Fast fail
    IF user_uid IS NULL OR org_id IS NULL THEN
        RETURN false;
    END IF;

    IF org_type = 'clinic' THEN
        -- Check if owner
        SELECT EXISTS (
            SELECT 1 FROM clinics WHERE id = org_id AND owner_id = user_uid
        ) INTO is_authorized;
        
        -- Check if doctor member
        IF NOT is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM clinic_doctors cd
                JOIN doctors d ON d.id = cd.doctor_id
                WHERE cd.clinic_id = org_id 
                  AND d.user_id = user_uid 
                  AND cd.is_active = true
            ) INTO is_authorized;
        END IF;

    ELSIF org_type = 'hospital' THEN
        -- Check if owner
        SELECT EXISTS (
            SELECT 1 FROM hospitals WHERE id = org_id AND owner_id = user_uid
        ) INTO is_authorized;
        
        -- Check if manager
        IF NOT is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM hospital_managers WHERE hospital_id = org_id AND user_id = user_uid
            ) INTO is_authorized;
        END IF;

        -- Check if doctor member
        IF NOT is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM hospital_doctors hd
                JOIN doctors d ON d.id = hd.doctor_id
                WHERE hd.hospital_id = org_id 
                  AND d.user_id = user_uid 
                  AND hd.is_active = true
            ) INTO is_authorized;
        END IF;

    ELSIF org_type = 'diagnostic_center' THEN
        -- Check if owner
        SELECT EXISTS (
            SELECT 1 FROM diagnostic_centers WHERE id = org_id AND owner_id = user_uid
        ) INTO is_authorized;
        
        -- Check if staff
        IF NOT is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM diagnostic_members 
                WHERE diagnostic_center_id = org_id 
                  AND user_id = user_uid 
                  AND status = 'active'
            ) INTO is_authorized;
        END IF;

    ELSIF org_type = 'pharmacy' THEN
        -- Check if owner
        SELECT EXISTS (
            SELECT 1 FROM pharmacies WHERE id = org_id AND owner_id = user_uid
        ) INTO is_authorized;
        
        -- Check if staff
        IF NOT is_authorized THEN
            SELECT EXISTS (
                SELECT 1 FROM pharmacy_members 
                WHERE pharmacy_id = org_id 
                  AND user_id = user_uid 
                  AND status = 'active'
            ) INTO is_authorized;
        END IF;
    END IF;

    RETURN is_authorized;
END;
$$;

-- 3. Immutable Audit Field Protection Trigger
CREATE OR REPLACE FUNCTION protect_immutable_referral_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id THEN
        RAISE EXCEPTION 'Cannot modify patient_id of an existing referral';
    END IF;
    IF NEW.sender_type IS DISTINCT FROM OLD.sender_type THEN
        RAISE EXCEPTION 'Cannot modify sender_type of an existing referral';
    END IF;
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
        RAISE EXCEPTION 'Cannot modify sender_id of an existing referral';
    END IF;
    IF NEW.sender_snapshot_name IS DISTINCT FROM OLD.sender_snapshot_name THEN
        RAISE EXCEPTION 'Cannot modify sender_snapshot_name';
    END IF;
    IF NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id THEN
        RAISE EXCEPTION 'Cannot modify sender_user_id';
    END IF;
    IF NEW.sender_user_name_snapshot IS DISTINCT FROM OLD.sender_user_name_snapshot THEN
        RAISE EXCEPTION 'Cannot modify sender_user_name_snapshot';
    END IF;
    IF NEW.receiver_type IS DISTINCT FROM OLD.receiver_type THEN
        RAISE EXCEPTION 'Cannot modify receiver_type';
    END IF;
    IF NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
        RAISE EXCEPTION 'Cannot modify receiver_id';
    END IF;
    IF NEW.receiver_snapshot_name IS DISTINCT FROM OLD.receiver_snapshot_name THEN
        RAISE EXCEPTION 'Cannot modify receiver_snapshot_name';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Cannot modify created_at';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_immutable_referral_fields ON universal_referrals;
CREATE TRIGGER trg_protect_immutable_referral_fields
BEFORE UPDATE ON universal_referrals
FOR EACH ROW
EXECUTE FUNCTION protect_immutable_referral_fields();


-- 4. RLS Policies for universal_referrals
-- (Table should already have RLS enabled via 096 migration)

DROP POLICY IF EXISTS "Users can read referrals if they are sender, receiver, or patient" ON universal_referrals;
CREATE POLICY "Users can read referrals if they are sender, receiver, or patient"
ON universal_referrals FOR SELECT
USING (
    check_provider_access(sender_type, sender_id, auth.uid())
    OR
    check_provider_access(receiver_type, receiver_id, auth.uid())
    OR
    check_patient_ownership(patient_id, auth.uid())
);

DROP POLICY IF EXISTS "Authorized senders can insert referrals" ON universal_referrals;
CREATE POLICY "Authorized senders can insert referrals"
ON universal_referrals FOR INSERT
WITH CHECK (
    sender_user_id = auth.uid() 
    AND check_provider_access(sender_type, sender_id, auth.uid())
);

DROP POLICY IF EXISTS "Senders can update their referrals" ON universal_referrals;
CREATE POLICY "Senders can update their referrals"
ON universal_referrals FOR UPDATE
USING (
    check_provider_access(sender_type, sender_id, auth.uid())
)
WITH CHECK (
    check_provider_access(sender_type, sender_id, auth.uid())
);

DROP POLICY IF EXISTS "Receivers can update their received referrals" ON universal_referrals;
CREATE POLICY "Receivers can update their received referrals"
ON universal_referrals FOR UPDATE
USING (
    check_provider_access(receiver_type, receiver_id, auth.uid())
)
WITH CHECK (
    check_provider_access(receiver_type, receiver_id, auth.uid())
);


-- 5. RLS Policies for referral_attachments

DROP POLICY IF EXISTS "Users can read attachments if they can read the referral" ON referral_attachments;
CREATE POLICY "Users can read attachments if they can read the referral"
ON referral_attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM universal_referrals r 
        WHERE r.id = referral_attachments.referral_id 
        AND (
            check_provider_access(r.sender_type, r.sender_id, auth.uid())
            OR check_provider_access(r.receiver_type, r.receiver_id, auth.uid())
            OR check_patient_ownership(r.patient_id, auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "Providers can insert attachments if they have access to the referral" ON referral_attachments;
CREATE POLICY "Providers can insert attachments if they have access to the referral"
ON referral_attachments FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM universal_referrals r 
        WHERE r.id = referral_id 
        AND (
            check_provider_access(r.sender_type, r.sender_id, auth.uid())
            OR check_provider_access(r.receiver_type, r.receiver_id, auth.uid())
        )
    )
);

-- Note: No UPDATE/DELETE policies are provided for referral_attachments to ensure they remain immutable append-only audit logs.
