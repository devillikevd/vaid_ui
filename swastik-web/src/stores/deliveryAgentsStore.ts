import { create } from 'zustand';
import { fetchWithAuth } from '@/lib/api';

export interface DeliveryAgent {
    id: string;
    facility_id: string;
    facility_type: 'pharmacy' | 'diagnostic_center';
    name: string;
    phone_number: string;
    status: 'active' | 'inactive';
    created_at: string;
}

interface DeliveryAgentsState {
    agents: DeliveryAgent[];
    loading: boolean;
    error: string | null;
    fetchAgents: (facilityId: string) => Promise<void>;
    assignAgent: (orderId: string, orderType: 'pharmacy' | 'diagnostic', agentId: string) => Promise<{ success: boolean; trackingToken?: string }>;
    addAgent: (facilityId: string, facilityType: 'pharmacy' | 'diagnostic_center', name: string, phoneNumber: string) => Promise<boolean>;
    deleteAgent: (agentId: string) => Promise<boolean>;
    clearError: () => void;
}

export const useDeliveryAgentsStore = create<DeliveryAgentsState>((set, get) => ({
    agents: [],
    loading: false,
    error: null,

    fetchAgents: async (facilityId) => {
        set({ loading: true, error: null });
        try {
            const response = await fetchWithAuth(`/delivery-agents/facility/${facilityId}`);
            set({ agents: (response.agents as DeliveryAgent[]) || [], loading: false });
        } catch (error: any) {
            set({ error: error.message || 'Failed to fetch delivery agents', loading: false });
        }
    },

    addAgent: async (facilityId, facilityType, name, phoneNumber) => {
        set({ loading: true, error: null });
        try {
            const response = await fetchWithAuth(`/delivery-agents`, {
                method: 'POST',
                body: JSON.stringify({ facility_id: facilityId, facility_type: facilityType, name, phone: phoneNumber })
            });
            if (!response.success) {
                throw new Error(response.error);
            }
            await get().fetchAgents(facilityId);
            return true;
        } catch (error: any) {
            set({ error: error.message || 'Failed to add agent', loading: false });
            return false;
        }
    },

    assignAgent: async (orderId, orderType, agentId) => {
        set({ loading: true, error: null });
        try {
            const response = await fetchWithAuth(`/delivery-agents/assign`, {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId, order_type: orderType, agent_id: agentId })
            });
            if (!response.success) {
                throw new Error(response.error);
            }
            set({ loading: false });
            return { success: true, trackingToken: response.tracking_token as string };
        } catch (error: any) {
            set({ error: error.message || 'Failed to assign agent', loading: false });
            return { success: false };
        }
    },

    deleteAgent: async (agentId) => {
        set({ loading: true, error: null });
        try {
            const response = await fetchWithAuth(`/delivery-agents/${agentId}`, { method: 'DELETE' });
            if (!response.success) {
                throw new Error(response.error);
            }
            set(state => ({
                agents: state.agents.filter(a => a.id !== agentId),
                loading: false
            }));
            return true;
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete agent', loading: false });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));
