import { authApi } from '@/lib/api';
import { useAuthStore, type ApprovalStatus, type User } from '@/stores/authStore';

export async function refreshAuthenticatedUser(): Promise<User | null> {
    try {
        const response = await authApi.getProfile();
        const nextUser = ((response as any)?.data?.user ?? (response as any)?.data ?? null) as User | null;

        if ((response as any)?.success && nextUser) {
            useAuthStore.setState({ user: nextUser });
            return nextUser;
        }
    } catch {
        // No-op; callers can fall back to their existing UI state.
    }

    return null;
}

export function getResubmissionSuccessMessage(previousStatus: ApprovalStatus | undefined, nextStatus: ApprovalStatus | undefined, defaultMessage: string) {
    if (previousStatus === 'rejected' && nextStatus === 'pending') {
        return 'Settings saved and resubmitted for admin review.';
    }

    return defaultMessage;
}
