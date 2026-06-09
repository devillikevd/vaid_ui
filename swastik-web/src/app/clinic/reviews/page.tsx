'use client';

import { useEffect, useCallback } from 'react';
import { useClinicStore } from '@/stores/clinicStore';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';

export default function ClinicReviewsPage() {
    const { reviews, loadingReviews, error, fetchReviews } = useClinicStore();

    const loadReviews = useCallback(async (page: number = 1) => {
        await fetchReviews(page);
    }, [fetchReviews]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <ReviewManager 
                reviews={reviews as Review[]}
                loadingReviews={loadingReviews}
                error={error}
                fetchReviews={loadReviews}
                themeColor="pink"
            />
        </div>
    );
}
