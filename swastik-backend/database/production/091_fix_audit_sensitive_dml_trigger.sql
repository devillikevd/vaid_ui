-- ============================================================
-- 091: FIX AUDIT SENSITIVE DML TRIGGER (record "new" has no field "user_id")
-- Resolves runtime exception on tables lacking 'user_id' column (like users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_sensitive_dml()
RETURNS TRIGGER AS $$
DECLARE
    row_id_val TEXT;
    rec_json JSONB;
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        rec_json := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        rec_json := to_jsonb(OLD);
    ELSE
        rec_json := NULL;
    END IF;

    IF rec_json IS NOT NULL THEN
        row_id_val := COALESCE(rec_json->>'id', rec_json->>'user_id');
    ELSE
        row_id_val := NULL;
    END IF;

    INSERT INTO public.access_audit_log (
        table_name, operation, row_id, actor_user, actor_role, actor_ip
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        row_id_val,
        current_setting('request.jwt.claim.sub', true),
        current_setting('request.jwt.claim.role', true),
        current_setting('request.jwt.claim.ip', true)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
