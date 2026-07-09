'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    FlaskConical,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    RefreshCw,
    Search,
    Clock3,
    IndianRupee,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { useDiagnosticCenterStore, type DiagnosticTest } from '@/stores/diagnosticCenterStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DiagnosticMasterCatalogSearch } from '@/components/diagnostic-center/DiagnosticMasterCatalogSearch';
import { useToast } from '@/components/ui/Toast';

const DEFAULT_CATEGORIES = [
    'Pathology',
    'Radiology',
    'Blood Test',
    'Urine Test',
    'Imaging',
    'Cardiology',
    'Wellness',
    'Other',
];

type TestFormState = {
    name: string;
    category: string;
    description: string;
    price: string;
    discounted_price: string;
    turnaround_hours: string;
    sample_type: string;
    preparation_instructions: string;
    is_active: boolean;
    master_test_id: string;
};

const emptyForm = (): TestFormState => ({
    name: '',
    category: '',
    description: '',
    price: '',
    discounted_price: '',
    turnaround_hours: '24',
    sample_type: '',
    preparation_instructions: '',
    is_active: true,
    master_test_id: '',
});

export default function DiagnosticCenterTestsPage() {
    const {
        tests,
        testsPagination,
        loadingTests,
        error,
        fetchTests,
        addTest,
        updateTest,
        deleteTest,
        clearError,
    } = useDiagnosticCenterStore();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTest, setEditingTest] = useState<DiagnosticTest | null>(null);
    const [form, setForm] = useState<TestFormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const pageSize = 10;
    const toast = useToast();

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [search, categoryFilter]);

    useEffect(() => {
        fetchTests({
            page,
            limit: pageSize,
            search: debouncedSearch || undefined,
            category: categoryFilter || undefined,
        });
    }, [categoryFilter, debouncedSearch, fetchTests, page]);

    const categoryOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    [...DEFAULT_CATEGORIES, ...tests.map((test) => test.category).filter(Boolean)]
                )
            ).sort((left, right) => left.localeCompare(right)),
        [tests]
    );

    const resetForm = () => {
        setForm(emptyForm());
        setEditingTest(null);
        setShowForm(false);
    };

    const startCreate = () => {
        clearError();
        setEditingTest(null);
        setForm(emptyForm());
        setShowForm(true);
    };

    const startEdit = (test: DiagnosticTest) => {
        clearError();
        setEditingTest(test);
        setForm({
            name: test.name || '',
            category: test.category || '',
            description: test.description || '',
            price: String(test.price ?? ''),
            discounted_price: test.discounted_price != null ? String(test.discounted_price) : '',
            turnaround_hours: String(test.turnaround_hours ?? 24),
            sample_type: test.sample_type || '',
            preparation_instructions: test.preparation_instructions || '',
            is_active: test.is_active,
            master_test_id: test.master_test_id || '',
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.category.trim() || !form.price.trim()) return;

        setSaving(true);
        const payload = {
            name: form.name.trim(),
            category: form.category.trim(),
            description: form.description.trim() || undefined,
            price: Number(form.price),
            discounted_price: form.discounted_price ? Number(form.discounted_price) : undefined,
            turnaround_hours: Number(form.turnaround_hours || 24),
            sample_type: form.sample_type.trim() || undefined,
            preparation_instructions: form.preparation_instructions.trim() || undefined,
            is_active: form.is_active,
            master_test_id: form.master_test_id || undefined,
        };

        const success = editingTest
            ? await updateTest(editingTest.id, payload)
            : await addTest(payload);

        setSaving(false);
        if (success) {
            resetForm();
            fetchTests({
                page: editingTest ? page : 1,
                limit: pageSize,
                search: debouncedSearch || undefined,
                category: categoryFilter || undefined,
            });
        }
    };

    const handleDelete = async (testId: string) => {
        const confirmed = window.confirm('Deactivate this test from your catalog?');
        if (!confirmed) return;
        const success = await deleteTest(testId);
        if (success) {
            fetchTests({
                page,
                limit: pageSize,
                search: debouncedSearch || undefined,
                category: categoryFilter || undefined,
            });
        }
    };

    const activeCount = tests.filter((test) => test.is_active).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Test Catalog</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage the tests patients can book from your center</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => fetchTests({ page, limit: pageSize, search: debouncedSearch || undefined, category: categoryFilter || undefined })}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        Refresh
                    </Button>
                    <Button onClick={startCreate} leftIcon={<Plus className="h-4 w-4" />}>
                        Add Test
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <FlaskConical className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{testsPagination.total}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Clock3 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Active On This Page</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <IndianRupee className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Page Revenue Potential</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                ₹{tests.reduce((sum, test) => sum + Number(test.discounted_price ?? test.price ?? 0), 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {error && (
                <div className="px-4 py-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tests by name or category..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200"
                >
                    <option value="">All Categories</option>
                    {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {showForm && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</CardTitle>
                        <Button variant="outline" size="sm" onClick={resetForm}>
                            Cancel
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {!editingTest && (
                            <DiagnosticMasterCatalogSearch
                                onSelect={(test) => {
                                    setForm(prev => ({
                                        ...prev,
                                        master_test_id: test.id,
                                        name: test.name,
                                        category: test.category || 'Other',
                                        description: test.description || '',
                                        price: String(test.suggested_price || ''),
                                        preparation_instructions: test.preparation_instructions || '',
                                        turnaround_hours: String(test.turnaround_hours || 24),
                                        sample_type: test.sample_type || '',
                                    }));
                                    toast.success('Auto-filled from Master Catalog!');
                                }}
                            />
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Test Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                            <Input label="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
                            <Input label="Price (₹)" type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
                            <Input label="Discounted Price (₹)" type="number" value={form.discounted_price} onChange={(event) => setForm((current) => ({ ...current, discounted_price: event.target.value }))} />
                            <Input label="Turnaround Hours" type="number" value={form.turnaround_hours} onChange={(event) => setForm((current) => ({ ...current, turnaround_hours: event.target.value }))} />
                            <Input label="Sample Type" value={form.sample_type} onChange={(event) => setForm((current) => ({ ...current, sample_type: event.target.value }))} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                    rows={3}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200"
                                />
                            </label>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Preparation Instructions
                                <textarea
                                    value={form.preparation_instructions}
                                    onChange={(event) => setForm((current) => ({ ...current, preparation_instructions: event.target.value }))}
                                    rows={3}
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-gray-200"
                                />
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                                />
                                Show this test to patients
                            </label>
                        </div>
                        <div className="mt-4">
                            <Button onClick={handleSubmit} isLoading={saving} disabled={!form.name.trim() || !form.category.trim() || !form.price.trim()}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editingTest ? 'Update Test' : 'Save Test'}
                            </Button>
                        </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {loadingTests ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            ) : tests.length > 0 ? (
                <>
                    <div className="space-y-4">
                        {tests.map((test) => (
                            <Card key={test.id}>
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{test.name}</h3>
                                            <StatusBadge status={test.is_active ? 'active' : 'inactive'} size="sm" />
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {test.category} • {test.sample_type || 'Sample type not set'} • {test.turnaround_hours} hrs
                                        </p>
                                        {test.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{test.description}</p>
                                        )}
                                        {test.preparation_instructions && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Prep: {test.preparation_instructions}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start lg:items-end gap-3">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                                ₹{Number(test.discounted_price ?? test.price ?? 0).toLocaleString('en-IN')}
                                            </p>
                                            {test.discounted_price && (
                                                <p className="text-sm text-gray-400 line-through">₹{Number(test.price ?? 0).toLocaleString('en-IN')}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => startEdit(test)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="outline" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => handleDelete(test.id)}>
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Pagination
                        currentPage={page}
                        totalPages={testsPagination.totalPages}
                        onPageChange={setPage}
                        totalItems={testsPagination.total}
                        itemsPerPage={testsPagination.limit}
                    />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-56 text-gray-500 dark:text-gray-400">
                    <FlaskConical className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="font-medium">No tests found</p>
                    <p className="text-sm mt-1">Start by creating your first diagnostic test.</p>
                    <Button className="mt-4" onClick={startCreate} leftIcon={<Plus className="h-4 w-4" />}>
                        Add First Test
                    </Button>
                </div>
            )}
        </div>
    );
}
