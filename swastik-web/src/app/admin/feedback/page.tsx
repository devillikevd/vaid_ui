'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MessageSquare, Search, Filter, Check, X, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminFeedbackDashboard() {
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', category: '', search: '' });
  
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [pagination.page, filters.status, filters.type, filters.category]);

  // Debounced Search
  useEffect(() => {
    const timeout = setTimeout(() => {
        fetchFeedback();
    }, 500);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getFeedback(filters, pagination.page, pagination.limit);
      if (res.success) {
        setFeedbacks((res.data as any[]) || []);
        setSummary(res.summary || {});
        setPagination((res.pagination as any) || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
        if (adminResponse && adminResponse !== selectedFeedback.adminResponse) {
            await adminApi.respondToFeedback(selectedFeedback._id, adminResponse, updateStatus || selectedFeedback.status);
        } else if (updateStatus && updateStatus !== selectedFeedback.status) {
            await adminApi.updateFeedbackStatus(selectedFeedback._id, updateStatus);
        }
        
        toast.success('Feedback updated successfully');
        setSelectedFeedback(null);
        fetchFeedback();
    } catch (err) {
        toast.error('Failed to update feedback');
    } finally {
        setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'Under Review': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Planned': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Closed': return 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full h-full">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <MessageSquare className="text-primary-500" />
                        Admin Feedback Center
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Review, manage, and respond to internal doctor feedback.
                    </p>
                </div>
                <button 
                    onClick={() => fetchFeedback()}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-[#232f42] transition-colors"
                >
                    <RefreshCcw /> Refresh
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">New</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.new || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">Under Review</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.underReview || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.inProgress || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#0f1929] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-500 mb-1">Resolved</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.resolved || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white dark:bg-[#0f1929] rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search feedback..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <select 
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>
                <select 
                    value={filters.type}
                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="w-full sm:w-auto px-4 py-2 bg-gray-50 dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                >
                    <option value="">All Types</option>
                    <option value="Report a Problem">Report a Problem</option>
                    <option value="Suggest an Improvement">Suggest an Improvement</option>
                    <option value="Request a Feature">Request a Feature</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#0f1929] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-[#1a2332] border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Title</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : feedbacks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No feedback found matching the current filters.
                                    </td>
                                </tr>
                            ) : (
                                feedbacks.map(fb => (
                                    <tr key={fb._id} className="hover:bg-gray-50 dark:hover:bg-[#1a2332] transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                                            {fb.title}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {fb.type}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {fb.category}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(fb.status)}`}>
                                                {fb.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            {new Date(fb.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedFeedback(fb);
                                                    setAdminResponse(fb.adminResponse || '');
                                                    setUpdateStatus(fb.status);
                                                }}
                                                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#1a2332]">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Showing page {pagination.page} of {pagination.pages}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0f1929] disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button 
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0f1929] disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal for Details */}
        {selectedFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-[#0f1929] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col"
                >
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Feedback</h2>
                        <button onClick={() => setSelectedFeedback(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Doctor ID</p>
                                    <p className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-2 rounded">{selectedFeedback.doctorId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Title</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedFeedback.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Description</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-[#1a2332] p-4 rounded-xl">
                                        {selectedFeedback.description}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Type & Category</p>
                                        <p className="text-sm font-medium">{selectedFeedback.type} / {selectedFeedback.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Source Route</p>
                                        <p className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate" title={selectedFeedback.route}>
                                            {selectedFeedback.route}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Technical Context</p>
                                    <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
                                        <li>Browser: {selectedFeedback.browser}</li>
                                        <li>OS: {selectedFeedback.os}</li>
                                        <li>Device: {selectedFeedback.device}</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-[#1a2332] p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">Admin Actions</h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Update Status</label>
                                            <select 
                                                value={updateStatus}
                                                onChange={(e) => setUpdateStatus(e.target.value)}
                                                className="w-full bg-white dark:bg-[#0f1929] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none"
                                            >
                                                <option value="Submitted">Submitted</option>
                                                <option value="Under Review">Under Review</option>
                                                <option value="Planned">Planned</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Response (Visible to Doctor)</label>
                                            <textarea 
                                                value={adminResponse}
                                                onChange={(e) => setAdminResponse(e.target.value)}
                                                placeholder="Write a response..."
                                                rows={4}
                                                className="w-full bg-white dark:bg-[#0f1929] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                                            />
                                        </div>
                                        
                                        <button 
                                            onClick={handleUpdate}
                                            disabled={isUpdating}
                                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isUpdating ? 'Saving...' : 'Save & Notify Doctor'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}

    </div>
  );
}
