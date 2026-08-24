'use client';

import { useEffect, useCallback } from 'react';
import { useDoctorStore } from '@/stores/doctorStore';
import { useAuthStore } from '@/stores/authStore';
import { doctorApi } from '@/lib/api';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

export default function DoctorReviewsPage() {
    const { user } = useAuthStore();
    const { reviews, reviewMetrics, loadingReviews, error, fetchReviews } = useDoctorStore();

    const loadReviews = useCallback(async (page: number = 1) => {
        await fetchReviews(page);
    }, [fetchReviews]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleRespond = async (reviewId: string, responseText: string) => {
        const res = await doctorApi.respondToReview(reviewId, responseText);
        return res.success;
    };

    if (!user) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 min-w-0">
            <ReviewManager 
                reviews={reviews as Review[]}
                metrics={reviewMetrics}
                loadingReviews={loadingReviews}
                error={error}
                fetchReviews={loadReviews}
                themeColor="emerald"
                entityName="Doctor"
                compactHeader={true}
                compactCards={true}
                onRespond={handleRespond}
            />
        </div>
    );
}
