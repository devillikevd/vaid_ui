'use client';

import { useEffect } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { SettingsSection } from './SettingsSection';

type Theme = 'light' | 'dark' | 'system';

const OPTIONS: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', description: 'Bright interface for daytime use.', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Reduced glare for evening use.', icon: Moon },
    { value: 'system', label: 'System', description: 'Follow your device appearance.', icon: Monitor },
];

export function AppearanceSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        onDirtyChange(false);
    }, [onDirtyChange]);

    return (
        <SettingsSection
            id="appearance"
            title="Appearance"
            description="Choose how the Clinic Portal looks on this device."
            icon={<Palette className="h-5 w-5" />}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            className={`rounded-xl border p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                isActive
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                                    isActive
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                            </span>
                            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{option.label}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                        </button>
                    );
                })}
            </div>
            <p className="mt-4 text-xs text-gray-400">
                Saved on this device. The portal keeps its clinic-branded pink accent in every mode.
            </p>
        </SettingsSection>
    );
}
