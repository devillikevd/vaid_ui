'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
});

export function useTheme() {
    return useContext(ThemeContext);
}

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeProviderProps {
    children: ReactNode;
    storageKey?: string;
    defaultTheme?: Theme;
}

export function ThemeProvider({
    children,
    storageKey = 'vaididea-theme-default',
    defaultTheme = 'light',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    // 1. Load saved theme from portal-specific key on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey) as Theme | null;
            if (saved && ['light', 'dark', 'system'].includes(saved)) {
                setThemeState(saved);
            }
        } catch {
            // ignore localStorage errors
        }
        setMounted(true);
    }, [storageKey]);

    // 2. Resolve theme and apply to documentElement only while this portal is active
    useEffect(() => {
        if (!mounted) return;

        const resolved = theme === 'system' ? getSystemTheme() : theme;
        setResolvedTheme(resolved);

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
        root.style.colorScheme = resolved;
    }, [theme, mounted]);

    // 3. Listen for system theme changes when in 'system' mode
    useEffect(() => {
        if (!mounted || theme !== 'system') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const resolved = e.matches ? 'dark' : 'light';
            setResolvedTheme(resolved);
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            root.style.colorScheme = resolved;
        };

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme, mounted]);

    // 4. CRITICAL: Cleanup on portal unmount (leaving portal -> reset html to Light)
    useEffect(() => {
        return () => {
            if (typeof document !== 'undefined') {
                const root = document.documentElement;
                root.classList.remove('dark');
                root.classList.add('light');
                root.style.colorScheme = 'light';
            }
        };
    }, []);

    const setTheme = (t: Theme) => {
        setThemeState(t);
        try {
            localStorage.setItem(storageKey, t);
        } catch {
            // ignore localStorage errors
        }
    };

    const toggleTheme = () => {
        const next = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(next);
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
