-- ============================================================
-- 094: Persistent Health Cards Table
-- Stores cryptographic tokens for QR-based portable medical records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.health_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT,
    guardian_analytics JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_cards_token ON public.health_cards(token);
CREATE INDEX IF NOT EXISTS idx_health_cards_user_status ON public.health_cards(user_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_cards_patient ON public.health_cards(patient_id);

-- Enable RLS
ALTER TABLE public.health_cards ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'health_cards' 
        AND policyname = 'service_role_all_health_cards'
    ) THEN
        CREATE POLICY service_role_all_health_cards ON public.health_cards
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
