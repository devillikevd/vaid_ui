CREATE TABLE IF NOT EXISTS medicine_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with real therapeutic categories
-- 'name' is the lowercase key stored in medicines.category — matches what admin dropdown sends
-- 'display_name' is the human-readable label shown in patient app chips
INSERT INTO medicine_categories (name, display_name, description, icon, sort_order, is_active) VALUES
('general', 'General Medicine', 'General health and wellness', '💊', 1, true),
('antibiotic', 'Antibiotic', 'Antibacterial medications', '🧫', 2, true),
('painkiller', 'Painkiller', 'Pain relief medications', '🩹', 3, true),
('vitamin', 'Vitamin', 'Vitamins and supplements', '🍊', 4, true),
('cardiac', 'Cardiac', 'Heart and cardiovascular', '❤️', 5, true),
('diabetes', 'Diabetes', 'Diabetes management', '🩸', 6, true),
('skin', 'Skin Care', 'Dermatology medications', '🧴', 7, true),
('respiratory', 'Respiratory', 'Respiratory and lung medications', '🫁', 8, true),
('digestive', 'Digestive Health', 'Digestive and gut health', '🌿', 9, true),
('ayurvedic', 'Ayurvedic', 'Ayurvedic and herbal remedies', '🍃', 10, true),
('allergy', 'Allergy', 'Antihistamines and allergy relief', '🤧', 11, true),
('cold-flu', 'Cold & Flu', 'Cold, cough and flu medications', '🤧', 12, true),
('pediatric', 'Pediatric', 'Children medications', '👶', 13, true),
('women-health', 'Women Health', 'Women health medications', '♀️', 14, true),
('men-health', 'Men Health', 'Men health medications', '♂️', 15, true),
('supplement', 'Supplement', 'Nutritional supplements', '💪', 16, true),
('antifungal', 'Antifungal', 'Antifungal medications', '🔬', 17, true),
('hormone', 'Hormone', 'Hormonal medications', '⚗️', 18, true)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, icon = EXCLUDED.icon;

-- Add search_count column to medicines if not exists
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
