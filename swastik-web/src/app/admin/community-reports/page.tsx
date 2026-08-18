'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, EyeOff, Loader2, RefreshCw, Archive, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function AdminCommunityReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('open');

    const loadReports = async () => {
        setLoading(true);
        try {
            const res = await api.community.getReports(statusFilter);
            if (res.success) {
                setReports(res.data as any[]);
            }
        } catch (err) {
            console.error('Failed to load reports', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [statusFilter]);

    const handleUpdateStatus = async (reportId: string, status: string) => {
        try {
            await api.community.updateReportStatus(reportId, status);
            loadReports();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleModerate = async (targetType: string, targetId: string, action: 'hidden' | 'active') => {
        try {
            await api.community.moderateContent(targetType, targetId, action);
            alert(`Content marked as ${action}`);
            loadReports();
        } catch (err) {
            alert('Failed to moderate content');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Community Moderation</h1>
                        <p className="text-gray-500">Review and resolve reported community Q&A content.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-semibold"
                    >
                        <option value="open">Open Reports</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                    </select>
                    <Button onClick={loadReports} className="h-11 rounded-xl" variant="outline">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center p-20 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold">All caught up!</h3>
                    <p className="text-gray-500">No reports found for this status.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${report.target_type === 'question' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {report.target_type}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
                                            {report.reason}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">Reported by {report.reporter?.email || report.reporter_user_id} on {new Date(report.created_at).toLocaleString()}</p>
                                    {report.details && (
                                        <p className="mt-2 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 italic">
                                            "{report.details}"
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {statusFilter === 'open' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(report.id, 'under_review')} variant="outline">
                                            Review
                                        </Button>
                                    )}
                                    {statusFilter !== 'resolved' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(report.id, 'resolved')} className="bg-emerald-600 hover:bg-emerald-700">
                                            Resolve
                                        </Button>
                                    )}
                                    {statusFilter !== 'dismissed' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(report.id, 'dismissed')} variant="outline" className="text-gray-500">
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Content {report.target_content?.status === 'hidden' ? '(HIDDEN)' : ''}</h4>
                                {report.target_content ? (
                                    <>
                                        {report.target_type === 'question' ? (
                                            <div>
                                                <h5 className="font-bold">{report.target_content.title}</h5>
                                            </div>
                                        ) : (
                                            <p className="text-sm">{report.target_content.content}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-red-500">Content not found or deleted.</p>
                                )}
                                
                                <div className="mt-4 flex gap-2">
                                    {report.target_content?.status === 'active' ? (
                                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleModerate(report.target_type, report.target_id, 'hidden')}>
                                            <EyeOff className="w-4 h-4 mr-2" /> Hide from public
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleModerate(report.target_type, report.target_id, 'active')}>
                                            <Eye className="w-4 h-4 mr-2" /> Restore to public
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
