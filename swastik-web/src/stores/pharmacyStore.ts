import { create } from 'zustand';
import { pharmacyApi } from '../lib/api';

export interface PaginationState {
    page: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
}

export interface PharmacyDashboardStats {
    newPrescriptions: number;
    pendingOrders: number;
    lowStockItems: number;
    todaysRevenue: number;
}

export interface PharmacyOverviewAnalytics {
    totalOrders: number;
    pendingOrders: number;
    grossSales: number;
    netSales: number;
    averageOrderValue: number;
    paidOrders: number;
    refundedOrders: number;
    refundedAmount: number;
}

export interface PharmacyTrendPoint {
    date: string;
    orders: number;
    revenue: number;
}

export interface PharmacySalesSource {
    source: string;
    source_label: string;
    order_count: number;
    revenue: number;
}

export interface PharmacyInventoryIntelligence {
    total_items: number;
    total_units: number;
    reserved_units: number;
    available_units: number;
    low_stock: number;
    out_of_stock: number;
    expired: number;
    expiring_30: number;
    expiring_60: number;
    expiring_90: number;
    inventory_value: number;
}

export interface PharmacyTopMedicine {
    medicine_id: string | null;
    inventory_id: string | null;
    name: string;
    units_sold: number;
    revenue: number;
}

export interface PharmacySlowMedicine {
    inventory_id: string;
    medicine_id: string | null;
    name: string;
    current_stock: number;
    units_sold: number;
    velocity: number;
    formula: string;
}

export interface PharmacyPartnerItem {
    partner_id: string;
    partner_type: string;
    partner_name: string;
    orders: number;
    revenue: number;
}

export interface PharmacyPartnersAnalytics {
    clinic_orders: number;
    clinic_revenue: number;
    hospital_orders: number;
    hospital_revenue: number;
    top_partners: PharmacyPartnerItem[];
}

export interface PharmacyCampaignItem {
    campaign_id: string;
    campaign_name: string;
    redemptions: number;
    discount_amount: number;
}

export interface PharmacyCampaignsAnalytics {
    total_redemptions: number;
    total_discount_given: number;
    campaigns: PharmacyCampaignItem[];
}

export interface PharmacyDeliveryAgentStat {
    agent_id: string;
    agent_name: string;
    delivered_orders: number;
    active_orders: number;
}

export interface PharmacyDeliveryAnalytics {
    total_delivery_orders: number;
    assigned_orders: number;
    dispatched_orders: number;
    delivered_orders: number;
    pending_delivery: number;
    average_delivery_time_minutes: number;
    agents: PharmacyDeliveryAgentStat[];
}

export interface PharmacyAnalytics {
    period: string;
    // Legacy top-level metrics for backward compatibility
    totalOrders: number;
    pendingOrders: number;
    totalInventoryItems: number;
    lowStockItems: number;
    totalInventoryValue: number;

    // Advanced analytics
    overview?: PharmacyOverviewAnalytics;
    trends?: PharmacyTrendPoint[];
    sources?: PharmacySalesSource[];
    inventory?: PharmacyInventoryIntelligence;
    topMedicines?: PharmacyTopMedicine[];
    slowMedicines?: PharmacySlowMedicine[];
    partners?: PharmacyPartnersAnalytics;
    campaigns?: PharmacyCampaignsAnalytics;
    delivery?: PharmacyDeliveryAnalytics;
    meta?: {
        period_days: number;
        generated_at: string;
    };
}


export interface InventoryItem {
    id: string;
    name: string;
    genericName?: string;
    category?: string;
    medicine_id?: string;
    therapeuticCategory?: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    packSize?: number;
    unitType?: string;
    price?: number;
    mrp?: number;
    batchNumber?: string;
    expiryDate?: string;
    manufacturer?: string;
    isLowStock: boolean;
    requiresPrescription?: boolean;
    medicine?: any;
}

