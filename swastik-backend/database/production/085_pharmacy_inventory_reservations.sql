-- 085_pharmacy_inventory_reservations.sql
-- Phase A: Unified Inventory Reservation

-- 1. Add new columns
ALTER TABLE pharmacy_inventory 
ADD COLUMN IF NOT EXISTS reserved_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_stock integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS barcode varchar(255);

-- 2. Add concurrency and data integrity constraints
ALTER TABLE pharmacy_inventory
ADD CONSTRAINT check_quantity_positive CHECK (quantity >= 0),
ADD CONSTRAINT check_reserved_quantity_positive CHECK (reserved_quantity >= 0),
ADD CONSTRAINT check_quantity_ge_reserved CHECK (quantity >= reserved_quantity);

-- 3. Create Atomic RPC for reservation
-- This function processes an array of items: [{ "inventory_id": "uuid", "quantity": 5 }]
-- It atomically reserves all items, or rolls back completely if any item has insufficient stock.
CREATE OR REPLACE FUNCTION reserve_pharmacy_inventory(p_pharmacy_id uuid, order_items jsonb)
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

        -- Update the reserved quantity
        UPDATE pharmacy_inventory
        SET reserved_quantity = reserved_quantity + req_qty
        WHERE id = inv_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
