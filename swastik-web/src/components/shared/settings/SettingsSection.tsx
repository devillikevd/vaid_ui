import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Edit2, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SettingsAccentColor = 'purple' | 'pink' | 'orange' | 'emerald' | 'blue';

export interface SettingsSectionProps {
    id: string;
    title: React.ReactNode;
    icon: React.ElementType;
    description?: React.ReactNode;
    isEditing?: boolean;
    onEdit?: () => void;
    onCancel?: () => void;
    onSave?: () => void;
    isSaving?: boolean;
    isSecurity?: boolean;
    hideHeader?: boolean;
    children: React.ReactNode;
    accentColor?: SettingsAccentColor;
}

export const SETTINGS_ACCENT_STYLES: Record<SettingsAccentColor, any> = {
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        borderHover: 'hover:border-purple-200',
        bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
        textHover: 'hover:text-purple-700 dark:hover:text-purple-400',
        btnBg: 'bg-purple-600 hover:bg-purple-700',
    },
    pink: {
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        text: 'text-pink-600 dark:text-pink-400',
        borderHover: 'hover:border-pink-200',
        bgHover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20',
        textHover: 'hover:text-pink-700 dark:hover:text-pink-400',
        btnBg: 'bg-pink-600 hover:bg-pink-700',
    },
    orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-600 dark:text-orange-400',
        borderHover: 'hover:border-orange-200',
        bgHover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
        textHover: 'hover:text-orange-700 dark:hover:text-orange-400',
        btnBg: 'bg-orange-600 hover:bg-orange-700',
    },
    emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        borderHover: 'hover:border-emerald-200',
        bgHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
        textHover: 'hover:text-emerald-700 dark:hover:text-emerald-400',
        btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    },
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        borderHover: 'hover:border-blue-200',
        bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
        textHover: 'hover:text-blue-700 dark:hover:text-blue-400',
        btnBg: 'bg-blue-600 hover:bg-blue-700',
    }
};

export function SettingsSection({
    id,
    title,
    icon: Icon,
    description,
    isEditing = false,
    onEdit,
    onCancel,
    onSave,
    isSaving = false,
    isSecurity = false,
    hideHeader = false,
    children,
    accentColor = 'purple'
}: SettingsSectionProps) {
    const style = SETTINGS_ACCENT_STYLES[accentColor];

    return (
        <Card id={id} className={cn(
            "mb-8 overflow-hidden border-gray-200/60 dark:border-gray-800/60 shadow-sm rounded-2xl scroll-mt-24 lg:scroll-mt-32 transition-all",
            isSecurity ? "bg-gray-50/30 dark:bg-gray-900/10" : "bg-white dark:bg-[#0B1020]"
        )}>
            {!hideHeader && (
                <CardHeader className="pb-2 pt-6 px-6 sm:px-8 border-b-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-gray-100">
                                <div className={cn("p-2 rounded-xl", style.bg)}>
                                    <Icon className={cn("h-4 w-4", style.text)} />
                                </div>
                                {title}
                            </CardTitle>
                            {description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-[42px]">{description}</p>
                            )}
                        </div>
                        
                        <div className="shrink-0 pt-1">
                            {!isEditing && onEdit ? (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={onEdit} 
                                    className={cn(
                                        "h-8 gap-1.5 border-gray-200 dark:border-gray-700 text-gray-600 transition-colors rounded-lg font-medium shadow-none",
                                        style.textHover, style.borderHover, style.bgHover
                                    )}
                                >
                                    <Edit2 className="h-3 w-3" /> Edit
                                </Button>
                            ) : null}
                            
                            {isEditing && (onCancel || onSave) ? (
                                <div className="flex items-center gap-2">
                                    {onCancel && (
                                        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving} className="h-8 text-gray-500 hover:text-gray-700">
                                            Cancel
                                        </Button>
                                    )}
                                    {onSave && (
                                        <Button size="sm" onClick={onSave} disabled={isSaving} className={cn("h-8 gap-1.5 text-white rounded-lg shadow-sm font-medium", style.btnBg)}>
                                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
            )}
            <CardContent className={cn("px-6 sm:px-8 pb-8 pt-4", hideHeader && "pt-8")}>
                {children}
            </CardContent>
        </Card>
    );
}
