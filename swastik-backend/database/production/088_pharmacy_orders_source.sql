-- 088_pharmacy_orders_source.sql
-- Phase E1: Add source column and atomic POS inventory consumption

-- 1. Add source column
ALTER TABLE pharmacy_orders 
ADD COLUMN IF NOT EXISTS source varchar(50) DEFAULT 'online';

-- 2. Update existing orders to have 'online' source
UPDATE pharmacy_orders 
SET source = 'online' 
WHERE source IS NULL;

-- 3. Add constraint to restrict source values to known types
ALTER TABLE pharmacy_orders 
ADD CONSTRAINT check_pharmacy_orders_source 
CHECK (source IN ('online', 'pos'));

-- 4. Create an index for reporting and filtering
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_source ON pharmacy_orders(source);

-- 5. Create Atomic RPC for POS immediate checkout
-- This function processes an array of items: [{ "inventory_id": "uuid", "quantity": 5 }]
-- It atomically decrements the physical quantity without touching reserved_quantity.
-- It rolls back completely if any item has insufficient available stock.
CREATE OR REPLACE FUNCTION consume_pos_pharmacy_inventory(p_pharmacy_id uuid, order_items jsonb)
RETURNS void AS $$
DECLARE
    item jsonb;
    inv_id uuid;
    req_qty integer;
    curr_qty integer;
    curr_reserved integer;
    available integer;
BEGIN
    -- Loop through each requested item
    FOR item IN SELECT * FROM jsonb_array_elements(order_items)
    LOOP
        inv_id := (item->>'inventory_id')::uuid;
        req_qty := (item->>'quantity')::integer;

        -- Lock the row for update to prevent concurrent modification
        SELECT quantity, reserved_quantity INTO curr_qty, curr_reserved
        FROM pharmacy_inventory
        WHERE id = inv_id AND pharmacy_id = p_pharmacy_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Inventory item % not found', inv_id;
        END IF;

        available := curr_qty - curr_reserved;

        -- Check available stock
        IF available < req_qty THEN
            RAISE EXCEPTION 'Insufficient stock for inventory item %. Requested: %, Available: %', inv_id, req_qty, available;
        END IF;

        -- Update the physical quantity immediately
        UPDATE pharmacy_inventory
        SET quantity = quantity - req_qty
        WHERE id = inv_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
