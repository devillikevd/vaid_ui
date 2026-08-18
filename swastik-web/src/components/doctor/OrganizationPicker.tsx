'use client';

/**
 * OrganizationPicker
 * ──────────────────
 * A searchable, grouped, theme-aware combobox for selecting a clinic or hospital
 * from the doctor's active affiliations.
 *
 * Features:
 * • Search by org name and city
 * • Grouped CLINICS / HOSPITALS headers (non-selectable)
 * • Full dark/light mode via Tailwind dark: variants
 * • Portal-based popover — never clipped by modal overflow:hidden
 * • Loading / empty / error states
 * • Keyboard: Esc closes, arrows navigate, Enter selects
 * • Mobile friendly: full-width, internal scroll
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
    KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
    Building2,
    ChevronDown,
    X,
    Search,
    AlertCircle,
    RefreshCw,
    Loader2,
    MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoctorOrganization } from '@/stores/doctorStore';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrganizationPickerProps {
    organizations: DoctorOrganization[];
    value: string;
    valueType: 'clinic' | 'hospital' | '';
    onChange: (id: string, type: 'clinic' | 'hospital' | '') => void;
    loading?: boolean;
    hasError?: boolean;
    onRetry?: () => void;
    disabled?: boolean;
    className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function norm(s: string) {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function OrganizationPicker({
    organizations,
    value,
    valueType,
    onChange,
    loading = false,
    hasError = false,
    onRetry,
    disabled = false,
    className,
}: OrganizationPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const [popStyle, setPopStyle] = useState<React.CSSProperties>({});

    const triggerRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selectedOrg = useMemo(
        () => organizations.find((o) => o.id === value && o.type === valueType) ?? null,
        [organizations, value, valueType]
    );

    const filtered = useMemo(() => {
        const q = norm(query);
        if (!q) return organizations;
        return organizations.filter(
            (o) => norm(o.name).includes(q) || (o.city ? norm(o.city).includes(q) : false)
        );
    }, [organizations, query]);

    const clinics = useMemo(() => filtered.filter((o) => o.type === 'clinic'), [filtered]);
    const hospitals = useMemo(() => filtered.filter((o) => o.type === 'hospital'), [filtered]);
    const navigable = useMemo(() => [...clinics, ...hospitals], [clinics, hospitals]);

    // ── Positioning ──────────────────────────────────────────────────────────

    const computePos = useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom - 8;
        const spaceAbove = r.top - 8;
        const maxH = Math.min(320, Math.max(spaceBelow, spaceAbove) - 4);

        if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
            setPopStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, maxHeight: maxH, zIndex: 9999 });
        } else {
            setPopStyle({ position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight: maxH, zIndex: 9999 });
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        computePos();
        setTimeout(() => searchRef.current?.focus(), 40);
        window.addEventListener('scroll', computePos, true);
        window.addEventListener('resize', computePos);
        return () => {
            window.removeEventListener('scroll', computePos, true);
            window.removeEventListener('resize', computePos);
        };
    }, [open, computePos]);

    useEffect(() => {
        if (!open) return;
        const fn = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node) || popRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [open]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const toggle = () => {
        if (disabled || loading) return;
        if (!open) setQuery('');
        setFocusedIdx(-1);
        setOpen((o) => !o);
    };

    const select = (org: DoctorOrganization) => {
        onChange(org.id, org.type);
        setOpen(false);
        setQuery('');
        setFocusedIdx(-1);
    };

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('', '');
    };

    const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, navigable.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && focusedIdx >= 0 && navigable[focusedIdx]) { e.preventDefault(); select(navigable[focusedIdx]); }
    };

    // ── Loading / Error / Empty ───────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Loading affiliated organizations...
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">Unable to load affiliated organizations</p>
                    {onRetry && (
                        <button type="button" onClick={onRetry}
                            className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (organizations.length === 0) {
        return (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-xl flex items-start gap-3">
                <Building2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                    <p className="text-sm font-extrabold text-amber-900 dark:text-amber-200">No active affiliations</p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                        Join or accept an organization invitation before requesting an organization-specific leave.
                    </p>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={cn('relative', className)}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                    if (e.key === 'Escape') setOpen(false);
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={cn(
                    'w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl border-2 text-sm font-bold transition-all outline-none',
                    'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white',
                    open
                        ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <span className={cn('flex-1 text-left truncate', !selectedOrg && 'font-normal text-gray-400 dark:text-gray-500')}>
                    {selectedOrg ? selectedOrg.name : '— Choose a Clinic or Hospital —'}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                    {selectedOrg && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={clear}
                            className="p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
                            aria-label="Clear"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200', open && 'rotate-180')} />
                </span>
            </button>

            {/* Type badge + city shown below trigger when selected */}
            {selectedOrg && (
                <div className="flex items-center gap-2 mt-2 px-1">
                    <span className={cn(
                        'px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest',
                        selectedOrg.type === 'clinic'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    )}>
                        {selectedOrg.type === 'clinic' ? 'Clinic' : 'Hospital'}
                    </span>
                    {selectedOrg.city && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 font-medium">
                            <MapPin className="w-3 h-3" />
                            {selectedOrg.city}
                        </span>
                    )}
                </div>
            )}

            {/* Portal Popover */}
            {open && typeof window !== 'undefined' && createPortal(
                <div
                    ref={popRef}
                    role="listbox"
                    aria-label="Select organization"
                    style={popStyle}
                    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
                >
                    {/* Search bar */}
                    <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setFocusedIdx(-1); }}
                                onKeyDown={onSearchKey}
                                placeholder="Search clinic or hospital..."
                                className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
                            />
                            {query && (
                                <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
                        {navigable.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                No organizations match &ldquo;{query}&rdquo;
                            </p>
                        ) : (
                            <>
                                {/* Clinics */}
                                {clinics.length > 0 && (
                                    <section>
                                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                            Clinics
                                        </p>
                                        {clinics.map((org) => (
                                            <OrgRow
                                                key={`c:${org.id}`}
                                                org={org}
                                                isFocused={navigable.indexOf(org) === focusedIdx}
                                                isSelected={org.id === value && org.type === valueType}
                                                onSelect={select}
                                                onHover={() => setFocusedIdx(navigable.indexOf(org))}
                                            />
                                        ))}
                                    </section>
                                )}

                                {/* Hospitals */}
                                {hospitals.length > 0 && (
                                    <section className={cn(clinics.length > 0 && 'border-t border-gray-100 dark:border-gray-800')}>
                                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                            Hospitals
                                        </p>
                                        {hospitals.map((org) => (
                                            <OrgRow
                                                key={`h:${org.id}`}
                                                org={org}
                                                isFocused={navigable.indexOf(org) === focusedIdx}
                                                isSelected={org.id === value && org.type === valueType}
                                                onSelect={select}
                                                onHover={() => setFocusedIdx(navigable.indexOf(org))}
                                            />
                                        ))}
                                    </section>
                                )}
                            </>
                        )}
                        <div className="h-2" />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ── OrgRow ─────────────────────────────────────────────────────────────────────

function OrgRow({ org, isFocused, isSelected, onSelect, onHover }: {
    org: DoctorOrganization;
    isFocused: boolean;
    isSelected: boolean;
    onSelect: (o: DoctorOrganization) => void;
    onHover: () => void;
}) {
    const isClinic = org.type === 'clinic';
    const highlighted = isFocused || isSelected;

    return (
        <button
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(org)}
            onMouseEnter={onHover}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                highlighted
                    ? isClinic ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-blue-50 dark:bg-blue-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            )}
        >
            {/* Icon badge */}
            <div className={cn(
                'p-1.5 rounded-lg shrink-0 transition-colors',
                highlighted
                    ? isClinic ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
            )}>
                <Building2 className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    highlighted
                        ? isClinic ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                )} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-sm font-bold truncate transition-colors',
                    highlighted
                        ? isClinic ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-300'
                        : 'text-gray-900 dark:text-white'
                )}>
                    {org.name}
                </p>
                {org.city && (
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {org.city}
                    </p>
                )}
            </div>

            {/* Selected dot */}
            {isSelected && (
                <div className={cn('w-2 h-2 rounded-full shrink-0', isClinic ? 'bg-emerald-500' : 'bg-blue-500')} />
            )}
        </button>
    );
}
