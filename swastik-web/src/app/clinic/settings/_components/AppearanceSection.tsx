'use client';

import { useEffect } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from '@/components/shared/ThemeProvider';
import { useClinicStore } from '@/stores/clinicStore';
import { SettingsSection } from './SettingsSection';

type Theme = 'light' | 'dark' | 'system';

const OPTIONS: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', description: 'Bright interface for daytime use.', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Reduced glare for evening use.', icon: Moon },
    { value: 'system', label: 'System', description: 'Follow your device appearance.', icon: Monitor },
];

export function AppearanceSection({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
    const { theme, setTheme } = useTheme();
    const { dashboardPreferences, updateDashboardPreferences } = useClinicStore();

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

            {/* Dashboard Setup Progress Visibility Preference */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Dashboard Setup Progress
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Show the clinic profile completion progress and next action card on the Clinic Dashboard.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={dashboardPreferences?.show_profile_completion !== false}
                            onChange={(e) => updateDashboardPreferences({ show_profile_completion: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
                    </label>
                </div>
            </div>
        </SettingsSection>
    );
}
