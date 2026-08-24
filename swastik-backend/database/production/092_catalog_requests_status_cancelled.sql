-- Migration 092: Allow 'cancelled' status in catalog_requests table
-- Fixes issue where cancelling a pending medicine broadcast failed with constraint violation

ALTER TABLE public.catalog_requests 
DROP CONSTRAINT IF EXISTS catalog_requests_status_check;

ALTER TABLE public.catalog_requests 
ADD CONSTRAINT catalog_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));
