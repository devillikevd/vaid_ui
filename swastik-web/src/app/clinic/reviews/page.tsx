'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClinicStore } from '@/stores/clinicStore';
import { clinicApi } from '@/lib/api';
import ReviewManager, { type Review } from '@/components/shared/ReviewManager';

function ClinicReviewsContent() {
    const searchParams = useSearchParams();
    const { reviews: clinicReviews, loadingReviews: clinicLoading, error: clinicError, fetchReviews: fetchClinicReviews } = useClinicStore();

    const paramTab = searchParams.get('tab');
    const initialTab: 'clinic' | 'doctors' = paramTab === 'doctors' ? 'doctors' : 'clinic';

    const [activeTab, setActiveTab] = useState<'clinic' | 'doctors'>(initialTab);
    const [doctorReviews, setDoctorReviews] = useState<Review[]>([]);
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [doctorError, setDoctorError] = useState<string | null>(null);

    useEffect(() => {
        if (paramTab === 'doctors' || paramTab === 'clinic') {
            setActiveTab(paramTab);
        }
    }, [paramTab]);

    const loadClinicReviews = useCallback(async (page: number = 1) => {
        await fetchClinicReviews(page);
    }, [fetchClinicReviews]);

    const loadDoctorReviews = useCallback(async (page: number = 1) => {
        setDoctorLoading(true);
        setDoctorError(null);
        try {
            const res = await clinicApi.getDoctorReviews(page, 20);
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
        loadClinicReviews();
        loadDoctorReviews();
    }, [loadClinicReviews, loadDoctorReviews]);

    const handleRespond = async (reviewId: string, responseText: string) => {
        const res = await clinicApi.respondToReview(reviewId, responseText);
        return res.success;
    };

    const isClinicTab = activeTab === 'clinic';

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <ReviewManager 
                reviews={isClinicTab ? (clinicReviews as Review[]) : doctorReviews}
                loadingReviews={isClinicTab ? clinicLoading : doctorLoading}
                error={isClinicTab ? clinicError : doctorError}
                fetchReviews={isClinicTab ? loadClinicReviews : loadDoctorReviews}
                themeColor="pink"
                isFacility={true}
                entityName={isClinicTab ? 'Clinic' : 'Doctor'}
                onRespond={isClinicTab ? handleRespond : undefined}
                tabs={[
                    { id: 'clinic', label: 'Clinic Reviews', count: clinicReviews.length },
                    { id: 'doctors', label: 'Affiliated Doctor Reviews', count: doctorReviews.length }
                ]}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId as 'clinic' | 'doctors')}
            />
        </div>
    );
}

export default function ClinicReviewsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading reviews...</div>}>
            <ClinicReviewsContent />
        </Suspense>
    );
}
