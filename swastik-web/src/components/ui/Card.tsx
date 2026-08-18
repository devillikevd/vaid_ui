import { cn } from '@/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-4 sm:p-6',
        lg: 'p-5 sm:p-8',
    };

    const isInteractive = !!props.onClick;

    return (
        <div
            {...props}
            className={cn(
                'bg-white rounded-lg border border-gray-200 shadow-sm',
                'dark:bg-gray-900 dark:border-gray-700/60 dark:shadow-gray-950/20',
                isInteractive && 'transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 dark:hover:shadow-black/40 hover:bg-gray-50/50 dark:hover:bg-gray-800/80',
                paddingStyles[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pb-4 border-b border-gray-100 dark:border-gray-700/60', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}>
            {children}
        </p>
    );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pt-4', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-4', className)}>
            {children}
        </div>
    );
}
