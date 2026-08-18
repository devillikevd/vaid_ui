'use client';

import { useEffect, useCallback } from 'react';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { pharmacyApi } from '@/lib/api';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';

export default function PharmacyReviewsPage() {
    const { reviews, loadingReviews, error, fetchReviews } = usePharmacyStore();

    const loadReviews = useCallback(async (page: number = 1) => {
        await fetchReviews(page);
    }, [fetchReviews]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    const handleRespond = async (reviewId: string, responseText: string) => {
        const res = await pharmacyApi.respondToReview(reviewId, responseText);
        return res.success;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <ReviewManager 
                reviews={reviews as Review[]}
                loadingReviews={loadingReviews}
                error={error}
                fetchReviews={loadReviews}
                themeColor="orange"
                isFacility={true}
                entityName="Pharmacy"
                onRespond={handleRespond}
            />
        </div>
    );
}
