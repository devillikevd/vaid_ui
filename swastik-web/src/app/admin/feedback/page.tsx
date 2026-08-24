'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import {
  MessageSquare,
  Search,
  RefreshCcw,
  Star,
  Smartphone,
  Stethoscope,
  Building2,
  Bug,
  Sparkles,
  Palette,
  Zap,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Send,
  X,
  Eye,
  Phone,
  Mail,
  User,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Filter,
  Check,
  ChevronRight,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackItem {
  _id: string;
  userId?: string;
  doctorId?: string;
  userRole?: 'patient' | 'doctor' | 'clinic' | 'hospital' | 'pharmacy' | 'diagnostic_center' | string;
  userName?: string;
  userEmail?: string;
  patientPhone?: string;
  type?: string;
  category: string;
  title: string;
  description: string;
  rating?: number;
  allowContact?: boolean;
  pageName?: string;
  route?: string;
  attachments?: string[];
  browser?: string;
  device?: string;
  os?: string;
  appVersion?: string;
  status: 'Submitted' | 'Under Review' | 'Planned' | 'In Progress' | 'Resolved' | 'Closed' | string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  adminResponse?: string;
  adminId?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SummaryStats {
  total?: number;
  new?: number;
  underReview?: number;
  inProgress?: number;
  resolved?: number;
  patientCount?: number;
  doctorCount?: number;
  facilityCount?: number;
  averageRating?: number;
}

export default function AdminFeedbackDashboard() {
  const toast = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRoleTab, setSelectedRoleTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected item modal & details
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Quick Response Templates
  const quickTemplates = [
    'Thank you for reporting this! Our development team has identified the issue and is actively working on a fix.',
    'We have resolved this bug in the latest application build. Please update your app from the Play Store/App Store!',
    'Thank you for your valuable suggestion! We have added this to our upcoming feature roadmap.',
    'Could you please share additional details or steps to reproduce this issue so our engineering team can investigate?',
  ];

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = {};
      if (selectedRoleTab !== 'all') {
        if (selectedRoleTab === 'patient') filters.userRole = 'patient';
        else if (selectedRoleTab === 'doctor') filters.userRole = 'doctor';
        else if (selectedRoleTab === 'facility') filters.userRole = 'facility';
      }
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (ratingFilter) filters.rating = ratingFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const res = await adminApi.getFeedback(filters, pagination.page, pagination.limit);
      if (res.success) {
        setFeedbacks((res.data as FeedbackItem[]) || []);
        setSummary((res.summary as SummaryStats) || {});
        setPagination((res.pagination as any) || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [pagination.page, selectedRoleTab, statusFilter, categoryFilter, ratingFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchFeedback();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUpdate = async () => {
    if (!selectedFeedback) return;
    setIsUpdating(true);
    try {
      if (adminResponse.trim() && adminResponse !== selectedFeedback.adminResponse) {
        await adminApi.respondToFeedback(
          selectedFeedback._id,
          adminResponse.trim(),
          updateStatus || selectedFeedback.status
        );
      } else if (
        (updateStatus && updateStatus !== selectedFeedback.status) ||
        (updatePriority && updatePriority !== selectedFeedback.priority)
      ) {
        await adminApi.updateFeedbackStatus(
          selectedFeedback._id,
          updateStatus || selectedFeedback.status,
          updatePriority || selectedFeedback.priority
        );
      }

      toast.success('Feedback status and response updated successfully!');
      setSelectedFeedback(null);
      fetchFeedback();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update feedback');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('bug') || cat.includes('problem')) return <Bug className="w-4 h-4 text-red-500" />;
    if (cat.includes('feature') || cat.includes('suggestion')) return <Sparkles className="w-4 h-4 text-purple-500" />;
    if (cat.includes('ui') || cat.includes('ux') || cat.includes('design')) return <Palette className="w-4 h-4 text-blue-500" />;
    if (cat.includes('speed') || cat.includes('performance') || cat.includes('crash')) return <Zap className="w-4 h-4 text-amber-500" />;
    return <HelpCircle className="w-4 h-4 text-slate-500" />;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'patient':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Smartphone className="w-3 h-3" /> Patient App
          </span>
        );
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Stethoscope className="w-3 h-3" /> Doctor
          </span>
        );
      case 'hospital':
      case 'clinic':
      case 'pharmacy':
      case 'diagnostic_center':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Building2 className="w-3 h-3" /> Facility ({role})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <User className="w-3 h-3" /> User
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" /> Submitted
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3.5 h-3.5" /> Under Review
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Zap className="w-3.5 h-3.5" /> Dev In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved & Fixed
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30">
            <X className="w-3.5 h-3.5" /> Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            🔴 Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            🟠 High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            🟡 Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400">
            🟢 Low
          </span>
        );
    }
  };

  const renderStars = (rating?: number) => {
    const r = rating || 5;
    return (
      <div className="flex items-center gap-0.5" title={`Rating: ${r}/5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= r
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 dark:fill-slate-700 text-slate-300 dark:text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#090e17] text-slate-900 dark:text-slate-100 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Feedback & App Reports Hub
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Admin & Dev
                  </span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Review real-time feedback, bug reports, and UX suggestions submitted by Patients, Doctors, and Facilities.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchFeedback()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-[#1c2a42] text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
              Refresh Feed
            </button>
          </div>
        </div>

        {/* Top KPI Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Card 1: Total */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total Submissions</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{summary.total || 0}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
              <MessageSquare className="w-3 h-3 text-blue-500" /> Platform wide
            </span>
          </div>

          {/* Card 2: Average App Rating */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg Patient Rating</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-amber-500">{summary.averageRating || 5.0}</p>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-1">{renderStars(Math.round(summary.averageRating || 5))}</div>
          </div>

          {/* Card 3: Patient App */}
          <div
            onClick={() => setSelectedRoleTab('patient')}
            className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
              selectedRoleTab === 'patient'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10 shadow-lg'
                : 'bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/30'
            }`}
          >
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">📱 Patient App</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.patientCount || 0}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">App Users</span>
          </div>

          {/* Card 4: New / Unreviewed */}
          <div
            onClick={() => setStatusFilter('Submitted')}
            className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
              statusFilter === 'Submitted'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/10 shadow-lg'
                : 'bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/30'
            }`}
          >
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">New & Unreviewed</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.new || 0}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">Needs review</span>
          </div>

          {/* Card 5: In Progress */}
          <div
            onClick={() => setStatusFilter('In Progress')}
            className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
              statusFilter === 'In Progress'
                ? 'bg-blue-500/10 border-blue-500/40 shadow-blue-500/10 shadow-lg'
                : 'bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/30'
            }`}
          >
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Dev In Progress</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{summary.inProgress || 0}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">Being fixed</span>
          </div>

          {/* Card 6: Resolved */}
          <div
            onClick={() => setStatusFilter('Resolved')}
            className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all ${
              statusFilter === 'Resolved'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10 shadow-lg'
                : 'bg-white dark:bg-[#0f172a] border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/30'
            }`}
          >
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Resolved & Fixed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.resolved || 0}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">Closed items</span>
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {[
            { id: 'all', label: 'All Submissions', icon: MessageSquare, count: summary.total || 0 },
            { id: 'patient', label: 'Patient Mobile App', icon: Smartphone, count: summary.patientCount || 0 },
            { id: 'doctor', label: 'Doctor Portals', icon: Stethoscope, count: summary.doctorCount || 0 },
            { id: 'facility', label: 'Healthcare Facilities', icon: Building2, count: summary.facilityCount || 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedRoleTab(tab.id);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-[#1a2332]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Patient Name, Phone, Email, Keyword, or Issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Bug Report">🐛 Bug Report</option>
              <option value="Feature Request">✨ Feature Request</option>
              <option value="UI / UX Design">🎨 UI / UX Design</option>
              <option value="Performance & Speed">⚡ Performance</option>
              <option value="General Feedback">💬 General</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted (New)</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">Dev In Progress</option>
              <option value="Resolved">Resolved & Fixed</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Rating Dropdown */}
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="4">⭐⭐⭐⭐ 4 Stars</option>
              <option value="3">⭐⭐⭐ 3 Stars</option>
              <option value="2">⭐⭐ 2 Stars</option>
              <option value="1">⭐ 1 Star</option>
            </select>

            {(statusFilter || categoryFilter || ratingFilter || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setCategoryFilter('');
                  setRatingFilter('');
                  setSearchQuery('');
                  setSelectedRoleTab('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-500/10 rounded-xl hover:bg-red-500/15 transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Feedback List & Table */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-500">Loading incoming feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Feedback Submissions Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                There are no user submissions matching your selected filter criteria.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {feedbacks.map((fb) => (
                <div
                  key={fb._id}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 dark:hover:bg-[#131d2e] transition-colors flex flex-col lg:flex-row gap-5 lg:items-center justify-between"
                >
                  {/* Left: Patient Profile & Details */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* User Avatar */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 text-base shadow-sm">
                      {fb.userName ? fb.userName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Name + Role + Time */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {fb.userName || 'Anonymous User'}
                        </span>
                        {getRoleBadge(fb.userRole)}
                        {fb.priority && fb.priority !== 'Low' && getPriorityBadge(fb.priority)}
                        <span className="text-xs text-slate-400 ml-auto lg:ml-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(fb.createdAt)}
                        </span>
                      </div>

                      {/* Contact Info Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {fb.userEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" /> {fb.userEmail}
                          </span>
                        )}
                        {fb.patientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500" /> {fb.patientPhone}
                          </span>
                        )}
                        {fb.allowContact ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Contact Allowed
                          </span>
                        ) : null}
                      </div>

                      {/* Category + Star Rating */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {getCategoryIcon(fb.category)}
                          {fb.category}
                        </span>
                        {renderStars(fb.rating)}
                        {fb.device && (
                          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                            • {fb.device} {fb.appVersion ? `(v${fb.appVersion})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Message Content */}
                      <p className="text-sm text-slate-700 dark:text-slate-300 pt-1 leading-relaxed line-clamp-2">
                        {fb.description}
                      </p>

                      {/* Screenshot Thumbnail Preview */}
                      {fb.attachments && fb.attachments.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                          {fb.attachments.map((url, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewImage(url)}
                              className="group relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                            >
                              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </button>
                          ))}
                          <span className="text-xs text-slate-400 font-medium">
                            {fb.attachments.length} attachment(s)
                          </span>
                        </div>
                      )}

                      {/* Admin Response Preview if already responded */}
                      {fb.adminResponse && (
                        <div className="mt-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Dev/Admin Reply:</span> {fb.adminResponse}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status & Action Button */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div>{getStatusBadge(fb.status)}</div>

                    <button
                      onClick={() => {
                        setSelectedFeedback(fb);
                        setAdminResponse(fb.adminResponse || '');
                        setUpdateStatus(fb.status);
                        setUpdatePriority(fb.priority || 'Low');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
                    >
                      Review & Resolve
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          {pagination.pages > 1 && (
            <div className="p-4 bg-slate-50 dark:bg-[#131d2e] border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing page <strong className="text-slate-900 dark:text-white">{pagination.page}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{pagination.pages}</strong> ({pagination.total}{' '}
                submissions)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] disabled:opacity-40 font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] disabled:opacity-40 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail & Action Review Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review & Resolve Feedback</h2>
                    <p className="text-xs text-slate-400">ID: {selectedFeedback._id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* User Details Banner */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-500/20">
                      {selectedFeedback.userName ? selectedFeedback.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {selectedFeedback.userName || 'Anonymous'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedFeedback.userEmail && <span>{selectedFeedback.userEmail}</span>}
                        {selectedFeedback.patientPhone && (
                          <span className="text-emerald-500 font-medium">📞 {selectedFeedback.patientPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getRoleBadge(selectedFeedback.userRole)}
                    {selectedFeedback.allowContact && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ✓ Allow Contact
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating & Category Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/60 dark:border-slate-800/60">
                    <p className="text-xs text-slate-400 mb-1">Rating</p>
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <span>{selectedFeedback.rating || 5}/5</span>
                      {renderStars(selectedFeedback.rating)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/60 dark:border-slate-800/60">
                    <p className="text-xs text-slate-400 mb-1">Category</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {getCategoryIcon(selectedFeedback.category)} {selectedFeedback.category}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/60 dark:border-slate-800/60">
                    <p className="text-xs text-slate-400 mb-1">Device Platform</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {selectedFeedback.device || 'Android App'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/60 dark:border-slate-800/60">
                    <p className="text-xs text-slate-400 mb-1">Submitted At</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {formatTime(selectedFeedback.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Feedback Description Message */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Feedback / Bug Report Description
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131d2e] border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedFeedback.description}
                  </div>
                </div>

                {/* Attached Screenshots */}
                {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-500" /> Attached Screenshot(s)
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedFeedback.attachments.map((url, i) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <img src={url} alt="Attachment" className="max-h-48 object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                              onClick={() => setPreviewImage(url)}
                              className="p-2 rounded-xl bg-white text-slate-900 font-semibold text-xs shadow-md flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> Enlarge
                            </button>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dev & Admin Action Section */}
                <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Dev Team & Admin Controls
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Update Status
                      </label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="Submitted">Submitted (New)</option>
                        <option value="Under Review">Under Review</option>
                        <option value="In Progress">Dev In Progress (Working on fix)</option>
                        <option value="Resolved">Resolved & Fixed (Update Released)</option>
                        <option value="Closed">Closed / Not Reproducible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Priority Level
                      </label>
                      <select
                        value={updatePriority}
                        onChange={(e) => setUpdatePriority(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="Low">🟢 Low Priority</option>
                        <option value="Medium">🟡 Medium Priority</option>
                        <option value="High">🟠 High Priority</option>
                        <option value="Critical">🔴 Critical (Urgent Fix)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Response Templates */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Quick Response Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {quickTemplates.map((template, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAdminResponse(template)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-blue-500/50 transition-all text-left"
                        >
                          {template.slice(0, 42)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admin / Dev Response Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Response Message to User (Dispatched via Push Notification & In-App Alert)
                    </label>
                    <textarea
                      rows={3}
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Type your response to the patient/doctor here..."
                      className="w-full p-3.5 rounded-xl bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131d2e]/50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2332]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {isUpdating ? 'Saving...' : 'Save & Notify User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Image Zoom Modal */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-2xl" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
