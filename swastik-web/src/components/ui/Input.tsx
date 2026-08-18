import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, leftIcon, rightIcon, type, id, ...props }, ref) => {
        const generatedId = useId().replace(/:/g, '');
        const normalizedLabel = label
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const inputId = id || (normalizedLabel ? `${normalizedLabel}-${generatedId}` : `input-${generatedId}`);
        const errorId = error ? `${inputId}-error` : undefined;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-semibold text-gray-900 dark:text-gray-200 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={type}
                        {...(error ? { 'aria-invalid': true } : {})}
                        aria-describedby={errorId}
                        className={cn(
                            'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-gray-100 font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400',
                            'transition-colors hover:border-gray-400 dark:hover:border-gray-500',
                            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-500/30',
                            'disabled:bg-gray-50 disabled:cursor-not-allowed dark:disabled:bg-gray-800/50',
                            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:ring-red-500/30',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
