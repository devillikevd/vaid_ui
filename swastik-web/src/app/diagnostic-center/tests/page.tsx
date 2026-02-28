'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, FlaskConical, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDiagnosticCenterStore, type DiagnosticTest } from '@/stores/diagnosticCenterStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination, usePagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';

const TEST_CATEGORIES = [
    'blood_test', 'urine_test', 'imaging', 'cardiac', 'hormone',
    'allergy', 'genetic', 'microbiology', 'pathology', 'other'
];

const SAMPLE_TYPES = ['Blood', 'Urine', 'Saliva', 'Stool', 'Swab', 'Tissue', 'None', 'Other'];

const categoryLabel = (cat: string) =>
    cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function TestCatalogPage() {
    const { tests, isLoading, error, fetchTests, addTest, updateTest, deleteTest, clearError } = useDiagnosticCenterStore();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTest, setEditingTest] = useState<DiagnosticTest | null>(null);
    const [form, setForm] = useState({
        name: '', category: 'blood_test', description: '', price: '',
        discounted_price: '', turnaround_hours: '24', sample_type: 'Blood',
        preparation_instructions: '', is_active: true,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchTests(filterCategory || undefined); }, [fetchTests, filterCategory]);

    const resetForm = () => {
        setForm({ name: '', category: 'blood_test', description: '', price: '', discounted_price: '', turnaround_hours: '24', sample_type: 'Blood', preparation_instructions: '', is_active: true });
        setEditingTest(null);
        setShowForm(false);
    };

    const openEdit = (test: DiagnosticTest) => {
        setEditingTest(test);
        setForm({
            name: test.name, category: test.category, description: test.description || '',
            price: test.price.toString(), discounted_price: test.discounted_price?.toString() || '',
            turnaround_hours: test.turnaround_hours.toString(), sample_type: test.sample_type || 'Blood',
            preparation_instructions: test.preparation_instructions || '', is_active: test.is_active,
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.price) return;
        setSaving(true);
        clearError();
        const payload = {
            name: form.name, category: form.category, description: form.description || undefined,
            price: parseFloat(form.price),
            discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : undefined,
            turnaround_hours: parseInt(form.turnaround_hours) || 24,
            sample_type: form.sample_type, preparation_instructions: form.preparation_instructions || undefined,
            is_active: form.is_active,
        };
        const success = editingTest
            ? await updateTest(editingTest.id, payload)
            : await addTest(payload);
        if (success) resetForm();
        setSaving(false);
    };

    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    const handleDelete = async (testId: string) => {
        const confirmed = await confirmAction({ title: 'Delete Test', message: 'Delete this test? This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
        if (!confirmed) return;
        await deleteTest(testId);
    };

    const filtered = tests.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    );
    const { totalPages, totalItems, itemsPerPage, paginate } = usePagination(filtered, 10);
    const paginatedItems = paginate(page);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Test Catalog</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage diagnostic tests offered by your center</p>
                </div>
                <Button onClick={() => { resetForm(); setShowForm(true); }} leftIcon={<Plus className="h-4 w-4" />}>
                    Add Test
                </Button>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
            )}

            {/* Form Modal */}
            {showForm && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</CardTitle>
                        <button onClick={resetForm} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Test Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Complete Blood Count" />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {TEST_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                                </select>
                            </div>
                            <Input label="Price (₹) *" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="350" />
                            <Input label="Discounted Price (₹)" type="number" value={form.discounted_price} onChange={e => setForm(f => ({ ...f, discounted_price: e.target.value }))} placeholder="Optional" />
                            <Input label="Turnaround (Hours)" type="number" value={form.turnaround_hours} onChange={e => setForm(f => ({ ...f, turnaround_hours: e.target.value }))} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sample Type</label>
                                <select
                                    value={form.sample_type}
                                    onChange={e => setForm(f => ({ ...f, sample_type: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {SAMPLE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the test" />
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Preparation Instructions" value={form.preparation_instructions} onChange={e => setForm(f => ({ ...f, preparation_instructions: e.target.value }))} placeholder="e.g. 12 hours fasting required" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox" checked={form.is_active} id="is_active"
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Active (visible to patients)</label>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <Button onClick={handleSubmit} isLoading={saving}>
                                {editingTest ? 'Update Test' : 'Add Test'}
                            </Button>
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text" placeholder="Search tests..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                    <option value="">All Categories</option>
                    {TEST_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
            </div>

            {/* Test List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
            ) : filtered.length > 0 ? (
                <div className="grid gap-4">
                    {paginatedItems.map((test) => (
                        <Card key={test.id}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                                        <FlaskConical className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{test.name}</h3>
                                            <StatusBadge status={test.is_active ? 'active' : 'inactive'} size="sm" />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            {categoryLabel(test.category)} • {test.sample_type || 'N/A'} • {test.turnaround_hours}h turnaround
                                        </p>
                                        {test.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{test.description}</p>}
                                        {test.preparation_instructions && (
                                            <p className="text-xs text-amber-600 mt-1">⚠️ {test.preparation_instructions}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{test.price}</p>
                                        {test.discounted_price && (
                                            <p className="text-sm text-green-600">Offer: ₹{test.discounted_price}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(test)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Edit">
                                            <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        </button>
                                        <button onClick={() => handleDelete(test.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                    <FlaskConical className="h-12 w-12 text-gray-300 mb-3" />
                    <p>No tests found. Add your first test to get started.</p>
                </div>
            )}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
            />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
