'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHospitalStore } from '@/stores/hospitalStore';
import { hospitalApi } from '@/lib/api';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';

export default function HospitalReviewsPage() {
    const { reviews: hospitalReviews, loadingReviews: hospitalLoading, error: hospitalError, fetchReviews: fetchHospitalReviews } = useHospitalStore();
    const [activeTab, setActiveTab] = useState<'hospital' | 'doctors'>('hospital');
    const [doctorReviews, setDoctorReviews] = useState<Review[]>([]);
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [doctorError, setDoctorError] = useState<string | null>(null);

    const loadHospitalReviews = useCallback(async (page: number = 1) => {
        await fetchHospitalReviews(page);
    }, [fetchHospitalReviews]);

    const loadDoctorReviews = useCallback(async (page: number = 1) => {
        setDoctorLoading(true);
        setDoctorError(null);
        try {
            const res = await hospitalApi.getDoctorReviews(page, 20);
            if (res.success) {
                setDoctorReviews((res.data || []) as Review[]);
            } else {
                setDoctorError(res.error || 'Failed to load doctor reviews');
            }
        } catch {
            setDoctorError('Network error while loading doctor reviews');
        } finally {
            setDoctorLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHospitalReviews();
        loadDoctorReviews();
    }, [loadHospitalReviews, loadDoctorReviews]);

    const handleRespond = async (reviewId: string, responseText: string) => {
        const res = await hospitalApi.respondToReview(reviewId, responseText);
        return res.success;
    };

    const isHospitalTab = activeTab === 'hospital';

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <ReviewManager 
                reviews={isHospitalTab ? (hospitalReviews as Review[]) : doctorReviews}
                loadingReviews={isHospitalTab ? hospitalLoading : doctorLoading}
                error={isHospitalTab ? hospitalError : doctorError}
                fetchReviews={isHospitalTab ? loadHospitalReviews : loadDoctorReviews}
                themeColor="blue"
                isFacility={true}
                entityName={isHospitalTab ? 'Hospital' : 'Doctor'}
                onRespond={isHospitalTab ? handleRespond : undefined}
                tabs={[
                    { id: 'hospital', label: 'Hospital Reviews', count: hospitalReviews.length },
                    { id: 'doctors', label: 'Affiliated Doctor Reviews', count: doctorReviews.length }
                ]}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId as 'hospital' | 'doctors')}
            />
        </div>
    );
}
