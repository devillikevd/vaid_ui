'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, Phone, RefreshCw, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface WellnessSession {
    id: string;
    session_number?: string;
    scheduled_at: string;
    status: string;
    session_type?: string;
    duration_minutes?: number;
    room_id?: string;
    patient?: { id: string; name?: string | null };
}

const formatDT = (v: string) => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function WellnessConsultationsPage() {
    const toast = useToast();
    const [sessions, setSessions] = useState<WellnessSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getSessions();
            if (!res.success) throw new Error(res.error || 'Failed to load');
            const all = Array.isArray(res.data) ? (res.data as WellnessSession[]) : [];
            // Only show video/audio sessions that are active
            setSessions(all.filter(s => ['video', 'audio'].includes(s.session_type || 'video')));
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load consultations');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const today = sessions.filter(s => {
        const d = new Date(s.scheduled_at);
        return d.toDateString() === new Date().toDateString() && ['scheduled', 'confirmed', 'in_progress'].includes(s.status);
    });
    const active = sessions.filter(s => ['in_progress', 'active'].includes(s.status));
    const upcoming = sessions
        .filter(s => new Date(s.scheduled_at).getTime() > Date.now() && ['scheduled', 'confirmed'].includes(s.status))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const past = sessions
        .filter(s => ['completed', 'cancelled'].includes(s.status) || new Date(s.scheduled_at).getTime() < Date.now())
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading consultations...</span></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consultations</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Join video and audio calls with your clients.</p>
                </div>
                <Button onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            {/* Active / today banner */}
            {today.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-r from-lime-600 to-emerald-600 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-lime-100">Today&apos;s Consultations</p>
                            <p className="mt-1 text-xl font-bold">{today.length} session{today.length > 1 ? 's' : ''} scheduled</p>
                        </div>
                        <Video className="h-10 w-10 text-lime-200" />
                    </div>
                </div>
            )}

            {/* Session list */}
            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No video or audio consultations found. Sessions booked by patients will appear here.</div>
                    ) : [...active, ...upcoming, ...past].map(session => {
                        const isToday = new Date(session.scheduled_at).toDateString() === new Date().toDateString();
                        const canJoin = ['scheduled', 'confirmed', 'in_progress'].includes(session.status) && isToday;
                        const isActive = ['in_progress', 'active'].includes(session.status);

                        return (
                            <div key={session.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isActive ? 'bg-lime-50/50 dark:bg-lime-950/20' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl ${session.session_type === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {session.session_type === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{session.patient?.name || 'Client'}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDT(session.scheduled_at)}</span>
                                                <span className="capitalize">{session.session_type || 'video'}</span>
                                                {session.duration_minutes && <span>{session.duration_minutes} min</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={session.status as never} size="sm" />
                                        {canJoin && session.room_id && (
                                            <Link href={`/consultation/${session.room_id}`}>
                                                <Button size="sm" variant="primary" leftIcon={<Video className="h-4 w-4" />}>
                                                    {isActive ? 'Rejoin' : 'Join'}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
