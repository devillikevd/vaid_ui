'use client';

import { useEffect, useCallback } from 'react';
import { useDoctorStore } from '@/stores/doctorStore';
import { useAuthStore } from '@/stores/authStore';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function DoctorReviewsPage() {
    const { user } = useAuthStore();
    const userId = user?.id;
    const { reviews, loadingReviews, error, fetchReviews } = useDoctorStore();

    const loadReviews = useCallback(async (page: number = 1) => {
        await fetchReviews(page);
    }, [fetchReviews]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    if (!user) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <ReviewManager 
                reviews={reviews as Review[]}
                loadingReviews={loadingReviews}
                error={error}
                fetchReviews={loadReviews}
                themeColor="emerald"
            />
        </div>
    );
}
