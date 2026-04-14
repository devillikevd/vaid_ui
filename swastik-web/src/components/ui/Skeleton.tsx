'use client';

/**
 * UI-05 Fix: Skeleton loading states for dashboard pages
 * Replaces the generic spinner with content-shaped skeleton cards
 */

interface SkeletonCardProps {
    className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
    return (
        <div className={`animate-pulse bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                    <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Table header */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            {/* Table rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-4">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700/50 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonWelcomeBanner() {
    return (
        <div className="animate-pulse bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6">
            <div className="h-7 w-48 bg-white/20 rounded mb-2" />
            <div className="h-4 w-72 bg-white/10 rounded" />
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <SkeletonWelcomeBanner />
            <SkeletonStatsGrid />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonTable rows={4} />
                <SkeletonTable rows={4} />
            </div>
        </div>
    );
}