export interface OrderItem {
    medicineId?: string;
    inventoryItemId?: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface Order {
    id: string;
    pharmacy_id?: string;
    patientName: string;
    patientId: string;
    items: OrderItem[];
    total_amount?: number;
    total?: number;
    time: string;
    created_at?: string;
    delivery_address?: string;
    payment_status?: string;
    status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'out_for_delivery' | 'dispatched' | 'delivered' | 'cancelled';
    tracking_token?: string;
    agent_id?: string;
    facility?: {
        id?: string;
        latitude?: number;
        longitude?: number;
        name?: string;
    };
}

export interface Prescription {
    id: string;
    patientName: string;
    doctorName: string;
    items: number;
    time: string;
    status: string;
    medications?: Record<string, unknown>[];
    date?: string;
}

export interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    created_at: string;
    patient?: {
        name: string;
    };
}

export interface OrderSummary {
    total: number;
    pending: number;
    active: number;
    completed: number;
    delivered: number;
}

interface InventoryQuery {
    page?: number;
    limit?: number;
    search?: string;
    lowStock?: boolean;
    category?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface OrdersQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    group?: string;
}

interface PrescriptionsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

const defaultPagination: PaginationState = {
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
};

const defaultOrderSummary: OrderSummary = {
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    delivered: 0,
};

function normalizePagination(
    pagination: Record<string, number> | undefined,
    page: number,
    fallbackTotal: number
): PaginationState {
    const safePage = pagination?.page || page;
    const totalPages = pagination?.totalPages || 1;
    const total = pagination?.total ?? fallbackTotal;

    return {
        page: safePage,
        totalPages,
        total,
        hasMore: safePage < totalPages,
    };
}

function normalizeInventoryItem(raw: Record<string, any>): InventoryItem {
    const quantity = Number(raw.quantity ?? raw.stock ?? 0);
    const minQuantity = Number(raw.minQuantity ?? raw.min_quantity ?? raw.reorder_level ?? 10);

    return {
        id: raw.id || '',
        name: raw.name || raw.medicine_name || 'Medicine',
        genericName: raw.genericName || raw.generic_name || raw.medicine_name || undefined,
        category: raw.category || undefined,
        medicine_id: raw.medicine_id || raw.medicineId || undefined,
        therapeuticCategory: raw.therapeuticCategory || raw.therapeutic_category || undefined,
        quantity,
        minQuantity,
        unit: raw.unit || 'units',
        packSize: Number(raw.pack_size ?? raw.packSize ?? 1),
        unitType: raw.unit_type || raw.unitType || 'unit',
        price: raw.price ?? raw.mrp ?? undefined,
        mrp: raw.mrp ?? raw.price ?? undefined,
        batchNumber: raw.batchNumber || raw.batch_number || undefined,
        expiryDate: raw.expiryDate || raw.expiry_date || undefined,
        manufacturer: raw.manufacturer || undefined,
        isLowStock: raw.isLowStock ?? quantity < minQuantity,
        requiresPrescription: raw.requiresPrescription ?? raw.requires_prescription ?? false,
    };
}

function normalizeOrder(raw: Record<string, any>): Order {
    const items = Array.isArray(raw.items) ? raw.items : [];
    const derivedTotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || ((item.price || 0) * (item.quantity || 1))), 0);

    return {
        ...raw,
        patientName: raw.patientName || raw.patient?.name || 'Patient',
        patientId: raw.patientId || raw.patient_id || raw.patient?.id || '',
        items,
        total: raw.total || raw.total_amount || derivedTotal,
        time: raw.time || raw.created_at || '',
        status: raw.status || 'pending',
    } as Order;
}

function normalizePrescription(raw: Record<string, any>): Prescription {
    const medications = Array.isArray(raw.medications)
        ? raw.medications
        : Array.isArray(raw.prescription_medicines)
            ? raw.prescription_medicines
            : [];

    return {
        id: raw.id || '',
        patientName: raw.patientName || raw.patient?.name || raw.patients?.name || 'Patient',
        doctorName: raw.doctorName || raw.doctor?.name || raw.doctors?.name || '',
        items: Number(raw.items ?? medications.length ?? 0),
        time: raw.time || raw.created_at || raw.date || '',
        status: raw.status || (raw.is_dispensed ? 'fulfilled' : 'pending'),
        medications,
        date: raw.date || raw.created_at || raw.prescribed_at || '',
    };
}

