'use client';

import { useEffect, useCallback } from 'react';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';

export default function PharmacyReviewsPage() {
    const { reviews, loadingReviews, error, fetchReviews } = usePharmacyStore();

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
                themeColor="orange"
            />
        </div>
    );
}
