'use client';

import { useEffect, useState, useRef, createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, Settings2, Search, Calendar, User, FileText, IndianRupee, Star, HeartPulse, Mail, MessageCircle, CheckCircle2, X, MoreHorizontal, Trash2, ArrowRight, Check } from 'lucide-react';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast icons
const icons = {
    success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

// Toast styles
const styles = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white',
    error: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
};

// Individual Toast Component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
    const [isLeaving, setIsLeaving] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!toast.duration || toast.duration <= 0) return;

        const startTime = Date.now();
        const duration = toast.duration;

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining <= 0) {
                clearInterval(progressInterval);
            }
        }, 50);

        const timeout = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(onRemove, 300);
        }, duration);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(timeout);
        };
    }, [toast.duration, onRemove]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(onRemove, 300);
    };

    return (
        <div
            className={`
        relative overflow-hidden rounded-xl shadow-2xl backdrop-blur-lg
        transform transition-all duration-300 ease-out
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${styles[toast.type]}
      `}
            role="alert"
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="flex-shrink-0 p-1 rounded-full bg-white/20">
                    {icons[toast.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{toast.title}</p>
                    {toast.message && (
                        <p className="mt-1 text-sm opacity-90">{toast.message}</p>
                    )}
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-2 px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-md transition-colors"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Progress Bar */}
            {toast.duration && toast.duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                    <div
                        className="h-full bg-white/40 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
                </div>
            ))}
        </div>,
        document.body
    );
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const lastShownRef = useRef<Map<string, number>>(new Map());

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        // Deduplication: skip if same type+title was shown within 2 seconds
        const dedupKey = `${toast.type}::${toast.title}`;
        const lastShown = lastShownRef.current.get(dedupKey) ?? 0;
        if (Date.now() - lastShown < 2000) return '';
        lastShownRef.current.set(dedupKey, Date.now());

        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? 5000,
        };

        setToasts((prev) => [...prev, newToast]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook to use toasts
export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    const { addToast, removeToast, clearToasts } = context;

    const toast = {
        success: (title: string, message?: string, options?: Partial<Toast>) =>
            addToast({ type: 'success', title, message, ...options }),
        error: (title: string, message?: string, options?: Partial<Toast>) =>
            addToast({ type: 'error', title, message, ...options }),
        warning: (title: string, message?: string, options?: Partial<Toast>) =>
            addToast({ type: 'warning', title, message, ...options }),
        info: (title: string, message?: string, options?: Partial<Toast>) =>
            addToast({ type: 'info', title, message, ...options }),
        custom: (toast: Omit<Toast, 'id'>) => addToast(toast),
        dismiss: removeToast,
        dismissAll: clearToasts,
    };

    return toast;
}

