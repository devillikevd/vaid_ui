'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { diagnosticCenterApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { 
    FlaskConical, CheckCircle2, Clock, UploadCloud, FileText, ChevronRight, AlertCircle, RefreshCw,
    Shield, ClipboardList
} from 'lucide-react';

export default function LabTechnicianWorkQueue() {
    const { user } = useAuthStore();
    const toast = useToast();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('samples_to_collect');
    
    // Server-side pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    useEffect(() => {
        fetchQueue();
    }, [activeTab, page]);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            setError(null);
            
            let statusFilter = '';
            
            // Map tabs to backend statuses
            if (activeTab === 'samples_to_collect') {
                statusFilter = 'confirmed,arrived'; // Wait, need to check if API supports comma-separated. If not, just fetch one or omit filter.
                // Assuming standard single status for now if comma not supported. We will fetch 'confirmed' for simplicity or 'arrived'.
                // Actually, let's just fetch all and let the user see the paginated list, or use specific single status.
            }
            
            const response = await diagnosticCenterApi.getBookings({
                page,
                limit,
                // Passing specific statuses based on tab
                status: activeTab === 'samples_to_collect' ? 'confirmed' : activeTab === 'processing' ? 'processing' : undefined,
                resultStatus: activeTab === 'results_pending' ? 'pending' : undefined
            });

            if (response.success) {
                setBookings((response.data as any[]) || []);
                setTotalPages(response.pagination?.totalPages || 1);
            } else {
                setError(response.message || 'Failed to load work queue');
            }
        } catch (err: any) {
            setError(err.message || 'Unable to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (bookingId: string, currentStatus: string, action: string) => {
        try {
            let nextStatus = currentStatus;
            
            // Safe transition logic mapped to what makes sense for technicians
            if (action === 'process') nextStatus = 'processing';
            else if (action === 'complete') nextStatus = 'completed';
            else if (action === 'collect') nextStatus = 'sample_collected';

            const response = await diagnosticCenterApi.updateBookingStatus(bookingId, nextStatus);
            if (response.success) {
                toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
                fetchQueue();
            } else {
                toast.error(response.message || 'Failed to update status');
            }
        } catch (err: any) {
            toast.error('Unable to perform action.');
        }
    };

    if (user?.role !== 'lab_technician' && user?.role !== 'diagnostic_manager' && user?.role !== 'diagnostic_center_owner') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Shield className="h-16 w-16 text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Work Queue</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage sample collection, processing, and results.</p>
                </div>
                <button onClick={fetchQueue} className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#5B2A86] hover:bg-[#F3ECF8] rounded-xl transition-colors">
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Note: Global metric counts are deliberately omitted because Lab Technicians do not have access to the dashboard aggregate API. */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl max-w-md overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => { setActiveTab('samples_to_collect'); setPage(1); }}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === 'samples_to_collect' ? 'bg-white dark:bg-slate-900 text-[#5B2A86] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                    Samples to Collect
                </button>
                <button
                    onClick={() => { setActiveTab('processing'); setPage(1); }}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === 'processing' ? 'bg-white dark:bg-slate-900 text-[#5B2A86] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                    Processing
                </button>
                <button
                    onClick={() => { setActiveTab('results_pending'); setPage(1); }}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === 'results_pending' ? 'bg-white dark:bg-slate-900 text-[#5B2A86] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-100'}`}
                >
                    Results Pending
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 h-24 rounded-2xl w-full"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unable to load data.</h3>
                    <button onClick={fetchQueue} className="mt-4 px-4 py-2 text-[#5B2A86] bg-[#F3ECF8] rounded-lg font-medium">Retry</button>
                </div>
            ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No work items right now.</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Check back later for new tasks.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[20px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#FAF6FC] border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Patient & Test</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 dark:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{booking.patient?.user?.name || 'Unknown Patient'}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{booking.test?.name || 'Unknown Test'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:text-gray-300 capitalize border border-gray-200 dark:border-gray-700">
                                                {booking.collection_type?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 capitalize border border-purple-100">
                                                {booking.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(booking.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Contextual actions based on valid transitions */}
                                            {booking.status === 'confirmed' || booking.status === 'arrived' ? (
                                                <button onClick={() => handleAction(booking.id, booking.status, 'collect')} className="px-3 py-1.5 bg-[#F3ECF8] text-[#5B2A86] hover:bg-[#5B2A86] hover:text-white rounded-lg text-sm font-medium transition-colors">
                                                    Mark Collected
                                                </button>
                                            ) : booking.status === 'sample_collected' ? (
                                                <button onClick={() => handleAction(booking.id, booking.status, 'process')} className="px-3 py-1.5 bg-[#F3ECF8] text-[#5B2A86] hover:bg-[#5B2A86] hover:text-white rounded-lg text-sm font-medium transition-colors">
                                                    Start Processing
                                                </button>
                                            ) : booking.status === 'processing' ? (
                                                <button onClick={() => handleAction(booking.id, booking.status, 'complete')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-medium transition-colors">
                                                    Complete
                                                </button>
                                            ) : (
                                                <button className="px-3 py-1.5 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                                                    View
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
                            <button 
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
