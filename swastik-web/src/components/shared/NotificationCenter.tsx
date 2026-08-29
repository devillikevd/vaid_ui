'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, Bell, Check, Trash2, Loader2, AlertCircle, RefreshCw, Filter, 
    Building2, UserPlus, ChevronRight, CalendarDays, ExternalLink, X, 
    ShieldAlert, CheckCircle2, XCircle, Info, Clock, ArrowRight, Stethoscope, FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { api, doctorApi } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDistanceToNow, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationDetailModal } from '@/components/shared/NotificationDetailModal';

export interface NotificationCategory {
    id: string;
    label: string;
    icon: any;
    types?: string[];
}

export interface NotificationCenterProps {
    title: string;
    description: string;
    categories: NotificationCategory[];
    getIconForType: (type: string) => React.ReactNode;
    theme?: 'default' | 'orange' | 'blue' | 'purple' | 'red';
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    category?: string;
    action_url?: string | null;
    action_data?: any;
    is_read: boolean;
    created_at: string;
    data?: any;
}

export function NotificationCenter({
    title,
    description,
    categories,
    getIconForType,
    theme = 'default'
}: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);

    // Interactive Modal States
    const [activeModalNotification, setActiveModalNotification] = useState<NotificationItem | null>(null);

    const router = useRouter();
    const { on } = useSocket();
    const toast = useToast();

    // Theme color mappings
    const getThemeColors = () => {
        switch (theme) {
            case 'orange':
                return {
                    text: 'text-orange-500',
                    ring: 'focus:ring-orange-500/10 focus:border-orange-500 group-focus-within:text-orange-500',
                    bgUnread: 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30',
                    borderUnread: 'border-orange-200 dark:border-orange-800/50',
                    dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
                    checkbox: 'text-orange-600 focus:ring-orange-500',
                    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                };
            default: // emerald (default)
                return {
                    text: 'text-emerald-500',
                    ring: 'focus:ring-emerald-500/10 focus:border-emerald-500 group-focus-within:text-emerald-500',
                    bgUnread: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30',
                    borderUnread: 'border-emerald-200 dark:border-emerald-800/50',
                    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
                    checkbox: 'text-emerald-600 focus:ring-emerald-500',
                    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                };
        }
    };
    
    const colors = getThemeColors();

    const fetchNotifications = useCallback(async (isRetry = false) => {
        try {
            if (isRetry) setLoading(true);
            const selectedCategory = categories.find(c => c.id === activeCategory);
            const types = selectedCategory?.types || [];

            const response = await api.notifications.getAll(
                page, 
                20, 
                unreadOnly ? true : undefined, 
                types.length > 0 ? types : undefined, 
                searchQuery.trim() || undefined
            );

            if (response.success) {
                const payload = response.data as any;
                setNotifications(payload.notifications || []);
                setTotalPages(payload.pagination?.totalPages || 1);
                setTotalCount(payload.pagination?.total || 0);
                setError(null);
            } else {
                setError(response.error || 'Failed to load notifications');
            }
        } catch (err: any) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page, unreadOnly, activeCategory, searchQuery, categories]);

    useEffect(() => {
        fetchNotifications(true);
    }, [fetchNotifications]);

    // Handle real-time socket updates
    useEffect(() => {
        const handleNewNotification = (notification: any) => {
            const selectedCategory = categories.find(c => c.id === activeCategory);
            const types = selectedCategory?.types || [];
            
            // Check if it matches current filters
            if (unreadOnly && notification.read) return;
            if (types.length > 0 && !types.includes(notification.type)) return;
            if (searchQuery && !notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !notification.message?.toLowerCase().includes(searchQuery.toLowerCase())) return;

            setNotifications(prev => {
                // Ensure no duplicates
                if (prev.some(n => n.id === notification.id)) return prev;
                // Add to top and remove last if over 20 to maintain pagination visual consistency loosely
                const newArr = [notification, ...prev];
                if (newArr.length > 20) newArr.pop();
                return newArr;
            });
            setTotalCount(prev => prev + 1);
        };

        const unsub = on('notification:new', handleNewNotification);
        return () => {
            if (unsub) unsub();
        };
    }, [on, activeCategory, unreadOnly, searchQuery, categories]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, activeCategory, unreadOnly]);

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        try {
            await api.notifications.markAsRead(id);
        } catch (e) {
            // Optimistic update already applied
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        try {
            await api.notifications.markAllAsRead();
            toast.success('All notifications marked as read');
        } catch (e) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleClearRead = async () => {
        setNotifications(prev => prev.filter(n => !n.is_read));
        try {
            await api.notifications.clearRead();
            toast.success('Read notifications cleared');
            fetchNotifications(false); // Refetch to correct pagination
        } catch (e) {
            toast.error('Failed to clear notifications');
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
        // Automatically mark as read
        if (!notification.is_read) {
            void handleMarkAsRead(notification.id);
        }

        const type = notification.type;

        // Specialized Modals
        if (type === 'clinic_reinvite' || type === 'clinic_invite') {
            setActiveModalNotification(notification);
            return;
        }

        if (type === 'clinic_affiliation_ended') {
            setActiveModalNotification(notification);
            return;
        }

        // Direct Deep Link Routes
        const directUrl = notification.action_url || notification.data?.action_url || notification.data?.route || (notification as any).route;
        if (directUrl) {
            router.push(directUrl);
            return;
        }

        if (type.startsWith('referral_')) {
            const refId = notification.data?.referral_id || notification.data?.referralId;
            const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
            let prefix = 'clinic';
            if (pathname.startsWith('/hospital')) prefix = 'hospital';
            else if (pathname.startsWith('/diagnostic-center')) prefix = 'diagnostic-center';
            else if (pathname.startsWith('/pharmacy')) prefix = 'pharmacy';
            else if (pathname.startsWith('/doctor')) prefix = 'doctor';
            router.push(`/${prefix}/referrals${refId ? `?selectedId=${refId}` : ''}`);
            return;
        }

        if (type.startsWith('appointment_') || type.startsWith('consultation_')) {
            router.push('/doctor/appointments');
            return;
        }

        if (type === 'clinic_invite_response') {
            router.push('/clinic/doctors');
            return;
        }

        // Generic details modal for other notifications with data
        setActiveModalNotification(notification);
    };

    return (
        <div className="space-y-6 pb-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleMarkAllAsRead} leftIcon={<Check className="w-4 h-4" />}>
                        Mark all as read
                    </Button>
                    <Button variant="outline" onClick={handleClearRead} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" leftIcon={<Trash2 className="w-4 h-4" />}>
                        Clear read
                    </Button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-[320px] group">
                            <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 transition-colors ${colors.ring}`}>
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 dark:text-gray-200 transition-all shadow-sm outline-none ${colors.ring}`}
                            />
                        </div>

                        <div className="relative flex-1 sm:flex-none">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                            <select
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                                className={`block w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-medium appearance-none ${colors.ring}`}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={unreadOnly} 
                                onChange={(e) => setUnreadOnly(e.target.checked)}
                                className={`rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800 w-4 h-4 ${colors.checkbox}`}
                            />
                            Unread Only
                        </label>
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 shadow-sm">
                            {totalCount} Total
                        </span>
                    </div>
                </div>
            </div>

            {/* List */}
            {error ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <Button onClick={() => fetchNotifications(true)} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry Connection
                    </Button>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className={`w-8 h-8 animate-spin ${colors.text}`} />
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#0B1020] rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full mb-4">
                        <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                        You have no {unreadOnly ? 'unread ' : ''}notifications matching your current filters.
                    </p>
                    {(searchQuery || activeCategory !== 'all' || unreadOnly) && (
                        <Button 
                            variant="ghost" 
                            className="mt-4"
                            onClick={() => {
                                setSearchQuery('');
                                setActiveCategory('all');
                                setUnreadOnly(false);
                            }}
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => {
                        const isReinvite = notification.type === 'clinic_reinvite' || notification.type === 'clinic_invite';
                        const isEnded = notification.type === 'clinic_affiliation_ended';
                        const isAppointment = notification.type.startsWith('appointment_') || notification.type.startsWith('consultation_');

                        return (
                            <div 
                                key={notification.id}
                                className={cn(
                                    "flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 group cursor-pointer relative",
                                    !notification.is_read 
                                        ? colors.bgUnread 
                                        : "bg-white dark:bg-[#0B1020] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="shrink-0 pt-1">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center border shadow-sm",
                                        !notification.is_read
                                            ? `bg-white dark:bg-gray-900 ${colors.borderUnread}`
                                            : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                                    )}>
                                        {getIconForType(notification.type)}
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className={cn(
                                                    "text-base font-semibold leading-tight flex items-center gap-2",
                                                    !notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                                                )}>
                                                    {notification.title}
                                                    {!notification.is_read && (
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`}></span>
                                                    )}
                                                </h4>

                                                {isReinvite && (
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                                                        <UserPlus className="w-2.5 h-2.5" /> Action Required
                                                    </span>
                                                )}

                                                {isEnded && (
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                                        <Building2 className="w-2.5 h-2.5" /> Former Affiliation
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                                                {notification.message}
                                            </p>

                                            {/* Action cues */}
                                            <div className="mt-2.5 flex items-center gap-3">
                                                {isReinvite ? (
                                                    <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 group-hover:underline flex items-center gap-1">
                                                        Review Invitation <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </span>
                                                ) : isEnded ? (
                                                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-1">
                                                        View Details <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </span>
                                                ) : isAppointment ? (
                                                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                                                        View Appointments <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </span>
                                                ) : notification.action_url || notification.data?.action_url ? (
                                                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-1">
                                                        Open <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3 shrink-0">
                                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                {formatDistanceToNow(notification.created_at)}
                                            </span>
                                            
                                            {!notification.is_read && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 text-xs font-medium bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(notification.id);
                                                    }}
                                                >
                                                    Mark Read
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {totalPages > 1 && (
                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-center">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* CENTRALIZED INTERACTIVE NOTIFICATION DETAIL MODAL                         */}
            {/* ========================================================================= */}
            <NotificationDetailModal
                notification={activeModalNotification}
                isOpen={!!activeModalNotification}
                onClose={() => setActiveModalNotification(null)}
                onActionCompleted={() => void fetchNotifications(false)}
            />
        </div>
    );
}
