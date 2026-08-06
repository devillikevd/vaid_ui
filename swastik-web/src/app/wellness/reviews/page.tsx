'use client';

import { useCallback, useEffect, useState } from 'react';
import { Globe, Loader2, RefreshCw, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CoachProfile {
    id: string; name: string; rating?: number; total_reviews?: number; languages?: string[];
}

export default function WellnessReviewsPage() {
    const toast = useToast();
    const [profile, setProfile] = useState<CoachProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getCoachProfile();
            if (!res.success) throw new Error(res.error || 'Failed');
            setProfile(res.data as CoachProfile);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load reviews');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>;

    const rating = profile?.rating != null ? Number(profile.rating) : null;
    const languages = Array.isArray(profile?.languages) ? profile.languages : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reviews & Trust</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Your ratings and trust signals visible to patients.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="flex flex-col items-center py-8">
                        <div className="rounded-full bg-amber-50 p-4">
                            <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {rating != null ? rating.toFixed(1) : '—'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Average Rating</p>
                        {rating != null && (
                            <div className="flex gap-0.5 mt-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-5 w-5 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-center py-8">
                        <div className="rounded-full bg-blue-50 p-4">
                            <Star className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {profile?.total_reviews ?? 0}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-center py-8">
                        <div className="rounded-full bg-lime-50 p-4">
                            <Globe className="h-8 w-8 text-lime-600" />
                        </div>
                        <p className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                            {languages.length > 0 ? languages.join(', ') : 'Not set'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Languages</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Patient Reviews</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center py-8 text-gray-500 dark:text-gray-400">
                        <Star className="h-10 w-10 text-gray-300 mb-2" />
                        <p>Patient reviews will appear here as clients rate your sessions.</p>
                        <p className="text-sm mt-1">Complete more sessions to receive your first reviews.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
