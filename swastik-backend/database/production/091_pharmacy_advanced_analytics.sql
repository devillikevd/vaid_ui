-- 091_pharmacy_advanced_analytics.sql
-- Complete Advanced Analytics RPC for Pharmacy Reports (R1-R10)

CREATE OR REPLACE FUNCTION get_pharmacy_advanced_analytics(p_pharmacy_id uuid, p_period_days int DEFAULT 30)
RETURNS jsonb AS $$
DECLARE
    v_since timestamptz;
    v_overview jsonb;
    v_trends jsonb;
    v_sources jsonb;
    v_inventory jsonb;
    v_top_medicines jsonb;
    v_slow_medicines jsonb;
    v_partners jsonb;
    v_campaigns jsonb;
    v_delivery jsonb;
BEGIN
    v_since := now() - (GREATEST(COALESCE(p_period_days, 30), 1) || ' days')::interval;

    -- 1. OVERVIEW (R1)
    SELECT jsonb_build_object(
        'totalOrders', COUNT(id),
        'grossSales', COALESCE(SUM(total_amount), 0),
        'netSales', COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed', 'refunded')), 0),
        'averageOrderValue', COALESCE(ROUND(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed', 'refunded')), 2), 0),
        'paidOrders', COUNT(id) FILTER (WHERE payment_status = 'paid'),
        'refundedOrders', COUNT(id) FILTER (WHERE status = 'refunded' OR payment_status = 'refunded'),
        'refundedAmount', COALESCE(SUM(total_amount) FILTER (WHERE status = 'refunded' OR payment_status = 'refunded'), 0)
    )
    INTO v_overview
    FROM pharmacy_orders
    WHERE pharmacy_id = p_pharmacy_id AND created_at >= v_since;

    -- Add current pending orders to overview (global snapshot)
    SELECT v_overview || jsonb_build_object(
        'pendingOrders', (
            SELECT COUNT(id)
            FROM pharmacy_orders
            WHERE pharmacy_id = p_pharmacy_id AND status = 'pending'
        )
    ) INTO v_overview;

    -- 2. TRENDS (R1 Daily Time-Series)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'date', trend.dt,
            'orders', trend.orders,
            'revenue', trend.revenue
        ) ORDER BY trend.dt ASC
    ), '[]'::jsonb)
    INTO v_trends
    FROM (
        SELECT 
            date_trunc('day', created_at)::date AS dt,
            COUNT(id) AS orders,
            COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed', 'refunded')), 0) AS revenue
        FROM pharmacy_orders
        WHERE pharmacy_id = p_pharmacy_id AND created_at >= v_since
        GROUP BY 1
    ) trend;

    -- 3. SALES SOURCES (R2)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'source', src.source_code,
            'source_label', src.derived_label,
            'order_count', src.orders,
            'revenue', src.revenue
        ) ORDER BY src.revenue DESC, src.orders DESC
    ), '[]'::jsonb)
    INTO v_sources
    FROM (
        SELECT 
            CASE 
                WHEN clinic_id IS NOT NULL THEN 'clinic'
                WHEN hospital_id IS NOT NULL THEN 'hospital'
                WHEN source = 'pos' THEN 'pos'
                WHEN source = 'online' THEN 'online'
                ELSE 'unknown'
            END AS source_code,
            CASE 
                WHEN clinic_id IS NOT NULL THEN 'Partner Clinic'
                WHEN hospital_id IS NOT NULL THEN 'Partner Hospital'
                WHEN source = 'pos' THEN 'POS / Walk-in'
                WHEN source = 'online' THEN 'Online / Patient'
                ELSE 'Unknown'
            END AS derived_label,
            COUNT(id) AS orders,
            COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'failed', 'refunded')), 0) AS revenue
        FROM pharmacy_orders
        WHERE pharmacy_id = p_pharmacy_id AND created_at >= v_since
        GROUP BY 1, 2
    ) src;

    -- 4. INVENTORY INTELLIGENCE (R3 - DB Aggregated)
    SELECT jsonb_build_object(
        'total_items', COUNT(id),
        'total_units', COALESCE(SUM(quantity), 0),
        'reserved_units', COALESCE(SUM(reserved_quantity), 0),
        'available_units', COALESCE(SUM(GREATEST(0, quantity - reserved_quantity)), 0),
        'low_stock', COUNT(id) FILTER (WHERE quantity <= COALESCE(reorder_level, 10) AND quantity > 0),
        'out_of_stock', COUNT(id) FILTER (WHERE quantity = 0 OR (quantity - reserved_quantity) <= 0),
        'expired', COUNT(id) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE),
        'expiring_30', COUNT(id) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'),
        'expiring_60', COUNT(id) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE + INTERVAL '30 days' AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'),
        'expiring_90', COUNT(id) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE + INTERVAL '60 days' AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'),
        'inventory_value', COALESCE(ROUND(SUM(quantity * COALESCE(price, 0)), 2), 0)
    )
    INTO v_inventory
    FROM pharmacy_inventory
    WHERE pharmacy_id = p_pharmacy_id;

    -- 5 & 6. TOP MEDICINES (R4) & SLOW-MOVING MEDICINES (R5)
    -- Aggregate sales once from orders JSONB array
    WITH sales_items AS (
        SELECT 
            COALESCE(
                NULLIF(item->>'medicine_id', ''),
                NULLIF(item->>'inventory_id', ''),
                NULLIF(item->>'name', '')
            ) AS item_key,
            NULLIF(item->>'medicine_id', '') AS medicine_id,
            NULLIF(item->>'inventory_id', '') AS inventory_id,
            COALESCE(NULLIF(item->>'name', ''), 'Medicine') AS name,
            COALESCE((item->>'quantity')::numeric, 1) AS qty,
            COALESCE((item->>'price')::numeric, 0) * COALESCE((item->>'quantity')::numeric, 1) AS item_revenue
        FROM pharmacy_orders po,
             jsonb_array_elements(CASE WHEN jsonb_typeof(po.items) = 'array' THEN po.items ELSE '[]'::jsonb END) AS item
        WHERE po.pharmacy_id = p_pharmacy_id
          AND po.created_at >= v_since
          AND po.status NOT IN ('cancelled', 'failed', 'refunded')
    ),
    aggregated_sales AS (
        SELECT 
            item_key,
            MAX(medicine_id) AS medicine_id,
            MAX(inventory_id) AS inventory_id,
            MAX(name) AS name,
            SUM(qty) AS units_sold,
            SUM(item_revenue) AS revenue
        FROM sales_items
        WHERE item_key IS NOT NULL
        GROUP BY item_key
    )
    SELECT 
        -- Top Medicines JSON
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'medicine_id', top_s.medicine_id,
                    'inventory_id', top_s.inventory_id,
                    'name', top_s.name,
                    'units_sold', top_s.units_sold,
                    'revenue', ROUND(top_s.revenue, 2)
                ) ORDER BY top_s.units_sold DESC, top_s.revenue DESC
            ), '[]'::jsonb)
            FROM (
                SELECT * FROM aggregated_sales ORDER BY units_sold DESC, revenue DESC LIMIT 10
            ) top_s
        ),
        -- Slow-Moving Medicines JSON
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'inventory_id', inv_s.id,
                    'medicine_id', inv_s.medicine_id,
                    'name', inv_s.name,
                    'current_stock', inv_s.quantity,
                    'units_sold', COALESCE(agg.units_sold, 0),
                    'velocity', ROUND(COALESCE(agg.units_sold, 0)::numeric / GREATEST(p_period_days, 1), 4),
                    'formula', 'units_sold / ' || GREATEST(p_period_days, 1) || ' days'
                ) ORDER BY COALESCE(agg.units_sold, 0) ASC, inv_s.quantity DESC
            ), '[]'::jsonb)
            FROM (
                SELECT pi.id, pi.medicine_id, pi.name, pi.quantity
                FROM pharmacy_inventory pi
                WHERE pi.pharmacy_id = p_pharmacy_id
                ORDER BY pi.quantity DESC
                LIMIT 100
            ) inv_s
            LEFT JOIN aggregated_sales agg ON (
                (inv_s.medicine_id IS NOT NULL AND inv_s.medicine_id::text = agg.medicine_id)
                OR (inv_s.id::text = agg.inventory_id)
                OR (LOWER(TRIM(inv_s.name)) = LOWER(TRIM(agg.name)))
            )
            LIMIT 10
        )
    INTO v_top_medicines, v_slow_medicines;

    -- 7. PARTNER ANALYTICS (R6)
    SELECT jsonb_build_object(
        'clinic_orders', COUNT(id) FILTER (WHERE clinic_id IS NOT NULL),
        'clinic_revenue', COALESCE(SUM(total_amount) FILTER (WHERE clinic_id IS NOT NULL AND status NOT IN ('cancelled', 'failed', 'refunded')), 0),
        'hospital_orders', COUNT(id) FILTER (WHERE hospital_id IS NOT NULL),
        'hospital_revenue', COALESCE(SUM(total_amount) FILTER (WHERE hospital_id IS NOT NULL AND status NOT IN ('cancelled', 'failed', 'refunded')), 0),
        'top_partners', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'partner_id', p.partner_id,
                    'partner_type', p.partner_type,
                    'partner_name', p.partner_name,
                    'orders', p.order_count,
                    'revenue', ROUND(p.revenue, 2)
                ) ORDER BY p.order_count DESC, p.revenue DESC
            )
            FROM (
                SELECT 
                    COALESCE(po.clinic_id, po.hospital_id) AS partner_id,
                    CASE 
                        WHEN po.clinic_id IS NOT NULL THEN 'clinic'
                        WHEN po.hospital_id IS NOT NULL THEN 'hospital'
                    END AS partner_type,
                    COALESCE(c.name, h.name, 'Partner Facility') AS partner_name,
                    COUNT(po.id) AS order_count,
                    COALESCE(SUM(po.total_amount) FILTER (WHERE po.status NOT IN ('cancelled', 'failed', 'refunded')), 0) AS revenue
                FROM pharmacy_orders po
                LEFT JOIN clinics c ON po.clinic_id = c.id
                LEFT JOIN hospitals h ON po.hospital_id = h.id
                WHERE po.pharmacy_id = p_pharmacy_id
                  AND po.created_at >= v_since
                  AND (po.clinic_id IS NOT NULL OR po.hospital_id IS NOT NULL)
                GROUP BY 1, 2, 3
                LIMIT 10
            ) p
        ), '[]'::jsonb)
    )
    INTO v_partners
    FROM pharmacy_orders
    WHERE pharmacy_id = p_pharmacy_id AND created_at >= v_since;

    -- 8. CAMPAIGN ANALYTICS (R7)
    SELECT jsonb_build_object(
        'total_redemptions', COUNT(cr.id),
        'total_discount_given', COALESCE(SUM(cr.discount_amount), 0),
        'campaigns', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'campaign_id', c_agg.campaign_id,
                    'campaign_name', c_agg.campaign_name,
                    'redemptions', c_agg.redemption_count,
                    'discount_amount', ROUND(c_agg.total_discount, 2)
                ) ORDER BY c_agg.redemption_count DESC
            )
            FROM (
                SELECT 
                    cr_in.campaign_id,
                    COALESCE(dc.name, 'Campaign') AS campaign_name,
                    COUNT(cr_in.id) AS redemption_count,
                    COALESCE(SUM(cr_in.discount_amount), 0) AS total_discount
                FROM campaign_redemptions cr_in
                LEFT JOIN discount_campaigns dc ON cr_in.campaign_id = dc.id
                WHERE cr_in.pharmacy_id = p_pharmacy_id
                  AND cr_in.redeemed_at >= v_since
                GROUP BY cr_in.campaign_id, dc.name
                LIMIT 10
            ) c_agg
        ), '[]'::jsonb)
    )
    INTO v_campaigns
    FROM campaign_redemptions cr
    WHERE cr.pharmacy_id = p_pharmacy_id AND cr.redeemed_at >= v_since;

    -- 9. DELIVERY ANALYTICS (R8)
    SELECT jsonb_build_object(
        'total_delivery_orders', COUNT(id) FILTER (WHERE delivery_type = 'delivery' OR agent_id IS NOT NULL),
        'assigned_orders', COUNT(id) FILTER (WHERE agent_id IS NOT NULL),
        'dispatched_orders', COUNT(id) FILTER (WHERE status IN ('dispatched', 'out_for_delivery')),
        'delivered_orders', COUNT(id) FILTER (WHERE status = 'delivered'),
        'pending_delivery', COUNT(id) FILTER (WHERE (delivery_type = 'delivery' OR agent_id IS NOT NULL) AND status IN ('pending', 'confirmed', 'processing', 'ready', 'dispatched', 'out_for_delivery')),
        'average_delivery_time_minutes', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (WHERE status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at >= created_at), 1), 0),
        'agents', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'agent_id', da_agg.id,
                    'agent_name', da_agg.name,
                    'delivered_orders', da_agg.delivered_count,
                    'active_orders', da_agg.active_count
                ) ORDER BY da_agg.delivered_count DESC
            )
            FROM (
                SELECT 
                    da.id,
                    da.name,
                    COUNT(po_in.id) FILTER (WHERE po_in.status = 'delivered') AS delivered_count,
                    COUNT(po_in.id) FILTER (WHERE po_in.status IN ('dispatched', 'out_for_delivery')) AS active_count
                FROM pharmacy_orders po_in
                JOIN delivery_agents da ON po_in.agent_id = da.id
                WHERE po_in.pharmacy_id = p_pharmacy_id
                  AND po_in.created_at >= v_since
                GROUP BY da.id, da.name
                LIMIT 10
            ) da_agg
        ), '[]'::jsonb)
    )
    INTO v_delivery
    FROM pharmacy_orders
    WHERE pharmacy_id = p_pharmacy_id AND created_at >= v_since;

    -- Return Consolidated JSON payload
    RETURN jsonb_build_object(
        'overview', v_overview,
        'trends', v_trends,
        'sources', v_sources,
        'inventory', v_inventory,
        'top_medicines', COALESCE(v_top_medicines, '[]'::jsonb),
        'slow_medicines', COALESCE(v_slow_medicines, '[]'::jsonb),
        'partners', v_partners,
        'campaigns', v_campaigns,
        'delivery', v_delivery,
        'meta', jsonb_build_object(
            'period_days', p_period_days,
            'since', v_since,
            'generated_at', now()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
