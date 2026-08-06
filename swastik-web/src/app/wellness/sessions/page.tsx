'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    CalendarCheck,
    CheckCircle,
    Clock,
    Filter,
    Loader2,
    MessageSquare,
    RefreshCw,
    Video,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { wellnessApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface WellnessSession {
    id: string;
    session_number?: string;
    scheduled_at: string;
    status: string;
    session_type?: string;
    duration_minutes?: number;
    fee?: number | string;
    room_id?: string;
    patient?: { id: string; name?: string | null };
    patient_notes?: string | null;
    coach_notes?: string | null;
    safety_flags?: string[];
}

const formatDT = (v: string) => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_FILTERS = ['all', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

export default function WellnessSessionsPage() {
    const toast = useToast();
    const [sessions, setSessions] = useState<WellnessSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await wellnessApi.getSessions(statusFilter === 'all' ? undefined : statusFilter);
            if (!res.success) throw new Error(res.error || 'Failed to load sessions');
            setSessions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error('Load failed', err instanceof Error ? err.message : 'Unable to load sessions');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    const updateSession = async (sessionId: string, updates: Record<string, unknown>, label: string) => {
        setActionLoading(sessionId);
        try {
            const res = await wellnessApi.updateCoachAvailability(updates); // TODO: replace with updateSession endpoint if available
            if (!res.success) throw new Error(res.error || `Failed to ${label}`);
            toast.success('Updated', `Session ${label} successfully`);
            await loadSessions();
        } catch (err) {
            toast.error(`${label} failed`, err instanceof Error ? err.message : `Unable to ${label}`);
        } finally {
            setActionLoading(null);
        }
    };

    const upcoming = sessions
        .filter(s => new Date(s.scheduled_at).getTime() >= Date.now() && !['cancelled', 'completed'].includes(s.status))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const past = sessions
        .filter(s => new Date(s.scheduled_at).getTime() < Date.now() || ['cancelled', 'completed'].includes(s.status))
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    const todaySessions = sessions.filter(s => {
        const d = new Date(s.scheduled_at);
        const now = new Date();
        return d.toDateString() === now.toDateString() && !['cancelled', 'completed'].includes(s.status);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sessions</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your coaching sessions — view, confirm, or join video calls.</p>
                </div>
                <Button variant="outline" onClick={loadSessions} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={isLoading}>Refresh</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Sessions</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{todaySessions.length}</p>
                        </div>
                        <div className="rounded-xl bg-lime-100 p-3"><CalendarCheck className="h-6 w-6 text-lime-700" /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{upcoming.length}</p>
                        </div>
                        <div className="rounded-xl bg-blue-100 p-3"><Clock className="h-6 w-6 text-blue-700" /></div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{sessions.length}</p>
                        </div>
                        <div className="rounded-xl bg-purple-100 p-3"><CheckCircle className="h-6 w-6 text-purple-700" /></div>
                    </div>
                </Card>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {STATUS_FILTERS.map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                            statusFilter === status
                                ? 'bg-lime-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                    >
                        {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-lime-600" /></div>
            ) : sessions.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center gap-3 p-12">
                        <CalendarCheck className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500 dark:text-gray-400">No sessions found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {upcoming.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-lime-600" /> Upcoming ({upcoming.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {upcoming.map(session => (
                                        <SessionRow key={session.id} session={session} actionLoading={actionLoading} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {past.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-500"><CheckCircle className="h-5 w-5" /> Past ({past.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {past.slice(0, 20).map(session => (
                                        <SessionRow key={session.id} session={session} actionLoading={actionLoading} isPast />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

function SessionRow({ session, actionLoading, isPast }: { session: WellnessSession; actionLoading: string | null; isPast?: boolean }) {
    const isToday = new Date(session.scheduled_at).toDateString() === new Date().toDateString();
    const isActive = ['scheduled', 'confirmed', 'in_progress'].includes(session.status);
    const canJoin = isActive && (session.session_type === 'video' || session.session_type === 'audio') && isToday;

    return (
        <div className={`flex flex-col gap-3 py-4 first:pt-0 last:pb-0 ${isPast ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 rounded-xl p-2.5 ${session.session_type === 'video' ? 'bg-blue-100 text-blue-700' : session.session_type === 'chat' ? 'bg-emerald-100 text-emerald-700' : 'bg-lime-100 text-lime-700'}`}>
                        {session.session_type === 'video' ? <Video className="h-5 w-5" /> : session.session_type === 'chat' ? <MessageSquare className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{session.patient?.name || 'Client'}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDT(session.scheduled_at)}</span>
                            <span className="capitalize">{session.session_type || 'video'}</span>
                            {session.duration_minutes && <span>{session.duration_minutes} min</span>}
                            {session.fee && Number(session.fee) > 0 && <span>₹{Number(session.fee).toLocaleString('en-IN')}</span>}
                        </div>
                        {session.patient_notes && <p className="mt-1 text-xs text-gray-400 truncate max-w-md">Patient: {session.patient_notes}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={session.status as never} size="sm" />
                    {canJoin && session.room_id && (
                        <Link href={`/consultation/${session.room_id}`}>
                            <Button size="sm" variant="primary" leftIcon={<Video className="h-4 w-4" />}>
                                Join Call
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
