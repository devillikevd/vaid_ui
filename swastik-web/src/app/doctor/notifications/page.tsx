'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Bell, Check, Trash2, Loader2, AlertCircle, RefreshCw, Calendar, FileText, AlertTriangle, UserPlus, CreditCard, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDistanceToNow } from '@/lib/utils';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    data?: any;
}

const NOTIFICATION_CATEGORIES = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'appointments', label: 'Appointments', icon: Calendar, types: ['appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_reminder', 'consultation_started', 'consultation_ready', 'consultation_ended'] },
    { id: 'patients', label: 'Patients & Prescriptions', icon: FileText, types: ['prescription_ready', 'prescription_expiry_reminder', 'medicine_missed'] },
    { id: 'alerts', label: 'Emergency & Alerts', icon: AlertTriangle, types: ['sos_contact_alert', 'sos_update', 'sos_accepted', 'ambulance_arrived', 'health_alert', 'fall_detected', 'crash_sos'] },
    { id: 'invitations', label: 'Invitations', icon: UserPlus, types: ['new_coach_invite', 'hospital_invite'] },
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);

    const { on } = useSocket();
    const toast = useToast();

    const fetchNotifications = useCallback(async (isRetry = false) => {
        try {
            if (isRetry) setLoading(true);
            const selectedCategory = NOTIFICATION_CATEGORIES.find(c => c.id === activeCategory);
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
    }, [page, unreadOnly, activeCategory, searchQuery]);

    useEffect(() => {
        fetchNotifications(true);
    }, [fetchNotifications]);

    // Handle real-time socket updates
    useEffect(() => {
        const handleNewNotification = (notification: any) => {
            const selectedCategory = NOTIFICATION_CATEGORIES.find(c => c.id === activeCategory);
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
        return () => unsub();
    }, [on, activeCategory, unreadOnly, searchQuery]);

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

    const getIconForType = (type: string) => {
        if (type.includes('appointment') || type.includes('consultation')) return <Calendar className="w-5 h-5 text-blue-500" />;
        if (type.includes('sos') || type.includes('emergency') || type.includes('health_alert')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
        if (type.includes('invite')) return <UserPlus className="w-5 h-5 text-purple-500" />;
        if (type.includes('prescription') || type.includes('medicine')) return <FileText className="w-5 h-5 text-emerald-500" />;
        return <Bell className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="space-y-6 pb-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Notification Center</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1.5 font-medium">Manage all your alerts, messages, and updates in one place.</p>
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
            <Card padding="md" className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200/80 dark:border-gray-800 rounded-2xl">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-[320px] group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none"
                            />
                        </div>

                        <div className="relative flex-1 sm:flex-none">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                            <select
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                                className="block w-full pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-gray-50 dark:bg-gray-950 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:text-gray-200 transition-all shadow-sm outline-none cursor-pointer font-medium appearance-none"
                            >
                                {NOTIFICATION_CATEGORIES.map(cat => (
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
                                className="rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800 w-4 h-4"
                            />
                            Unread Only
                        </label>
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 shadow-sm">
                            {totalCount} Total
                        </span>
                    </div>
                </div>
            </Card>

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
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
                    {notifications.map((notification) => (
                        <div 
                            key={notification.id}
                            className={cn(
                                "flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 group cursor-pointer",
                                !notification.is_read 
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30" 
                                    : "bg-white dark:bg-[#0B1020] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm"
                            )}
                            onClick={() => {
                                if (!notification.is_read) handleMarkAsRead(notification.id);
                            }}
                        >
                            <div className="shrink-0 pt-1">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center border",
                                    !notification.is_read
                                        ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800/50"
                                        : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                                )}>
                                    {getIconForType(notification.type)}
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className={cn(
                                            "text-base font-semibold leading-tight mb-1 flex items-center gap-2",
                                            !notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                                        )}>
                                            {notification.title}
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            )}
                                        </h4>
                                        <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {notification.message}
                                        </p>
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
                    ))}
                    
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
        </div>
    );
}
