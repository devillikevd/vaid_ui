import React from 'react';

export interface SettingsShellProps {
    title: string;
    subtitle?: string;
    description?: string;
    saveStatus?: { type: 'success' | 'error'; message: string } | null;
    navigation?: React.ReactNode;
    mobileNavigation?: React.ReactNode;
    children: React.ReactNode;
}

export function SettingsShell({ title, subtitle, description, saveStatus, navigation, mobileNavigation, children }: SettingsShellProps) {
    const displaySubtitle = description || subtitle;
    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
                        {displaySubtitle && <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm sm:text-base">{displaySubtitle}</p>}
                    </div>
                    {saveStatus && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2 ${
                            saveStatus.type === 'success' 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                                : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                        }`}>
                            {saveStatus.message}
                        </div>
                    )}
                </div>
            </div>

            {mobileNavigation}

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative items-start">
                {navigation}
                <div className="flex-1 min-w-0 w-full">
                    {children}
                </div>
            </div>
        </div>
    );
}
