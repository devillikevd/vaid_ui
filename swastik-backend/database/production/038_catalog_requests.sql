-- Migration: Create Catalog Requests for Global Medicine Broadcasts
-- This table tracks requests from patients for medicines not immediately available in nearby pharmacies.

CREATE TABLE IF NOT EXISTS public.catalog_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    accepted_total_price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 minutes'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for querying active requests quickly
CREATE INDEX IF NOT EXISTS idx_catalog_requests_status ON public.catalog_requests(status);
CREATE INDEX IF NOT EXISTS idx_catalog_requests_patient ON public.catalog_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_catalog_requests_pharmacy ON public.catalog_requests(accepted_pharmacy_id);

-- Enable RLS
ALTER TABLE public.catalog_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Patients can view their own requests" ON public.catalog_requests;
CREATE POLICY "Patients can view their own requests"
    ON public.catalog_requests FOR SELECT
    USING (patient_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Patients can insert requests" ON public.catalog_requests;
CREATE POLICY "Patients can insert requests"
    ON public.catalog_requests FOR INSERT
    WITH CHECK (patient_id IN (
        SELECT id FROM public.patients WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Pharmacies can view all requests" ON public.catalog_requests;
CREATE POLICY "Pharmacies can view all requests"
    ON public.catalog_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Pharmacies can update requests" ON public.catalog_requests;
CREATE POLICY "Pharmacies can update requests"
    ON public.catalog_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE owner_id = auth.uid()
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_catalog_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_catalog_requests_updated_at ON public.catalog_requests;
CREATE TRIGGER update_catalog_requests_updated_at
    BEFORE UPDATE ON public.catalog_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_requests_updated_at();
