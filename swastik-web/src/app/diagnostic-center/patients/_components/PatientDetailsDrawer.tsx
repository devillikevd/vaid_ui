import React, { useEffect, useState, useCallback } from 'react';
import { X, Calendar, FlaskConical, FileText, Activity, Clock, Phone, User, IndianRupee, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface PatientDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string | null;
    patientData: any | null; // Data from the list table summary
}

export default function PatientDetailsDrawer({ isOpen, onClose, patientId, patientData }: PatientDetailsDrawerProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    const fetchHistory = useCallback(async (pageNum: number) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.diagnosticCenter.getPatientHistory(patientId, { page: pageNum, limit });
            if (response.success) {
                setHistory((response.data as any[]) || []);
                setTotalPages(response.pagination?.totalPages || 1);
            } else {
                setError(response.error || 'Failed to fetch history');
            }
        } catch (err) {
            setError('An unexpected error occurred while fetching patient history.');
        } finally {
            setLoading(false);
        }
    }, [patientId, limit]);

    useEffect(() => {
        if (isOpen && patientId) {
            setPage(1);
            fetchHistory(1);
        } else {
            setHistory([]);
            setError(null);
        }
    }, [isOpen, patientId, fetchHistory]);

    if (!isOpen || !patientData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#0B1020] sm:rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl animate-in slide-in-from-right sm:zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800/60">
                
                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800/60 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {patientData.name || 'Unknown Patient'}
                            <span className="text-xs font-mono font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">ID: {patientData.id.split('-')[0]}</span>
                        </h3>
                        {patientData.phone && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                                <Phone className="w-3.5 h-3.5" /> {patientData.phone}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                    {/* PATIENT SUMMARY METRICS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Bookings</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{patientData.total_bookings || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Pending</div>
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500 mt-1">{patientData.pending_bookings || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Completed</div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-500 mt-1">{patientData.completed_bookings || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Gender / DOB</div>
                            <div className="text-md font-semibold text-gray-900 dark:text-gray-200 mt-1">
                                {patientData.gender ? patientData.gender.charAt(0).toUpperCase() + patientData.gender.slice(1) : 'Unknown'} 
                                {patientData.dob ? ` • ${new Date().getFullYear() - new Date(patientData.dob).getFullYear()}y` : ''}
                            </div>
                        </div>
                    </div>

                    {/* HISTORY TIMELINE */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-600" /> Diagnostic History
                        </h4>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center justify-between border border-red-200 dark:border-red-800/60">
                                <span>{error}</span>
                                <Button variant="outline" size="sm" onClick={() => fetchHistory(page)} className="border-red-200 text-red-600 hover:bg-red-100">Retry</Button>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No diagnostic bookings found for this patient.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map(booking => (
                                    <div key={booking.id} className="bg-white dark:bg-[#0B1020] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:border-purple-300 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                            
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-purple-700 dark:text-purple-400">{booking.test_name || 'Unknown Test'}</span>
                                                    <StatusBadge status={booking.status} />
                                                    {booking.collection_type === 'home_collection' ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                                            <MapPin className="w-3 h-3" /> Home
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                                            <User className="w-3 h-3" /> Walk-in
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(booking.booking_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <IndianRupee className="w-3.5 h-3.5" />
                                                        {booking.price_snapshot !== null && booking.price_snapshot !== undefined ? (
                                                            <span className="font-medium text-gray-800 dark:text-gray-200">{booking.price_snapshot}</span>
                                                        ) : (
                                                            <span className="italic text-gray-500 text-xs">Price unavailable</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center justify-end">
                                                {booking.has_report && (
                                                    <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30 gap-2 w-full md:w-auto" onClick={() => window.open(`/api/diagnostic-centers/owner/bookings/${booking.id}/report`, '_blank', 'noopener,noreferrer')}>
                                                        <FileText className="w-4 h-4" />
                                                        View Report
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {totalPages > 1 && (
                                    <div className="pt-4 flex justify-center">
                                        <Pagination
                                            currentPage={page}
                                            totalPages={totalPages}
                                            onPageChange={(p) => { setPage(p); fetchHistory(p); }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