// Notification Bell Component with Badge
export function NotificationBell({
    count = 0,
    onClick,
}: {
    count?: number;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
            </svg>
            {count > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
}

// Real-time Notification Panel
export function NotificationPanel({
    notifications,
    isOpen,
    onClose,
    onClear,
    onMarkAllRead,
    onNotificationClick,
}: {
    notifications: Array<{
        id?: string;
        type: string;
        title: string;
        message?: string;
        timestamp: string;
        data?: any;
        isRead?: boolean;
    }>;
    isOpen: boolean;
    onClose: () => void;
    onClear?: () => void;
    onMarkAllRead?: () => void;
    onNotificationClick?: (notification: any) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    if (!isOpen) return null;

    const filters = ['All', 'Unread', 'Appointments', 'Patients', 'Payments', 'Reviews', 'Alerts', 'Invitations'];

    const getIconInfo = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('appointment') || t.includes('booking')) return { icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
        if (t.includes('patient') || t.includes('user')) return { icon: User, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
        if (t.includes('prescription')) return { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' };
        if (t.includes('payment') || t.includes('order')) return { icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
        if (t.includes('review')) return { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' };
        if (t.includes('alert') || t.includes('health') || t.includes('emergency')) return { icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' };
        if (t.includes('invitation')) return { icon: Mail, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' };
        if (t.includes('community') || t.includes('message')) return { icon: MessageCircle, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' };
        
        return { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const getGroup = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 0) return 'TODAY';
        if (diffDays === 1) return 'YESTERDAY';
        if (diffDays <= 7) return 'THIS WEEK';
        return 'OLDER';
    };

    const filteredNotifs = notifications.filter(n => {
        if (activeFilter === 'Unread' && n.isRead) return false;
        if (activeFilter !== 'All' && activeFilter !== 'Unread') {
            if (!n.type.toLowerCase().includes(activeFilter.toLowerCase().replace(/s$/, ''))) return false;
        }
        if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.message?.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    });

    const grouped = filteredNotifs.reduce((acc, notif) => {
        const g = getGroup(notif.timestamp);
        if (!acc[g]) acc[g] = [];
        acc[g].push(notif);
        return acc;
    }, {} as Record<string, typeof filteredNotifs>);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="absolute right-0 top-full mt-3 w-[450px] bg-white/95 dark:bg-[#0B1020]/95 backdrop-blur-xl rounded-[18px] border border-gray-200 dark:border-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-black/5 dark:ring-white/5">
                
                {/* Header */}
                <div className="flex flex-col p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B1020]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                                    {unreadCount} Unread
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && onMarkAllRead && (
                                <button
                                    onClick={onMarkAllRead}
                                    className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1 hover:bg-emerald-500/10 rounded-md flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark all as read
                                </button>
                            )}
                            <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <Settings2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Search & Filters */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-[#131A2B] border border-gray-200 dark:border-gray-800 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            />
                        </div>
                        
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                            {filters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                                        activeFilter === filter 
                                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' 
                                        : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredNotifs.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-800 shadow-inner">
                                <Bell className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">You're all caught up</h4>
                            <p className="text-sm text-gray-500 mb-6 max-w-[250px]">No new notifications at the moment. We'll notify you whenever something important happens.</p>
                            <button className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 px-4 py-2 rounded-xl transition-all">
                                Notification Preferences
                            </button>
                        </div>
                    ) : (
                        <div className="p-2 space-y-4">
                            {['TODAY', 'YESTERDAY', 'THIS WEEK', 'OLDER'].map(group => {
                                if (!grouped[group]) return null;
                                return (
                                    <div key={group}>
                                        <div className="flex items-center gap-3 px-3 mb-2">
                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group}</h5>
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                                        </div>
                                        <div className="space-y-1">
                                            {grouped[group].map((n, i) => {
                                                const { icon: Icon, color, bg } = getIconInfo(n.type);
                                                const isUnread = !n.isRead;
                                                return (
                                                    <div 
                                                        key={n.id || i}
                                                        onClick={() => onNotificationClick?.(n)}
                                                        className={`relative p-3 rounded-xl cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 border ${
                                                            isUnread 
                                                            ? 'bg-emerald-50 dark:bg-[#151B2E] hover:bg-emerald-100 dark:hover:bg-[#1A2136] border-emerald-100 dark:border-gray-800/80 shadow-md' 
                                                            : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 border-transparent'
                                                        }`}
                                                    >
                                                        {isUnread && (
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-emerald-500 rounded-r-full"></div>
                                                        )}
                                                        
                                                        <div className="flex gap-3">
                                                            <div className="relative shrink-0">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/5 ${isUnread ? bg : 'bg-gray-100 dark:bg-gray-900'}`}>
                                                                    <Icon className={`w-5 h-5 ${isUnread ? color : 'text-gray-400 dark:text-gray-500'}`} />
                                                                </div>
                                                                {isUnread && (
                                                                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-emerald-50 dark:border-[#151B2E] rounded-full bg-emerald-500`} />
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                                                    <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                        {n.title}
                                                                    </h4>
                                                                    {n.data?.status && (
                                                                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                                            {n.data.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={`text-xs truncate ${isUnread ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                    {n.message}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[10px] font-medium text-gray-500">{formatTime(n.timestamp)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Hover Actions */}
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#1A2136] p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl">
                                                            {isUnread && (
                                                                <button onClick={(e) => { e.stopPropagation(); onMarkAllRead?.(); }} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Mark Read">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="More Options">
                                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B1020] flex items-center justify-between gap-2">
                        {onClear && (
                            <button 
                                onClick={onClear}
                                className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Clear read
                            </button>
                        )}
                        <Link href="/doctor/notifications" onClick={onClose} className="flex-1 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                            View all notifications <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}

