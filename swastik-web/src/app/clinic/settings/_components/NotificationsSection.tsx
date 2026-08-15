'use client';

import { useEffect } from 'react';
import { ArrowRight, Bell, Mail as MailIcon, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { SettingsSection } from './SettingsSection';

export function NotificationsSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    const channels = [
        {
            icon: Bell,
            title: 'In-app notifications',
            description: 'Booking, check-in and invite updates appear in your Notification Centre.',
        },
        {
            icon: MailIcon,
            title: 'Email',
            description: 'Email is sent as a fallback for critical alerts such as SOS and appointment changes.',
        },
        {
            icon: Smartphone,
            title: 'Push notifications',
            description: 'Push is delivered to logged-in devices via Firebase Cloud Messaging when configured.',
        },
    ];

    return (
        <SettingsSection
            id="notifications"
            title="Notifications"
            description="How your clinic receives alerts. Individual channel preferences are not available yet."
            icon={<Bell className="h-5 w-5" />}
            actions={
                <Link
                    href="/clinic/notifications"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    Open Notification Centre <ArrowRight className="h-4 w-4" />
                </Link>
            }
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {channels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                        <div key={channel.title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
                                <Icon className="h-4 w-4" />
                            </span>
                            <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{channel.title}</h4>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{channel.description}</p>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Delivery preferences</h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Choosing which events reach you by email, SMS or push is not available yet. All notifications are delivered
                    in-app today.
                </p>
            </div>
        </SettingsSection>
    );
}