function normalizeAnalytics(raw: Record<string, any>, fallbackPeriod: string): PharmacyAnalytics {
    const ov = raw.overview || {};
    const inv = raw.inventory || {};
    const pt = raw.partners || {};
    const cp = raw.campaigns || {};
    const dl = raw.delivery || {};

    return {
        period: String(raw.period || fallbackPeriod),
        totalOrders: Number(raw.totalOrders ?? ov.totalOrders ?? 0),
        pendingOrders: Number(raw.pendingOrders ?? ov.pendingOrders ?? 0),
        totalInventoryItems: Number(raw.totalInventoryItems ?? inv.total_items ?? 0),
        lowStockItems: Number(raw.lowStockItems ?? inv.low_stock ?? 0),
        totalInventoryValue: Number(raw.totalInventoryValue ?? inv.inventory_value ?? 0),

        overview: {
            totalOrders: Number(ov.totalOrders ?? raw.totalOrders ?? 0),
            pendingOrders: Number(ov.pendingOrders ?? raw.pendingOrders ?? 0),
            grossSales: Number(ov.grossSales ?? 0),
            netSales: Number(ov.netSales ?? 0),
            averageOrderValue: Number(ov.averageOrderValue ?? 0),
            paidOrders: Number(ov.paidOrders ?? 0),
            refundedOrders: Number(ov.refundedOrders ?? 0),
            refundedAmount: Number(ov.refundedAmount ?? 0),
        },
        trends: Array.isArray(raw.trends) ? raw.trends.map((t: any) => ({
            date: String(t.date || ''),
            orders: Number(t.orders || 0),
            revenue: Number(t.revenue || 0),
        })) : [],
        sources: Array.isArray(raw.sources) ? raw.sources.map((s: any) => ({
            source: String(s.source || 'unknown'),
            source_label: String(s.source_label || s.source || 'Unknown'),
            order_count: Number(s.order_count || 0),
            revenue: Number(s.revenue || 0),
        })) : [],
        inventory: {
            total_items: Number(inv.total_items ?? raw.totalInventoryItems ?? 0),
            total_units: Number(inv.total_units ?? 0),
            reserved_units: Number(inv.reserved_units ?? 0),
            available_units: Number(inv.available_units ?? 0),
            low_stock: Number(inv.low_stock ?? raw.lowStockItems ?? 0),
            out_of_stock: Number(inv.out_of_stock ?? 0),
            expired: Number(inv.expired ?? 0),
            expiring_30: Number(inv.expiring_30 ?? 0),
            expiring_60: Number(inv.expiring_60 ?? 0),
            expiring_90: Number(inv.expiring_90 ?? 0),
            inventory_value: Number(inv.inventory_value ?? raw.totalInventoryValue ?? 0),
        },
        topMedicines: Array.isArray(raw.topMedicines || raw.top_medicines) ? (raw.topMedicines || raw.top_medicines).map((m: any) => ({
            medicine_id: m.medicine_id || null,
            inventory_id: m.inventory_id || null,
            name: String(m.name || 'Medicine'),
            units_sold: Number(m.units_sold || 0),
            revenue: Number(m.revenue || 0),
        })) : [],
        slowMedicines: Array.isArray(raw.slowMedicines || raw.slow_medicines) ? (raw.slowMedicines || raw.slow_medicines).map((m: any) => ({
            inventory_id: String(m.inventory_id || ''),
            medicine_id: m.medicine_id || null,
            name: String(m.name || 'Medicine'),
            current_stock: Number(m.current_stock || 0),
            units_sold: Number(m.units_sold || 0),
            velocity: Number(m.velocity || 0),
            formula: String(m.formula || ''),
        })) : [],
        partners: {
            clinic_orders: Number(pt.clinic_orders || 0),
            clinic_revenue: Number(pt.clinic_revenue || 0),
            hospital_orders: Number(pt.hospital_orders || 0),
            hospital_revenue: Number(pt.hospital_revenue || 0),
            top_partners: Array.isArray(pt.top_partners) ? pt.top_partners.map((p: any) => ({
                partner_id: String(p.partner_id || ''),
                partner_type: String(p.partner_type || ''),
                partner_name: String(p.partner_name || 'Partner'),
                orders: Number(p.orders || 0),
                revenue: Number(p.revenue || 0),
            })) : [],
        },
        campaigns: {
            total_redemptions: Number(cp.total_redemptions || 0),
            total_discount_given: Number(cp.total_discount_given || 0),
            campaigns: Array.isArray(cp.campaigns) ? cp.campaigns.map((c: any) => ({
                campaign_id: String(c.campaign_id || ''),
                campaign_name: String(c.campaign_name || 'Campaign'),
                redemptions: Number(c.redemptions || 0),
                discount_amount: Number(c.discount_amount || 0),
            })) : [],
        },
        delivery: {
            total_delivery_orders: Number(dl.total_delivery_orders || 0),
            assigned_orders: Number(dl.assigned_orders || 0),
            dispatched_orders: Number(dl.dispatched_orders || 0),
            delivered_orders: Number(dl.delivered_orders || 0),
            pending_delivery: Number(dl.pending_delivery || 0),
            average_delivery_time_minutes: Number(dl.average_delivery_time_minutes || 0),
            agents: Array.isArray(dl.agents) ? dl.agents.map((a: any) => ({
                agent_id: String(a.agent_id || ''),
                agent_name: String(a.agent_name || 'Agent'),
                delivered_orders: Number(a.delivered_orders || 0),
                active_orders: Number(a.active_orders || 0),
            })) : [],
        },
        meta: raw.meta ? {
            period_days: Number(raw.meta.period_days || 30),
            generated_at: String(raw.meta.generated_at || new Date().toISOString()),
        } : undefined,
    };
}

