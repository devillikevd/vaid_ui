'use client';

import { create } from 'zustand';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';

export type AuthGateActionType =
    | 'book_appointment'
    | 'diagnostic_booking'
    | 'pharmacy_order'
    | 'health_record'
    | 'record_vital'
    | 'community_ask'
    | 'community_bookmark'
    | 'health_card'
    | 'general';

export interface AuthGateOptions {
    title?: string;
    description?: string;
    actionType?: AuthGateActionType;
    returnUrl?: string;
    onAuthenticated?: () => void;
}

interface AuthGateState {
    isOpen: boolean;
    title: string;
    description: string;
    actionType: AuthGateActionType;
    returnUrl?: string;
    openAuthGate: (options?: AuthGateOptions) => void;
    closeAuthGate: () => void;
}

export const useAuthGateStore = create<AuthGateState>((set) => ({
    isOpen: false,
    title: 'Account Required',
    description: 'Sign in or create a free patient account to complete this action and access your healthcare dashboard.',
    actionType: 'general',
    returnUrl: undefined,
    openAuthGate: (options) => {
        set({
            isOpen: true,
            title: options?.title || 'Account Required',
            description:
                options?.description ||
                'Sign in or create a free patient account to complete this action and access your healthcare dashboard.',
            actionType: options?.actionType || 'general',
            returnUrl: options?.returnUrl,
        });
    },
    closeAuthGate: () => set({ isOpen: false }),
}));

/**
 * Hook to guard protected patient actions.
 * If user is authenticated as a patient, executes onAuthenticated immediately.
 * If user is not authenticated as a patient, opens the polished AuthGateModal.
 */
export function useAuthGate() {
    const { user, isAuthenticated } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const { isOpen, title, description, actionType, returnUrl, openAuthGate, closeAuthGate } =
        useAuthGateStore();

    const requireAuth = (options?: AuthGateOptions) => {
        if (isPatient) {
            if (options?.onAuthenticated) {
                options.onAuthenticated();
            }
            return true;
        }

        openAuthGate(options);
        return false;
    };

    return {
        isAuthenticated: isPatient,
        isPatient,
        isOpen,
        title,
        description,
        actionType,
        returnUrl,
        requireAuth,
        openAuthGate,
        closeAuthGate,
    };
}

