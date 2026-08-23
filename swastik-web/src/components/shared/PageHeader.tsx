import React from 'react';

export function PageHeader({ 
    title, 
    subtitle, 
    actions, 
    icon: Icon 
}: { 
    title: string; 
    subtitle?: string; 
    actions?: React.ReactNode; 
    icon?: React.ElementType; 
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {Icon && <Icon className="h-6 w-6 text-purple-600" />}
                    {title}
                </h1>
                {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    );
}
