-- Add token family and reuse detection columns to refresh_tokens
ALTER TABLE refresh_tokens 
ADD COLUMN IF NOT EXISTS family_id UUID,
ADD COLUMN IF NOT EXISTS replaced_by_token TEXT;

-- Create index for faster family lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id);

-- If there are existing tokens, assign them a random family_id
UPDATE refresh_tokens 
SET family_id = gen_random_uuid() 
WHERE family_id IS NULL;

-- Now make family_id NOT NULL
ALTER TABLE refresh_tokens 
ALTER COLUMN family_id SET NOT NULL;
