import React from 'react';

export function DashboardCard({ children, className = '', noPadding = false, hoverable = false, onClick }: { children: React.ReactNode, className?: string, noPadding?: boolean, hoverable?: boolean, onClick?: () => void }) {
    return (
        <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-sm ${hoverable ? 'transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-md' : ''} ${className} ${onClick ? 'cursor-pointer hover:border-purple-500' : ''}`}>
            <div className={noPadding ? '' : 'p-5'}>
                {children}
            </div>
        </div>
    );
}

export function CardHeader({ title, icon: Icon, action, iconColor = "text-purple-600" }: { title: string, icon?: React.ElementType, action?: React.ReactNode, iconColor?: string }) {
    return (
        <div className="flex items-center justify-between mb-4 px-5 pt-5 pb-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
                {title}
            </h3>
            {action && <div>{action}</div>}
        </div>
    );
}
