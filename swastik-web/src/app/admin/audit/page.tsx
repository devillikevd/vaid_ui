'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    History, Search, Filter, User, Shield, Settings, FileText,
    CheckCircle, XCircle, Eye, Download, Calendar, Loader2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminApi } from '@/lib/api';

type ActionType = 'approval' | 'rejection' | 'update' | 'login' | 'settings' | 'view' | 'create' | 'delete';

interface AuditLog {
    id: string;
    action: string;
    description: string;
    user: string;
    userEmail?: string | null;
    userRole: string;
    target?: string;
    timestamp: string;
    ip?: string;
    resourceType?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    approval: { icon: CheckCircle, color: 'bg-green-100 text-green-600', label: 'Approval' },
    approve: { icon: CheckCircle, color: 'bg-green-100 text-green-600', label: 'Approval' },
    rejection: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Rejection' },
    reject: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Rejection' },
    update: { icon: FileText, color: 'bg-blue-100 text-blue-600', label: 'Update' },
    login: { icon: User, color: 'bg-purple-100 text-purple-600', label: 'Login' },
    settings: { icon: Settings, color: 'bg-orange-100 text-orange-600', label: 'Settings' },
    suspended: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700', label: 'Suspended' },
    reactivate: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Reactivated' },
    activate: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Activated' },
    deactivate: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Deactivated' },
    logout: { icon: User, color: 'bg-slate-100 text-slate-600', label: 'Logout' },
    status: { icon: Shield, color: 'bg-cyan-100 text-cyan-700', label: 'Status Update' },
    view: { icon: Eye, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'View' },
    create: { icon: FileText, color: 'bg-blue-100 text-blue-600', label: 'Create' },
    delete: { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Delete' },
};

const DEFAULT_ACTION = { icon: FileText, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'Action' };

const normalizeActionKey = (actionRaw: string) => {
    const action = String(actionRaw || 'update').toLowerCase();
    if (action.includes('approved')) return 'approve';
    if (action.includes('rejected')) return 'reject';
    if (action.includes('suspended')) return 'suspended';
    if (action.includes('reactivated')) return 'reactivate';
    if (action.includes('deactivate')) return 'deactivate';
    if (action.includes('activate')) return 'activate';
    if (action.includes('settings')) return 'settings';
    if (action.includes('login')) return 'login';
    if (action.includes('logout')) return 'logout';
    if (action.includes('status')) return 'status';
    if (action.includes('create')) return 'create';
    if (action.includes('delete')) return 'delete';
    if (action.includes('view')) return 'view';
    return 'update';
};

const humanizeAction = (actionRaw: string) =>
    String(actionRaw || 'action')
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sourceStatus, setSourceStatus] = useState<'available' | 'unavailable'>('available');
    const [sourceMessage, setSourceMessage] = useState<string | null>(null);

    const fetchAuditLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await adminApi.getAuditLogs(
                searchQuery.trim() ? { search: searchQuery.trim() } : undefined,
                page,
                25
            );
            if (!result.success) throw new Error('Failed to fetch audit logs');

            const rows = Array.isArray(result.data) ? result.data : [];
            const normalized: AuditLog[] = rows.map((row: any) => {
                const actionRaw = String(row.action || row.eventType || 'update');
                const action = normalizeActionKey(actionRaw);
                const user = row.user?.name || row.userName || row.actorName || row.user || row.userEmail || (row.userId ? `User ${String(row.userId).slice(0, 8)}` : 'System');
                const userRole = row.userRole || row.actorRole || row.role || 'unknown';
                const description = row.description
                    || row.message
                    || row.details?.message
                    || `${humanizeAction(actionRaw)} performed`;

                return {
                    id: row._id || row.id || `${actionRaw}-${row.createdAt || row.timestamp || Math.random()}`,
                    action,
                    description,
                    user,
                    userEmail: row.user?.email || row.userEmail || null,
                    userRole,
                    target: row.entityId || row.resourceId || row.target,
                    timestamp: row.createdAt || row.timestamp || new Date().toISOString(),
                    ip: row.ipAddress || row.ip,
                    resourceType: row.resourceType || row.entityType || undefined,
                };
            });

            setLogs(normalized);
            setTotalPages(result.pagination?.totalPages || 1);
            setSourceStatus((result as { sourceStatus?: 'available' | 'unavailable' }).sourceStatus || 'available');
            setSourceMessage((result as { message?: string }).message || null);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    }, [page, searchQuery]);

    useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);
    useEffect(() => { setPage(1); }, [searchQuery]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Trail</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Track all administrative actions and changes</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={fetchAuditLogs} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                </div>
            </div>

            <Card padding="sm">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Input placeholder="Search audit logs..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} />
                    </div>
                </div>
            </Card>

            {sourceStatus === 'unavailable' && sourceMessage && (
                <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {sourceMessage}
                </div>
            )}

            <Card padding="none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading audit logs...</span>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-red-600">{error}</p>
                        <Button className="mt-4" onClick={fetchAuditLogs} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {sourceStatus === 'unavailable' ? 'Audit log storage is currently unavailable' : 'No audit logs found'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {logs.map((log) => {
                            const actionConfig = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                            const ActionIcon = actionConfig.icon;
                            return (
                                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${actionConfig.color}`}><ActionIcon className="h-4 w-4" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.description}</p>
                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1"><User className="h-3 w-3" />{log.user}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{log.userRole}</span>
                                                {log.resourceType && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{log.resourceType}</span>}
                                                {log.target && <span>Target: {log.target}</span>}
                                                {log.ip && <span>IP: {log.ip}</span>}
                                            </div>
                                            {log.userEmail && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{log.userEmail}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionConfig.color}`}>
                                                {actionConfig.label}
                                            </span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTime(log.timestamp)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
