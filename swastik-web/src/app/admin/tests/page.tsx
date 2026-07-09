'use client';

import { useDeferredValue, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Search, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, X, Upload, Download, Image } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAdminTestsStore, type MasterTest } from '@/stores/adminTestsStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { downloadCSV } from '@/utils/export';
import { parseCSV } from '@/utils/csvParser';
import { uploadApi } from '@/lib/api';

const PAGE_SIZE = 20;

const CATEGORIES = [
    'Blood Test', 'Urine Test', 'Imaging', 'Pathology', 'Cardiology',
    'Neurology', 'Hormone Test', 'Diabetes', 'Vitamins', 'Other'
];

export default function AdminTestsPage() {
    const {
        tests,
        pagination,
        loading,
        error,
        fetchTests,
        addTest,
        addBulkTests,
        updateTest,
        deleteTest,
        clearError,
    } = useAdminTestsStore();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    // CSV Import state
    const [showCsvMapping, setShowCsvMapping] = useState(false);
    const [csvRawData, setCsvRawData] = useState<any[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
    const [csvPreview, setCsvPreview] = useState<any[]>([]);

    const CSV_FIELDS = [
        { key: 'name', label: 'Test Name *', required: true },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'sample_type', label: 'Sample Type' },
        { key: 'preparation_instructions', label: 'Preparation Instructions' },
    ];

    const guessMapping = useCallback((headers: string[]): Record<string, string> => {
        const mapping: Record<string, string> = {};
        const headerLower = headers.map(h => h.toLowerCase().trim());
        CSV_FIELDS.forEach(field => {
            const fieldLower = field.key.toLowerCase();
            const idx = headerLower.findIndex(h =>
                h === fieldLower ||
                h.replace(/[\s_-]/g, '') === fieldLower.replace(/[\s_-]/g, '') ||
                fieldLower.includes(h.replace(/[\s_-]/g, '')) ||
                h.replace(/[\s_-]/g, '').includes(fieldLower)
            );
            if (idx !== -1) {
                mapping[headers[idx]] = field.key;
            }
        });
        return mapping;
    }, []);

    const [form, setForm] = useState({
        name: '',
        category: '',
        description: '',
        sample_type: '',
        preparation_instructions: '',
        icon_url: '',
        icon_storage_url: '',
    });

    useEffect(() => {
        void fetchTests(page, deferredSearchQuery);
    }, [deferredSearchQuery, fetchTests, page]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery]);

    const resetForm = () => {
        setForm({
            name: '', category: '', description: '', sample_type: '', preparation_instructions: '', icon_url: '', icon_storage_url: ''
        });
        setShowAdd(false);
        setEditId(null);
    };

    const openEdit = (test: MasterTest) => {
        setForm({
            name: test.name || '',
            category: test.category || '',
            description: test.description || '',
            sample_type: test.sample_type || '',
            preparation_instructions: test.preparation_instructions || '',
            icon_url: test.icon_url || '',
            icon_storage_url: test.icon_url || '',
        });
        setEditId(test.id);
        setShowAdd(true);
    };

    const handleIconUpload = async (file: File) => {
        setUploadingIcon(true);
        try {
            const fields: Record<string, string> = {};
            if (editId) fields.testId = editId;
            const res = (await uploadApi.uploadFile(file, 'master-test', fields)) as any;
            const json: any = await res.json();
            if (json.success && (json.data?.storageUrl || json.data?.url)) {
                setForm(c => ({ 
                    ...c, 
                    icon_url: json.data.url || json.data.resolvedUrl || json.data.storageUrl,
                    icon_storage_url: json.data.storageUrl 
                }));
                toast.success('Icon uploaded successfully');
            } else {
                toast.error('Upload failed', json.error || 'Could not upload icon');
            }
        } catch {
            toast.error('Upload failed', 'Network error while uploading icon');
        } finally {
            setUploadingIcon(false);
        }
        if (iconInputRef.current) iconInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.name || !form.category) {
            toast.error('Name and category are required');
            return;
        }

        const submitData = {
            ...form,
            icon_url: form.icon_storage_url ? form.icon_storage_url.trim().split('?')[0] : (form.icon_url.trim().split('?')[0] || undefined)
        };

        const success = editId
            ? await updateTest(editId, submitData)
            : await addTest(submitData);

        if (success) {
            toast.success(`Test ${editId ? 'updated' : 'added'} successfully`);
            resetForm();
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Delete Master Test',
            message: `Are you sure you want to delete "${name}"? This will permanently remove it from the global catalog.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });

        if (!confirmed) return;

        setActionLoading(id);
        const success = await deleteTest(id);
        if (success) {
            toast.success('Test deleted successfully');
            if (tests.length === 1 && page > 1) {
                setPage(page - 1);
            }
        }
        setActionLoading(null);
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target?.result as string;
            const parsedData = parseCSV(csvText);

            if (parsedData.length === 0) {
                toast.error('Invalid CSV', 'No data found in the CSV file');
                return;
            }

            const headers = Object.keys(parsedData[0]);
            setCsvHeaders(headers);
            setCsvRawData(parsedData);
            setCsvPreview(parsedData.slice(0, 5));
            setCsvMapping(guessMapping(headers));
            setShowCsvMapping(true);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmCSVImport = async () => {
        const mappedData = csvRawData.map(row => {
            const mapped: any = {};
            for (const [header, field] of Object.entries(csvMapping)) {
                mapped[field] = row[header];
            }
            const unmappedHeaders = csvHeaders.filter(h => !csvMapping[h]);
            for (const h of unmappedHeaders) {
                mapped[h] = row[h];
            }
            return mapped;
        });

        if (!mappedData.some(item => item.name)) {
            toast.error('Missing Mapping', 'Please map at least the Test Name field');
            return;
        }

        setActionLoading('import');
        const success = await addBulkTests(mappedData);
        if (success) {
            toast.success('Import Successful', `Successfully imported ${mappedData.length} tests.`);
        }
        setActionLoading(null);
        setShowCsvMapping(false);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Master Diagnostic Tests</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage the central catalog of diagnostic tests
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        accept=".csv"
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV([], [
                            { key: 'name', label: 'name' },
                            { key: 'category', label: 'category' },
                            { key: 'description', label: 'description' },
                            { key: 'sample_type', label: 'sample_type' },
                            { key: 'preparation_instructions', label: 'preparation_instructions' },
                        ], 'master_tests_template')}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Template
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={actionLoading === 'import'}
                        className="gap-2"
                    >
                        {actionLoading === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {actionLoading === 'import' ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => void fetchTests(page, deferredSearchQuery)}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setShowAdd(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Test
                    </Button>
                </div>
            </div>

            {error && (
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                    <button onClick={clearError} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {showAdd && (
                <Card className="p-6 border-brand-200 dark:border-brand-800 shadow-brand-100/50 dark:shadow-brand-900/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {editId ? 'Edit Test' : 'Add New Test'}
                        </h2>
                        <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 w-8 rounded-full">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Test Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Complete Blood Count (CBC)"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:ring-brand-400"
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sample Type</label>
                                <Input
                                    value={form.sample_type}
                                    onChange={(e) => setForm({ ...form, sample_type: e.target.value })}
                                    placeholder="e.g. Blood, Urine"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Test Icon</label>
                                <div className="flex items-center gap-3">
                                    {form.icon_url ? (
                                        <div className="relative group">
                                            <img src={form.icon_url} alt="Icon" className="h-12 w-12 rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
                                            <button
                                                type="button"
                                                onClick={() => setForm(c => ({ ...c, icon_url: '', icon_storage_url: '' }))}
                                                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                                            <Image className="h-6 w-6 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="file"
                                            ref={iconInputRef}
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleIconUpload(f); }}
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => iconInputRef.current?.click()}
                                            isLoading={uploadingIcon}
                                            leftIcon={!uploadingIcon ? <Upload className="h-4 w-4" /> : undefined}
                                        >
                                            {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                                        </Button>
                                        <span className="text-xs text-gray-400">JPEG, PNG, GIF, WebP</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Preparation Instructions</label>
                                <Input
                                    value={form.preparation_instructions}
                                    onChange={(e) => setForm({ ...form, preparation_instructions: e.target.value })}
                                    placeholder="e.g. Fasting required for 10-12 hours"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Test description..."
                                    className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:ring-brand-400"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editId ? 'Save Changes' : 'Add Test'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center max-w-md bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all">
                        <div className="pl-3 text-slate-400">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search tests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-medium">Test Info</th>
                                <th className="px-6 py-4 font-medium">Category</th>
                                <th className="px-6 py-4 font-medium">Sample Type</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading && !tests.length ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500 mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400">Loading tests...</p>
                                    </td>
                                </tr>
                            ) : tests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <p className="text-slate-900 dark:text-white font-medium">No tests found</p>
                                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                                            {searchQuery ? 'Try adjusting your search' : 'Add your first diagnostic test'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                tests.map((test) => (
                                    <tr key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {test.icon_url ? (
                                                    <img src={test.icon_url} alt={test.name} className="h-10 w-10 rounded-md object-cover border border-slate-200 dark:border-slate-700" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 font-medium">
                                                        {test.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{test.name}</div>
                                                    {test.preparation_instructions && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={test.preparation_instructions}>
                                                            Prep: {test.preparation_instructions}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                {test.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {test.sample_type || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(test)}
                                                    className="h-8 w-8 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => void handleDelete(test.id, test.name)}
                                                    disabled={actionLoading === test.id}
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    {actionLoading === test.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>
            
            <ConfirmDialog {...dialogProps} />

            {showCsvMapping && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Map CSV Columns</h2>
                            <button onClick={() => setShowCsvMapping(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                            Map your CSV columns to test catalog fields. Only <strong>Test Name</strong> is required. {csvRawData.length} rows detected.
                        </p>

                        <div className="overflow-x-auto mb-4">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CSV Column</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maps To</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample Values</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {csvHeaders.map(header => (
                                        <tr key={header}>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{header}</td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={csvMapping[header] || ''}
                                                    onChange={(e) => setCsvMapping(prev => ({ ...prev, [header]: e.target.value }))}
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                                >
                                                    <option value="">— Skip —</option>
                                                    {CSV_FIELDS.map(f => (
                                                        <option key={f.key} value={f.key}>
                                                            {f.label}{f.required ? ' *' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-[200px]">
                                                {csvPreview.map((row, i) => (
                                                    <span key={i} className="mr-2">{row[header]}{i < csvPreview.length - 1 ? ', ' : ''}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {csvPreview.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview (first {csvPreview.length} rows)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                            <tr>
                                                {csvHeaders.filter(h => csvMapping[h]).map(h => (
                                                    <th key={h} className="px-2 py-1 text-left font-medium text-gray-500">{csvMapping[h]}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {csvPreview.map((row, i) => (
                                                <tr key={i}>
                                                    {csvHeaders.filter(h => csvMapping[h]).map(h => (
                                                        <td key={h} className="px-2 py-1 text-gray-700 dark:text-gray-300">{row[h]}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCsvMapping(false)}>Cancel</Button>
                            <Button
                                onClick={handleConfirmCSVImport}
                                isLoading={actionLoading === 'import'}
                                disabled={!csvHeaders.some(h => csvMapping[h] === 'name')}
                            >
                                Import {csvRawData.length} Rows
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