interface PharmacyState {
    stats: PharmacyDashboardStats | null;
    analytics: PharmacyAnalytics | null;
    inventory: InventoryItem[];
    inventoryPagination: PaginationState;
    orders: Order[];
    ordersPagination: PaginationState;
    orderSummary: OrderSummary;
    prescriptions: Prescription[];
    prescriptionsPagination: PaginationState;
    pendingPrescriptions: Prescription[];
    lowStockItems: InventoryItem[];
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingInventory: boolean;
    loadingOrders: boolean;
    loadingPrescriptions: boolean;
    loadingAnalytics: boolean;
    loadingReviews: boolean;
    error: string | null;
    dashboardError: string | null;
    ordersError: string | null;
    reviews: Review[];
    inventoryQuery: InventoryQuery;
    ordersQuery: OrdersQuery;
    prescriptionsQuery: PrescriptionsQuery;

    fetchDashboardData: () => Promise<void>;
    fetchInventory: (params?: InventoryQuery) => Promise<void>;
    fetchOrders: (params?: OrdersQuery) => Promise<void>;
    fetchPrescriptions: (params?: PrescriptionsQuery) => Promise<void>;
    fetchLowStockItems: () => Promise<void>;
    fetchAnalytics: (period?: string) => Promise<void>;
    fetchReviews: (page?: number) => Promise<void>;
    addInventoryItem: (data: Record<string, unknown>) => Promise<boolean>;
    addBulkInventoryItems: (items: any[]) => Promise<boolean>;
    updateInventoryItem: (id: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteInventoryItem: (id: string) => Promise<boolean>;
    updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

const pharmacyInitialState = {
    stats: null as PharmacyDashboardStats | null,
    analytics: null as PharmacyAnalytics | null,
    inventory: [] as InventoryItem[],
    inventoryPagination: { ...defaultPagination },
    orders: [] as Order[],
    ordersPagination: { ...defaultPagination },
    orderSummary: { ...defaultOrderSummary },
    prescriptions: [] as Prescription[],
    prescriptionsPagination: { ...defaultPagination },
    pendingPrescriptions: [] as Prescription[],
    lowStockItems: [] as InventoryItem[],
    isLoading: false,
    loadingDashboard: false,
    loadingInventory: false,
    loadingOrders: false,
    loadingPrescriptions: false,
    loadingAnalytics: false,
    loadingReviews: false,
    error: null as string | null,
    reviews: [] as Review[],
    inventoryQuery: { page: 1, limit: 10 } as InventoryQuery,
    ordersQuery: { page: 1, limit: 10 } as OrdersQuery,
    prescriptionsQuery: { page: 1, limit: 10 } as PrescriptionsQuery,
    dashboardError: null as string | null,
    ordersError: null as string | null,
};

export const usePharmacyStore = create<PharmacyState>((set, get) => ({
    ...pharmacyInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...pharmacyInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, dashboardError: null });
        try {
            const response = await pharmacyApi.getDashboard();
            if (!response.success) {
                set({
                    dashboardError: response.error || 'Failed to load pharmacy dashboard',
                    loadingDashboard: false,
                    isLoading: false,
                });
                return;
            }

            const data = response.data as Record<string, unknown>;
            const prescriptions = ((data.pendingPrescriptions || data.recentPrescriptions || []) as Record<string, any>[])
                .map(normalizePrescription);
            const lowStockItems = ((data.lowStockItems || []) as Record<string, any>[])
                .map(normalizeInventoryItem);

            set({
                stats: (data.stats as PharmacyDashboardStats) || null,
                lowStockItems,
                pendingPrescriptions: prescriptions,
                loadingDashboard: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching pharmacy dashboard:', error);
            set({
                dashboardError: 'Failed to connect to server. Please check your connection.',
                loadingDashboard: false,
                isLoading: false,
            });
        }
    },

    fetchInventory: async (params = {}) => {
        set({ loadingInventory: true, error: null });
        try {
            const query = {
                ...get().inventoryQuery,
                ...params,
                page: params.page ?? 1,
                limit: params.limit ?? get().inventoryQuery.limit ?? 10,
            };
            const response = await pharmacyApi.getInventory(query);
            if (!response.success) {
                set({ error: response.error || 'Failed to load inventory', loadingInventory: false });
                return;
            }

            const rawData = response.data;
            const inventory = (Array.isArray(rawData) ? rawData : (rawData as any)?.items || (rawData as any)?.inventory || (rawData as any)?.data || [])
                .map((item: Record<string, any>) => normalizeInventoryItem(item)) as InventoryItem[];
            const pagination = normalizePagination((response as any).pagination, query.page || 1, inventory.length);

            set({
                inventory,
                inventoryPagination: pagination,
                inventoryQuery: query,
                loadingInventory: false,
            });
        } catch (error) {
            console.error('Error fetching inventory:', error);
            set({
                error: 'Failed to load inventory.',
                loadingInventory: false,
                inventoryPagination: { ...defaultPagination },
            });
        }
    },

    fetchOrders: async (params = {}) => {
        set({ loadingOrders: true, ordersError: null });
        try {
            const query = {
                ...get().ordersQuery,
                ...params,
                page: params.page ?? 1,
                limit: params.limit ?? get().ordersQuery.limit ?? 10,
            };
            const response = await pharmacyApi.getOrders(query);
            if (!response.success) {
                set({ ordersError: response.error || 'Failed to load orders', loadingOrders: false });
                return;
            }

            const rawData = response.data;
            const orders = (Array.isArray(rawData) ? rawData : (rawData as any)?.orders || (rawData as any)?.data || [])
                .map((order: Record<string, any>) => normalizeOrder(order)) as Order[];
            const pagination = normalizePagination((response as any).pagination, query.page || 1, orders.length);

            set({
                orders,
                ordersPagination: pagination,
                orderSummary: {
                    ...defaultOrderSummary,
                    ...((response as any).summary as Partial<OrderSummary> | undefined),
                },
                ordersQuery: query,
                loadingOrders: false,
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            set({
                ordersError: 'Failed to load orders.',
                loadingOrders: false,
                ordersPagination: { ...defaultPagination },
                orderSummary: { ...defaultOrderSummary },
            });
        }
    },

    fetchPrescriptions: async (params = {}) => {
        set({ loadingPrescriptions: true, error: null });
        try {
            const query = {
                ...get().prescriptionsQuery,
                ...params,
                page: params.page ?? 1,
                limit: params.limit ?? get().prescriptionsQuery.limit ?? 10,
            };
            const response = await pharmacyApi.getPrescriptions(query);
            if (!response.success) {
                set({ error: response.error || 'Failed to load prescriptions', loadingPrescriptions: false });
                return;
            }

            const rawData = response.data;
            const prescriptions = (Array.isArray(rawData) ? rawData : (rawData as any)?.prescriptions || (rawData as any)?.data || [])
                .map((prescription: Record<string, any>) => normalizePrescription(prescription)) as Prescription[];
            const pagination = normalizePagination((response as any).pagination, query.page || 1, prescriptions.length);

            set({
                prescriptions,
                pendingPrescriptions: prescriptions.filter((prescription) => ['pending', 'ready'].includes(prescription.status)),
                prescriptionsPagination: pagination,
                prescriptionsQuery: query,
                loadingPrescriptions: false,
            });
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            set({
                error: 'Failed to load prescriptions.',
                loadingPrescriptions: false,
                prescriptionsPagination: { ...defaultPagination },
            });
        }
    },

    fetchLowStockItems: async () => {
        set({ loadingInventory: true, error: null });
        try {
            const response = await pharmacyApi.getDashboard();
            if (!response.success) {
                set({ error: response.error || 'Failed to load low stock items', loadingInventory: false });
                return;
            }

            const data = response.data as Record<string, unknown>;
            set({
                lowStockItems: ((data.lowStockItems || []) as Record<string, any>[]).map(normalizeInventoryItem),
                loadingInventory: false,
            });
        } catch (error) {
            console.error('Error fetching low stock items:', error);
            set({ error: 'Failed to load low stock items.', loadingInventory: false });
        }
    },

    fetchAnalytics: async (period = '30d') => {
        set({ loadingAnalytics: true, error: null });
        try {
            const response = await pharmacyApi.getAnalytics(period);
            if (!response.success) {
                set({ error: response.error || 'Failed to load analytics', loadingAnalytics: false });
                return;
            }

            const data = response.data as Record<string, any>;
            set({
                analytics: data ? normalizeAnalytics(data, period) : null,
                loadingAnalytics: false,
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            set({ error: 'Failed to load analytics.', loadingAnalytics: false });
        }
    },

    addInventoryItem: async (data) => {
        set({ loadingInventory: true, error: null });
        try {
            const response = await pharmacyApi.addInventoryItem(data);
            if (response.success) {
                // Refresh inventory after adding
                const query = get().inventoryQuery;
                await get().fetchInventory({
                    page: 1, // Reset to first page
                    limit: query.limit,
                    lowStock: query.lowStock,
                });
                return true;
            }
            throw new Error(response.message || 'Failed to add item');
        } catch (error: any) {
            set({ error: error.message || 'Failed to add item', loadingInventory: false });
            return false;
        }
    },
    addBulkInventoryItems: async (items: any[]) => {
        set({ loadingInventory: true, error: null });
        try {
            const response = await pharmacyApi.addBulkInventory(items);
            if (response.success) {
                // Refresh inventory after bulk adding
                const query = get().inventoryQuery;
                await get().fetchInventory({
                    page: 1,
                    limit: query.limit,
                    lowStock: query.lowStock,
                });
                return true;
            }
            throw new Error(response.message || 'Failed to import bulk items');
        } catch (error: any) {
            set({ error: error.message || 'Failed to import bulk items', loadingInventory: false });
            return false;
        }
    },

    updateInventoryItem: async (id, data) => {
        try {
            const response = await pharmacyApi.updateInventoryItem(id, data);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchInventory(get().inventoryQuery),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to update inventory item' });
            return false;
        } catch (error) {
            console.error('Error updating inventory:', error);
            set({ error: 'Failed to update inventory item.' });
            return false;
        }
    },

    deleteInventoryItem: async (id) => {
        try {
            const response = await pharmacyApi.deleteInventoryItem(id);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchInventory(get().inventoryQuery),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to delete inventory item' });
            return false;
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            set({ error: 'Failed to delete inventory item.' });
            return false;
        }
    },

    updateOrderStatus: async (orderId, status) => {
        try {
            const response = await pharmacyApi.updateOrderStatus(orderId, status);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchOrders(get().ordersQuery),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to update order status' });
            return false;
        } catch (error) {
            console.error('Error updating order status:', error);
            set({ error: 'Failed to update order status.' });
            return false;
        }
    },

    fetchReviews: async (page = 1) => {
        set({ loadingReviews: true, error: null });
        try {
            const response = await pharmacyApi.getReviews(page);
            if (!response.success) {
                set({ error: response.error || 'Failed to load reviews', loadingReviews: false });
                return;
            }
            const rawData = response.data;
            const reviews = (Array.isArray(rawData) ? rawData : (rawData as any)?.reviews || (rawData as any)?.data || []) as Review[];
            set({ reviews, loadingReviews: false });
        } catch (error) {
            console.error('Error fetching reviews:', error);
            set({ error: 'Failed to load reviews.', loadingReviews: false });
        }
    },
}));
