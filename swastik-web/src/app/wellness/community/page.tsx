'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, RefreshCw, Target, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface WellnessGroup { id: string; name: string; goal_tag?: string; city?: string | null; member_count?: number; }

export default function WellnessCommunityPage() {
    const toast = useToast();
    const [groups, setGroups] = useState<WellnessGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getGroups();
            setGroups(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load communities');
        } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Goal-based communities and wellness groups.</p>
                </div>
                <Button variant="outline" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {groups.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center gap-3 p-12">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 dark:text-gray-400">No communities created yet. Communities appear after seeding or user creation.</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map(g => (
                        <Card key={g.id}>
                            <CardContent>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{g.name}</p>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {g.goal_tag && <span className="flex items-center gap-1"><Target className="h-3 w-3" />{g.goal_tag}</span>}
                                            {g.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{g.city}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700">
                                        <Users className="h-3 w-3" />{g.member_count ?? 0}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
