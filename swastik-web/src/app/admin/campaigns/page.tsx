'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, X, CheckCircle, XCircle, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminCampaignsStore, campaignStatus, type Campaign } from '@/stores/campaignsStore';

const PAGE_SIZE = 20;

const SCOPE_OPTIONS = [
    { value: 'global', label: 'Global (All Medicines)' },
    { value: 'category', label: 'Category' },
    { value: 'brand', label: 'Brand / Manufacturer' },
    { value: 'medicine', label: 'Specific Medicine' },
];

const STATUS_TABS = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'expired', label: 'Expired' },
] as const;

function toLocalInputValue(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
    if (!value) return '';
    return new Date(value).toISOString();
}

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function discountLabel(c: Campaign): string {
    return c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    upcoming: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    inactive: { label: 'Inactive', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminCampaignsPage() {
    const {
        campaigns,
        pagination,
        loading,
        error,
        fetchCampaigns,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        clearError,
    } = useAdminCampaignsStore();

    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>('all');
    const [scopeFilter, setScopeFilter] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    useEffect(() => {
        void fetchCampaigns(page, status, scopeFilter);
    }, [fetchCampaigns, page, status, scopeFilter]);

    const stats = useMemo(() => {
        const list = campaigns.length > 0 ? campaigns : [];
        const counts = { active: 0, upcoming: 0, expired: 0, inactive: 0 };
        list.forEach((c) => {
            counts[campaignStatus(c)] += 1;
        });
        return counts;
    }, [campaigns]);

    const emptyForm = () => ({
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        scope_type: 'global',
        scope_ref: '',
        min_order_value: '',
        max_discount_per_order: '',
        max_redemptions_total: '',
        max_redemptions_per_user: '1',
        start_at: '',
        end_at: '',
    });

    const resetForm = () => {
        setForm(emptyForm());
        setShowModal(false);
        setEditId(null);
    };

    const openEdit = (c: Campaign) => {
        setForm({
            name: c.name || '',
            description: c.description || '',
            discount_type: c.discount_type || 'percentage',
            discount_value: String(c.discount_value ?? ''),
            scope_type: c.scope_type || 'global',
            scope_ref: c.scope_ref || '',
            min_order_value: c.min_order_value ? String(c.min_order_value) : '',
            max_discount_per_order: c.max_discount_per_order ? String(c.max_discount_per_order) : '',
            max_redemptions_total: c.max_redemptions_total ? String(c.max_redemptions_total) : '',
            max_redemptions_per_user: c.max_redemptions_per_user ? String(c.max_redemptions_per_user) : '1',
            start_at: toLocalInputValue(c.start_at),
            end_at: toLocalInputValue(c.end_at),
        });
        setEditId(c.id);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        if (!form.start_at || !form.end_at) {
            toast.error('Invalid Dates', 'Please set both start and end date/time.');
            return;
        }
        const payload: Record<string, unknown> = {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            discount_type: form.discount_type,
            discount_value: parseFloat(form.discount_value),
            scope_type: form.scope_type,
            scope_ref: form.scope_ref.trim() || undefined,
            min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : undefined,
            max_discount_per_order: form.max_discount_per_order ? parseFloat(form.max_discount_per_order) : undefined,
            max_redemptions_total: form.max_redemptions_total ? parseInt(form.max_redemptions_total, 10) : undefined,
            max_redemptions_per_user: form.max_redemptions_per_user ? parseInt(form.max_redemptions_per_user, 10) : undefined,
            start_at: fromLocalInputValue(form.start_at),
            end_at: fromLocalInputValue(form.end_at),
        };
        if (!payload.discount_value || Number.isNaN(payload.discount_value)) {
            toast.error('Invalid Discount', 'Please enter a valid discount value.');
            return;
        }
        if (new Date(payload.end_at as string) <= new Date(payload.start_at as string)) {
            toast.error('Invalid Dates', 'End date must be after start date.');
            return;
        }

        setActionLoading('submit');
        const success = editId
            ? await updateCampaign(editId, payload)
            : await createCampaign(payload);
        setActionLoading(null);
        if (success) {
            toast.success(editId ? 'Campaign Updated' : 'Campaign Created', `"${form.name}" ${editId ? 'has been updated' : 'is now live'}.`);
            resetForm();
        }
    };

    const handleToggleActive = async (c: Campaign) => {
        setActionLoading(c.id);
        const success = await updateCampaign(c.id, { is_active: c.is_active === false });
        setActionLoading(null);
        if (success) {
            toast.success(c.is_active === false ? 'Campaign Activated' : 'Campaign Paused', `"${c.name}" has been ${c.is_active === false ? 'activated' : 'paused'}.`);
        }
    };

    const handleDelete = async (c: Campaign) => {
        const confirmed = await confirmAction({
            title: 'Delete Campaign',
            message: `Are you sure you want to permanently delete "${c.name}"? Redemptions linked to this campaign will also be removed.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        setActionLoading(c.id);
        const success = await deleteCampaign(c.id);
        setActionLoading(null);
        if (success) {
            toast.success('Campaign Deleted', `"${c.name}" has been deleted.`);
        }
    };

    const scopeLabel = (c: Campaign) => {
        switch (c.scope_type) {
            case 'global': return 'All Medicines';
            case 'category': return `Category: ${c.scope_ref || '—'}`;
            case 'brand': return `Brand: ${c.scope_ref || '—'}`;
            case 'medicine': return `Medicine: ${c.scope_ref || '—'}`;
            default: return c.scope_type;
        }
    };

    if (loading && campaigns.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discount Campaigns</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Create platform-wide offers that pharmacies opt into. Pricing is computed server-side.
                        <span className="ml-2 text-sm font-medium text-blue-600">{pagination.total} total campaigns</span>
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setShowModal(true); }} leftIcon={<Plus className="h-4 w-4" />}>
                    New Campaign
                </Button>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['active', 'upcoming', 'expired', 'inactive'] as const).map((k) => (
                    <Card key={k} className="p-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">{k}</div>
                        <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{stats[k]}</div>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {STATUS_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => { setStatus(t.key); setPage(1); }}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                status === t.key
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <select
                    value={scopeFilter}
                    onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                    <option value="">All Scopes</option>
                    {SCOPE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <div className="flex-1" />
                {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                <Button
                    variant="outline"
                    onClick={() => { clearError(); void fetchCampaigns(page, status, scopeFilter); }}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    Refresh
                </Button>
            </div>

            {/* Table */}
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Campaign</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Discount</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 sm:table-cell">Scope</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 md:table-cell">Period</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 lg:table-cell">Engagement</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {campaigns.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    No campaigns found. Click &quot;New Campaign&quot; to create one.
                                </td></tr>
                            ) : campaigns.map((c) => {
                                const st = campaignStatus(c);
                                const stStyle = STATUS_STYLES[st];
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                                    <BadgePercent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                                    {c.description && (
                                                        <div className="text-xs text-gray-400 line-clamp-1">{c.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {discountLabel(c)}
                                            </span>
                                        </td>
                                        <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                                            {scopeLabel(c)}
                                        </td>
                                        <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                                                {formatDate(c.start_at)} → {formatDate(c.end_at)}
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 lg:table-cell">
                                            <span className="text-xs text-gray-500">
                                                {c.opted_in_pharmacies ?? '—'} pharmacies opted in
                                                {c.total_redemptions ? ` · ${c.total_redemptions} redemptions` : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stStyle.cls}`}>
                                                {st === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                {stStyle.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => void handleToggleActive(c)}
                                                    disabled={actionLoading === c.id}
                                                    title={c.is_active === false ? 'Activate' : 'Pause'}
                                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-900/20"
                                                >
                                                    {actionLoading === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (c.is_active === false ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />)}
                                                </button>
                                                <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => void handleDelete(c)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                totalItems={pagination.total}
                itemsPerPage={PAGE_SIZE}
            />
            <ConfirmDialog {...dialogProps} />

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editId ? 'Edit Campaign' : 'New Discount Campaign'}</h2>
                            <button onClick={resetForm}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Input label="Campaign Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Monsoon Wellness Sale" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description shown to pharmacies & patients" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                                    <select
                                        value={form.discount_type}
                                        onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat Amount (₹)</option>
                                    </select>
                                </div>
                                <Input label="Discount Value *" type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} placeholder="e.g. 15" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scope</label>
                                    <select
                                        value={form.scope_type}
                                        onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    >
                                        {SCOPE_OPTIONS.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {form.scope_type !== 'global' ? (
                                    <Input
                                        label={form.scope_type === 'category' ? 'Category Name *' : form.scope_type === 'brand' ? 'Brand / Manufacturer *' : 'Medicine ID *'}
                                        value={form.scope_ref}
                                        onChange={(e) => setForm((f) => ({ ...f, scope_ref: e.target.value }))}
                                        placeholder={form.scope_type === 'medicine' ? 'UUID of the medicine' : `e.g. ${form.scope_type === 'category' ? 'painkiller' : 'Cipla'}`}
                                    />
                                ) : <div />}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Starts At *" type="datetime-local" value={form.start_at} onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))} />
                                <Input label="Ends At *" type="datetime-local" value={form.end_at} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Min Order Value (₹)" type="number" min="0" step="0.01" value={form.min_order_value} onChange={(e) => setForm((f) => ({ ...f, min_order_value: e.target.value }))} placeholder="e.g. 100" />
                                <Input label="Max Discount Per Order (₹)" type="number" min="0" step="0.01" value={form.max_discount_per_order} onChange={(e) => setForm((f) => ({ ...f, max_discount_per_order: e.target.value }))} placeholder="Optional cap" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Max Total Redemptions" type="number" min="1" value={form.max_redemptions_total} onChange={(e) => setForm((f) => ({ ...f, max_redemptions_total: e.target.value }))} placeholder="Optional budget cap" />
                                <Input label="Max Per User" type="number" min="1" value={form.max_redemptions_per_user} onChange={(e) => setForm((f) => ({ ...f, max_redemptions_per_user: e.target.value }))} placeholder="e.g. 1" />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button onClick={handleSubmit} isLoading={actionLoading === 'submit'} disabled={!form.name.trim()}>
                                {editId ? 'Update Campaign' : 'Create Campaign'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
