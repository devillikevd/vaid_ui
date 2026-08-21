import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { SettingsAccentColor } from './SettingsSection';

export interface NavItem {
    id: string;
    label: string;
    icon?: React.ElementType;
}

export interface NavGroup {
    name: string;
    items: NavItem[];
}

export interface SettingsNavigationProps {
    variant?: 'default' | 'premium-box';
    groups?: NavGroup[];
    categories?: NavGroup[];
    activeSection: string;
    accentColor?: SettingsAccentColor;
    onSelect?: (id: string) => void;
    onSectionSelect?: (id: string) => void;
}

export function SettingsNavigation({ groups, categories, activeSection, accentColor = 'purple', onSelect, onSectionSelect, variant = 'default' }: SettingsNavigationProps) {
    const displayGroups = groups || categories || [];
    const handleSelect = onSelect || onSectionSelect;
    
    const accentStyles = {
        purple: {
            activeItem: 'bg-purple-50/80 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-semibold',
            indicator: 'shadow-[0_0_8px_rgba(147,51,234,0.4)] bg-purple-600',
        },
        pink: {
            activeItem: 'bg-pink-50/80 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 font-semibold',
            indicator: 'shadow-[0_0_8px_rgba(236,72,153,0.4)] bg-pink-600',
        },
        orange: {
            activeItem: 'bg-orange-50/80 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold',
            indicator: 'shadow-[0_0_8px_rgba(249,115,22,0.4)] bg-orange-600',
        },
        emerald: {
            activeItem: 'bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold',
            indicator: 'shadow-[0_0_8px_rgba(16,185,129,0.4)] bg-emerald-600',
        },
        blue: {
            activeItem: 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold',
            indicator: 'shadow-[0_0_8px_rgba(59,130,246,0.4)] bg-blue-600',
        }
    };

    const style = accentStyles[accentColor];

    const handleClick = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (handleSelect) {
            handleSelect(id);
        }
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <nav className={cn("hidden lg:block w-64 shrink-0 lg:sticky lg:top-24", variant === 'premium-box' ? "space-y-8" : "space-y-6 lg:space-y-8")}>
            {displayGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                    {group.name && (
                        <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">
                            {group.name}
                        </h4>
                    )}
                    <ul className={cn(variant === 'premium-box' ? "space-y-2.5" : "space-y-1")}>
                        {group.items.map((item) => {
                            const isActive = activeSection === item.id;
                            
                            if (variant === 'premium-box') {
                                const Icon = item.icon;
                                return (
                                    <li key={item.id}>
                                        <a
                                            href={`#${item.id}`}
                                            onClick={(e) => handleClick(item.id, e)}
                                            className={cn(
                                                "flex items-center justify-between p-3.5 rounded-[14px] text-sm transition-all duration-200 border group",
                                                isActive 
                                                    ? "bg-[#F5F3FF] dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50 text-purple-900 dark:text-purple-100 font-semibold shadow-sm" 
                                                    : "bg-white dark:bg-transparent border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/5 hover:border-purple-100 dark:hover:border-purple-900/30 hover:text-gray-900 dark:hover:text-gray-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {Icon && (
                                                    <div className={cn(
                                                        "p-2 rounded-xl transition-colors",
                                                        isActive 
                                                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" 
                                                            : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20"
                                                    )}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                )}
                                                {isActive && <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-purple-600 dark:bg-purple-500 rounded-r-full" />}
                                                <span>{item.label}</span>
                                            </div>
                                            <ChevronRight className={cn(
                                                "h-4 w-4 transition-transform",
                                                isActive 
                                                    ? "text-purple-600 dark:text-purple-400 translate-x-0.5" 
                                                    : "text-gray-300 dark:text-gray-600 group-hover:text-purple-400 dark:group-hover:text-purple-500 group-hover:translate-x-0.5"
                                            )} />
                                        </a>
                                    </li>
                                );
                            }

                            return (
                                <li key={item.id} className="relative">
                                    {isActive && (
                                        <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full", style.indicator)} />
                                    )}
                                    <a
                                        href={`#${item.id}`}
                                        onClick={(e) => handleClick(item.id, e)}
                                        className={cn(
                                            "flex items-center px-4 py-2.5 rounded-xl text-sm transition-all",
                                            isActive 
                                                ? style.activeItem 
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                                        )}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export function SettingsNavigationMobile({ groups, categories, activeSection, accentColor = 'purple', onSelect, onSectionSelect, variant = 'default' }: SettingsNavigationProps) {
    const displayGroups = groups || categories || [];
    const handleSelect = onSelect || onSectionSelect;
    
    const accentStyles = {
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold border-purple-200 dark:border-purple-800',
        pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 font-bold border-pink-200 dark:border-pink-800',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-bold border-orange-200 dark:border-orange-800',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-200 dark:border-emerald-800',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border-blue-200 dark:border-blue-800',
    };

    const style = accentStyles[accentColor];
    const allItems = displayGroups.flatMap(g => g.items);

    const handleClick = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (handleSelect) {
            handleSelect(id);
        }
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="lg:hidden sticky top-[60px] z-30 bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
            <div className="flex overflow-x-auto scrollbar-hide gap-2 snap-x">
                {allItems.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={(e) => handleClick(item.id, e)}
                            className={cn(
                                "shrink-0 snap-start px-4 py-2 text-sm rounded-full transition-all border",
                                isActive 
                                    ? style 
                                    : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium"
                            )}
                        >
                            {item.label}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
