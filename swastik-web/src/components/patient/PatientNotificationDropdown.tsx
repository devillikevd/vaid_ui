'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    CheckCheck,
    Calendar,
    Pill,
    Microscope,
    ShoppingBag,
    AlertTriangle,
    HeartPulse,
    Sparkles,
    Check,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type?: string;
    category?: string;
    data?: any;
    action_url?: string;
    is_read: boolean;
    created_at: string;
}

function formatRelativeTime(dateStr: string): string {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'Just now';
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return 'Recently';
    }
}

function getNotificationTypeMeta(type?: string) {
    const t = (type || '').toLowerCase();
    if (t.includes('appointment') || t.includes('consultation')) {
        return {
            icon: Calendar,
            iconBg: 'bg-emerald-100 text-vd-forest',
            badgeColor: 'text-emerald-700',
        };
    }
    if (t.includes('prescription') || t.includes('medicine') || t.includes('rx')) {
        return {
            icon: Pill,
            iconBg: 'bg-amber-100 text-amber-800',
            badgeColor: 'text-amber-700',
        };
    }
    if (t.includes('diagnostic') || t.includes('lab') || t.includes('report')) {
        return {
            icon: Microscope,
            iconBg: 'bg-purple-100 text-purple-800',
            badgeColor: 'text-purple-700',
        };
    }
    if (t.includes('order') || t.includes('pharmacy')) {
        return {
            icon: ShoppingBag,
            iconBg: 'bg-blue-100 text-blue-800',
            badgeColor: 'text-blue-700',
        };
    }
    if (t.includes('emergency') || t.includes('sos') || t.includes('fall')) {
        return {
            icon: AlertTriangle,
            iconBg: 'bg-rose-100 text-rose-700',
            badgeColor: 'text-rose-700',
        };
    }
    return {
        icon: Bell,
        iconBg: 'bg-stone-100 text-stone-700',
        badgeColor: 'text-stone-700',
    };
}

function getNotificationRoute(item: NotificationItem): string {
    if (item.action_url) return item.action_url;
    const t = (item.type || '').toLowerCase();
    const d = item.data || {};

    if (t.includes('consultation') && d.consultation_id) {
        return `/consultation/${d.consultation_id}`;
    }
    if (t.includes('appointment')) {
        return '/patient/appointments';
    }
    if (t.includes('prescription') || t.includes('report')) {
        return '/patient/records';
    }
    if (t.includes('order')) {
        return '/patient/pharmacy';
    }
    if (t.includes('diagnostic')) {
        return '/patient/diagnostics';
    }
    if (t.includes('health_card')) {
        return '/patient/digital-health-card';
    }
    return '/patient';
}

export default function PatientNotificationDropdown() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const [listRes, countRes] = await Promise.allSettled([
                notificationsApi.getAll(1, 15),
                notificationsApi.getUnreadCount(),
            ]);

            if (listRes.status === 'fulfilled' && listRes.value.success) {
                const data = listRes.value.data as any;
                const items: NotificationItem[] = data?.notifications || (Array.isArray(data) ? data : []);
                setNotifications(items);
            }

            if (countRes.status === 'fulfilled' && countRes.value.success) {
                const cData = countRes.value.data as any;
                const c = typeof cData === 'number' ? cData : cData?.count ?? 0;
                setUnreadCount(c);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        // Periodic soft refresh every 45s
        const interval = setInterval(fetchNotifications, 45000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Outside click & Escape dismiss
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleNotificationClick = async (item: NotificationItem) => {
        setIsOpen(false);
        if (!item.is_read) {
            // Optimistic mark read
            setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            try {
                await notificationsApi.markAsRead(item.id);
            } catch (err) {
                console.error('Failed to mark notification as read:', err);
            }
        }
        const targetRoute = getNotificationRoute(item);
        router.push(targetRoute);
    };

    const handleMarkAllAsRead = async () => {
        setMarkingAll(true);
        try {
            const res = await notificationsApi.markAllAsRead();
            if (res.success) {
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen((prev) => !prev);
                    if (!isOpen) {
                        fetchNotifications();
                    }
                }}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                className={`relative p-2 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isOpen
                        ? 'bg-stone-100 text-stone-900 border-vd-forest/40 shadow-xs'
                        : 'bg-white/80 hover:bg-stone-100/80 text-stone-700 hover:text-stone-900 border-stone-200/80 hover:border-stone-300 shadow-2xs'
                }`}
            >
                <Bell className="w-4 h-4 text-stone-700" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-24px),24rem)] bg-white rounded-3xl shadow-2xl border border-stone-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Popover Header */}
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                        <div className="flex items-center gap-2">
                            <h3 className="font-heading font-bold text-sm text-stone-900">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAllAsRead}
                                disabled={markingAll}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-vd-forest hover:text-vd-forest-deep transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Mark all as read</span>
                            </button>
                        )}
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100/80">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <Loader2 className="w-6 h-6 text-vd-forest animate-spin mx-auto" />
                                <p className="text-xs text-stone-500 font-light">Loading updates...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center space-y-2">
                                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <h4 className="text-xs font-bold text-stone-800">No new notifications</h4>
                                <p className="text-[11px] text-stone-500 font-light max-w-xs mx-auto">
                                    You are all caught up. New appointment reminders, prescriptions, and lab reports will appear here.
                                </p>
                            </div>
                        ) : (
                            notifications.map((item) => {
                                const meta = getNotificationTypeMeta(item.type);
                                const Icon = meta.icon;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleNotificationClick(item)}
                                        className={`p-4 flex items-start gap-3.5 hover:bg-stone-50 transition-colors cursor-pointer group ${
                                            !item.is_read ? 'bg-emerald-50/25' : ''
                                        }`}
                                    >
                                        <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-black/5 ${meta.iconBg}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4
                                                    className={`text-xs font-semibold truncate ${
                                                        !item.is_read ? 'text-stone-900 font-bold' : 'text-stone-700'
                                                    }`}
                                                >
                                                    {item.title}
                                                </h4>
                                                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                                                    {formatRelativeTime(item.created_at)}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-stone-500 font-light mt-0.5 line-clamp-2 leading-relaxed">
                                                {item.message}
                                            </p>
                                        </div>

                                        {!item.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
