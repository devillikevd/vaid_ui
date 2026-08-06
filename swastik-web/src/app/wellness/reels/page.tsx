'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Film, Heart, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface CoachReel { id: string; title: string; video_url?: string | null; thumbnail_url?: string | null; category?: string; likes_count?: number; views_count?: number; status?: string; }

export default function WellnessReelsPage() {
    const toast = useToast();
    const [reels, setReels] = useState<CoachReel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getCoachReels();
            setReels(res.success ? (Array.isArray(res.data) ? res.data : []) : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load reels');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const publishReel = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const videoUrl = String(fd.get('reelUrl') || '').trim();
        if (!videoUrl) return;
        try {
            const res = await wellnessApi.createReel({
                video_url: videoUrl,
                title: String(fd.get('reelTitle') || 'Fitness tip').trim(),
                category: String(fd.get('reelCategory') || 'fitness'),
            });
            if (!res.success) throw new Error(res.error || 'Failed');
            toast.success('Reel published', 'Your reel is live on the marketplace.');
            form.reset();
            await load();
        } catch (err) { toast.error('Publish failed', err instanceof Error ? err.message : 'Unable to publish reel'); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reels</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Publish short fitness videos to attract clients.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {/* Publish form */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-lime-600" /> Publish New Reel</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={publishReel} className="flex flex-col sm:flex-row gap-3">
                        <input name="reelUrl" placeholder="Video URL (e.g. https://…/short.mp4)" className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900" required />
                        <input name="reelTitle" placeholder="Short title" className="sm:w-48 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900" />
                        <select name="reelCategory" className="sm:w-36 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                            <option value="fitness">Fitness</option><option value="yoga">Yoga</option><option value="nutrition">Nutrition</option><option value="mobility">Mobility</option>
                        </select>
                        <Button type="submit" leftIcon={<Film className="h-4 w-4" />}>Publish</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Reels grid */}
            {reels.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center gap-3 p-12">
                        <Film className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 dark:text-gray-400">No reels published yet. Create your first one above!</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reels.map(reel => (
                        <Card key={reel.id}>
                            {reel.thumbnail_url && (
                                <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={reel.thumbnail_url} alt={reel.title} className="h-full w-full object-cover" loading="lazy" />
                                </div>
                            )}
                            <CardContent>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{reel.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{reel.category || 'fitness'}</p>
                                    </div>
                                    <StatusBadge status={reel.status as never} size="sm" />
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{reel.views_count ?? 0}</span>
                                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{reel.likes_count ?? 0}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
