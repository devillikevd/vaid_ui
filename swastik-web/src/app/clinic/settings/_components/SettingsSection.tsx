'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

export interface SectionStatus {
    type: 'success' | 'error' | 'info';
    message: string;
}

export function StatusMessage({ status }: { status: SectionStatus | null }) {
    if (!status) return null;
    const styles = {
        success:
            'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
        error: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
        info: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    } as const;
    return (
        <div role="status" aria-live="polite" className={`px-4 py-3 rounded-lg text-sm border ${styles[status.type]}`}>
            {status.message}
        </div>
    );
}

export function SettingsSection({
    id,
    title,
    description,
    icon,
    actions,
    children,
    badge,
}: {
    id: string;
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    badge?: ReactNode;
}) {
    return (
        <Card id={id} className="scroll-mt-28">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    {icon && (
                        <span className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true">
                            {icon}
                        </span>
                    )}
                    <div>
                        <CardTitle>{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {badge}
                    {actions}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export function SectionLoader() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="sr-only">Loading</span>
        </div>
    );
}

export function SectionError({
    message,
    onRetry,
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

export function ComingSoon({
    title,
    description,
    note,
}: {
    title: string;
    description: string;
    note?: string;
}) {
    return (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6">
            <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                Not available yet
            </span>
            {note && <p className="text-xs text-gray-400 dark:text-gray-500">{note}</p>}
        </div>
    );
}
