/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import { useDeferredValue, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Package, Search, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, X, Download, Upload, CheckCircle, XCircle, Image } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/export';
import { parseCSV } from '@/utils/csvParser';
import { uploadApi } from '@/lib/api';
import { useAdminMedicinesStore, type Medicine } from '@/stores/adminMedicinesStore';
import { adminApi, medicineApi } from '@/lib/api';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

const FORM_OPTIONS = [
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment',
    'Drops', 'Powder', 'Gel', 'Lotion', 'Inhaler', 'Patch', 'Other',
];

export default function AdminMedicinesPage() {
    const {
        medicines,
        pagination,
        loading,
        error,
        fetchMedicines,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addBulkMedicines,
        checkMedicineExists,
        clearError,
    } = useAdminMedicinesStore();

    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [imageFilter, setImageFilter] = useState<'all' | 'noimage'>('all');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [showAdd, setShowAdd] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const filteredMedicines = useMemo(() =>
        imageFilter === 'noimage' ? medicines.filter(m => !m.image_url) : medicines,
        [medicines, imageFilter]
    );

    const [uploadingImage, setUploadingImage] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    // Fetch categories from backend
    const [backendCategories, setBackendCategories] = useState<{id: string, name: string, display_name: string, icon: string}[]>([]);
    useEffect(() => {
        medicineApi.getCategories().then((res: any) => {
            const cats = res?.data?.data || res?.data || [];
            if (Array.isArray(cats) && cats.length > 0) {
                setBackendCategories(cats);
            }
        }).catch(() => {});
    }, []);

    // CSV Import state
    const [showCsvMapping, setShowCsvMapping] = useState(false);
    const [csvRawData, setCsvRawData] = useState<any[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
    const [csvPreview, setCsvPreview] = useState<any[]>([]);
    const [csvDryRunResult, setCsvDryRunResult] = useState<any>(null);

    // Sirf essential fields for bulk import — baaki (dosage_form, strength, image etc.)
    // admin add/edit form mein manually set karega per medicine
    const CSV_FIELDS = [
        { key: 'name', label: 'Medicine Name *', required: true },
        { key: 'generic_name', label: 'Generic Name' },
        { key: 'manufacturer', label: 'Manufacturer' },
        { key: 'category', label: 'Category (antibiotic/painkiller/etc)' },
        { key: 'dosage_form', label: 'Dosage Form (Tablet/Syrup/etc)' },
        { key: 'strength', label: 'Strength (500mg/10ml)' },
        { key: 'price', label: 'Price' },
        { key: 'mrp', label: 'MRP' },
        { key: 'requires_prescription', label: 'Requires Prescription (true/false)' },
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
        generic_name: '',
        manufacturer: '',
        category: '',
        subcategory: '',
        description: '',
        form: '',
        dosage_form: '',
        strength: '',
        pack_size: '',
        price: '',
        mrp: '',
        requires_prescription: false,
        image_url: '', // This will hold the signed URL for preview
        image_storage_url: '', // This will hold the raw storage URL for saving
    });

    useEffect(() => {
        void fetchMedicines(page, deferredSearchQuery);
    }, [deferredSearchQuery, fetchMedicines, page]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery]);

    const resetForm = () => {
        setForm({
            name: '', generic_name: '', manufacturer: '', category: '', subcategory: '',
            description: '', form: '', dosage_form: '', strength: '', pack_size: '',
            price: '', mrp: '', requires_prescription: false, image_url: '', image_storage_url: '',
        });
        setShowAdd(false);
        setShowAdvanced(false);
        setEditId(null);
    };

    const openEdit = (med: Medicine) => {
        setForm({
            name: med.name || '',
            generic_name: med.generic_name || '',
            manufacturer: med.manufacturer || '',
            category: med.category || '',
            subcategory: med.subcategory || '',
            description: med.description || '',
            form: med.form || '',
            dosage_form: med.dosage_form || '',
            strength: med.strength || '',
            pack_size: med.pack_size || '',
            price: String(med.price || ''),
            mrp: String(med.mrp || ''),
            requires_prescription: med.requires_prescription || false,
            image_url: med.image_url || '',
            image_storage_url: med.image_url || '', // API sends signed URL, but it gets stripped on save below
        });
        setEditId(med.id);
        setShowAdd(true);
        setShowAdvanced(true);
    };

    const handleImageUpload = async (file: File) => {
        setUploadingImage(true);
        try {
            const fields: Record<string, string> = {};
            if (editId) fields.medicineId = editId;
            const res = await uploadApi.uploadFile(file, 'medicine', fields);
            const data = res.data as any;
            if (res.success && (data?.storageUrl || data?.url)) {
                setForm(c => ({ 
                    ...c, 
                    image_url: data.url || data.resolvedUrl || data.storageUrl, // preview
                    image_storage_url: data.storageUrl // what gets saved to db
                }));
                toast.success('Image uploaded successfully');
            } else {
                toast.error('Upload failed', res.error || 'Could not upload image');
            }
        } catch {
            toast.error('Upload failed', 'Network error while uploading image');
        } finally {
            setUploadingImage(false);
        }
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleAdd = async () => {
        if (!form.name.trim()) {
            toast.error('Name required', 'Medicine name is required');
            return;
        }
        // Required identity fields so medicines aren't confused (legal correctness)
        if (!form.strength.trim()) {
            toast.error('Strength required', 'Please specify strength (e.g. 500mg, 10ml)');
            return;
        }
        if (!form.dosage_form && !form.form) {
            toast.error('Dosage form required', 'Please select a dosage form (Tablet, Syrup, etc.)');
            return;
        }
        if (!form.pack_size.trim()) {
            toast.error('Pack size required', 'Please specify pack size (e.g. 10 tablets)');
            return;
        }
        // Price discipline
        if (form.mrp && parseFloat(form.mrp) < parseFloat(form.price || '0')) {
            toast.error('Invalid pricing', 'MRP cannot be less than price');
            return;
        }

        // Duplicate check before insert
        const existing = await checkMedicineExists(form.name.trim(), form.manufacturer.trim() || undefined);
        if (existing.exists) {
            const go = await confirmAction({
                title: 'Medicine already exists',
                message: `"${existing.data?.generic_name || existing.data?.name}" from ${existing.data?.manufacturer || 'this manufacturer'} already exists in the catalog. Create a duplicate anyway?`,
                confirmLabel: 'Create anyway',
                variant: 'warning',
            });
            if (!go) return;
        }

        setActionLoading('add');
        const success = await addMedicine({
            name: form.name.trim(),
            generic_name: form.generic_name.trim() || undefined,
            manufacturer: form.manufacturer.trim() || undefined,
            category: form.category || undefined,
            subcategory: form.subcategory.trim() || undefined,
            description: form.description.trim() || undefined,
            form: form.form || undefined,
            dosage_form: form.dosage_form || undefined,
            strength: form.strength.trim() || undefined,
            pack_size: form.pack_size || undefined,
            price: form.price ? parseFloat(form.price) : 0,
            mrp: form.mrp ? parseFloat(form.mrp) : undefined,
            requires_prescription: form.requires_prescription,
            image_url: form.image_storage_url ? form.image_storage_url.trim().split('?')[0] : (form.image_url.trim().split('?')[0] || undefined),
        });
        setActionLoading(null);
        if (success) {
            toast.success('Medicine Added', `"${form.name}" has been added to the global catalog.`);
            resetForm();
        }
    };

    const handleUpdate = async () => {
        if (!editId || !form.name.trim()) return;
        setActionLoading('edit');
        const success = await updateMedicine(editId, {
            name: form.name.trim(),
            generic_name: form.generic_name.trim() || null,
            manufacturer: form.manufacturer.trim() || null,
            category: form.category || null,
            subcategory: form.subcategory.trim() || null,
            description: form.description.trim() || null,
            form: form.form || null,
            dosage_form: form.dosage_form || null,
            strength: form.strength.trim() || null,
            pack_size: form.pack_size || null,
            price: form.price ? parseFloat(form.price) : 0,
            mrp: form.mrp ? parseFloat(form.mrp) : 0,
            requires_prescription: form.requires_prescription,
            image_url: form.image_storage_url ? form.image_storage_url.trim().split('?')[0] : (form.image_url.trim().split('?')[0] || null),
        });
        setActionLoading(null);
        if (success) {
            toast.success('Medicine Updated', `"${form.name}" has been updated.`);
            resetForm();
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Deactivate Medicine',
            message: `Are you sure you want to deactivate "${name}" from the global catalog? It will no longer appear in patient searches.`,
            confirmLabel: 'Deactivate',
            variant: 'danger',
        });
        if (!confirmed) return;

        setActionLoading(id);
        const success = await deleteMedicine(id);
        setActionLoading(null);
        if (success) {
            toast.success('Medicine Deactivated', `"${name}" has been removed from active catalog.`);
        }
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

    const buildMappedData = () => {
        return csvRawData.map(row => {
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
    };

    const handleDryRunCSV = async () => {
        const mappedData = buildMappedData();
        if (!mappedData.some(item => item.name)) {
            toast.error('Missing Mapping', 'Please map at least the Medicine Name field');
            return;
        }
        setActionLoading('dryrun');
        try {
            const result = await adminApi.dryRunBulkMedicines(mappedData);
            setCsvDryRunResult(result);
            if (result.success && result.dryRun) {
                toast.info(
                    'Dry run complete',
                    `${result.wouldImport} would be imported, ${result.wouldDuplicate} would be skipped as duplicates.`
                );
            } else {
                toast.error('Dry run failed', result.message || 'Could not preview import');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleConfirmCSVImport = async () => {
        const mappedData = buildMappedData();

        if (!mappedData.some(item => item.name)) {
            toast.error('Missing Mapping', 'Please map at least the Medicine Name field');
            return;
        }

        setActionLoading('import');
        const success = await addBulkMedicines(mappedData);
        if (success) {
            toast.success('Import Successful', `Successfully imported ${mappedData.length} medicines into the global catalog.`);
        }
        setActionLoading(null);
        setShowCsvMapping(false);
    };

    if (loading && medicines.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (error && medicines.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button
                    onClick={() => { clearError(); void fetchMedicines(1); }}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Global Medicine Catalog</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Manage the master list of medicines available across the platform.
                        <span className="ml-2 text-sm font-medium text-blue-600">{pagination.total} total medicines</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                            { key: 'generic_name', label: 'generic_name' },
                            { key: 'manufacturer', label: 'manufacturer' },
                            { key: 'category', label: 'category' },
                            { key: 'price', label: 'price' },
                            { key: 'mrp', label: 'mrp' },
                            { key: 'requires_prescription', label: 'requires_prescription' },
                        ], 'global_medicines_template')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Template
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={actionLoading === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        disabled={actionLoading === 'import'}
                    >
                        {actionLoading === 'import' ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV(medicines, [
                            { key: 'name', label: 'Name' },
                            { key: 'generic_name', label: 'Generic Name' },
                            { key: 'manufacturer', label: 'Manufacturer' },
                            { key: 'category', label: 'Category' },
                            { key: 'price', label: 'Price' },
                            { key: 'requires_prescription', label: 'Rx Required' },
                            { key: 'is_active', label: 'Active' },
                        ], 'medicines_export')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Export
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAdd(true); }} leftIcon={<Plus className="h-4 w-4" />}>
                        Add Medicine
                    </Button>
                </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {/* Add/Edit Modal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editId ? 'Edit Medicine' : 'Add Medicine to Catalog'}</h2>
                            <button onClick={resetForm}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-4">
                            {/* Required fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Medicine Name *" value={form.name} onChange={(e) => setForm(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Paracetamol 500mg" />
                                <Input label="Generic Name" value={form.generic_name} onChange={(e) => setForm(c => ({ ...c, generic_name: e.target.value }))} placeholder="e.g. Paracetamol" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm(c => ({ ...c, manufacturer: e.target.value }))} placeholder="e.g. Cipla" />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm(c => ({ ...c, category: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    >
                                        <option value="">Select category</option>
                                        {backendCategories.length > 0
                                            ? backendCategories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.display_name}</option>
                                            ))
                                            : ['general', 'antibiotic', 'painkiller', 'vitamin', 'cardiac', 'diabetes', 'skin', 'respiratory', 'digestive', 'ayurvedic'].map(cat => (
                                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm(c => ({ ...c, price: e.target.value }))} placeholder="e.g. 50" />
                                <Input label="MRP (₹)" type="number" value={form.mrp} onChange={(e) => setForm(c => ({ ...c, mrp: e.target.value }))} placeholder="e.g. 65" />
                            </div>

                            {/* Advanced toggle */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500"
                                >
                                    {showAdvanced ? '− Hide Optional Details' : '+ Show Optional Details (Form, Strength, Description...)'}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dosage Form</label>
                                            <select
                                                value={form.dosage_form}
                                                onChange={(e) => setForm(c => ({ ...c, dosage_form: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                            >
                                                <option value="">Select form</option>
                                                {FORM_OPTIONS.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                         </div>
                                        <Input label="Strength" value={form.strength} onChange={(e) => setForm(c => ({ ...c, strength: e.target.value }))} placeholder="e.g. 500mg" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Form (Tablet/Capsule/etc)</label>
                                            <select
                                                value={form.form}
                                                onChange={(e) => setForm(c => ({ ...c, form: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                            >
                                                <option value="">Select form</option>
                                                {FORM_OPTIONS.map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <Input label="Pack Size" value={form.pack_size} onChange={(e) => setForm(c => ({ ...c, pack_size: e.target.value }))} placeholder="e.g. 10 tablets" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Subcategory" value={form.subcategory} onChange={(e) => setForm(c => ({ ...c, subcategory: e.target.value }))} placeholder="e.g. Antipyretic" />
                                        <Input label="Description" value={form.description} onChange={(e) => setForm(c => ({ ...c, description: e.target.value }))} placeholder="Brief description of the medicine" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Medicine Image</label>
                                        <div className="flex items-center gap-3">
                                            {form.image_url ? (
                                                <div className="relative group">
                                                    <img src={form.image_url} alt="Preview" className="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-gray-700" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm(c => ({ ...c, image_url: '', image_storage_url: '' }))}
                                                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                                                    <Image className="h-6 w-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    type="file"
                                                    ref={imageInputRef}
                                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); }}
                                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                                    className="hidden"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    isLoading={uploadingImage}
                                                    leftIcon={!uploadingImage ? <Upload className="h-4 w-4" /> : undefined}
                                                >
                                                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                                </Button>
                                                <span className="text-xs text-gray-400">JPEG, PNG, GIF, WebP</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="requiresPrescription"
                                            checked={form.requires_prescription}
                                            onChange={(e) => setForm(c => ({ ...c, requires_prescription: e.target.checked }))}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="requiresPrescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Requires Prescription for Purchase
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button onClick={editId ? handleUpdate : handleAdd} isLoading={actionLoading === 'add' || actionLoading === 'edit'} disabled={!form.name.trim()}>
                                {editId ? 'Update' : 'Add Medicine'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Search + Filters */}
            <div className="flex items-center gap-4">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {([
                        { key: 'all', label: `All (${medicines.length})` },
                        { key: 'noimage', label: `Missing Images (${medicines.filter(m => !m.image_url).length})` },
                    ] as const).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setImageFilter(t.key as 'all' | 'noimage')}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                imageFilter === t.key
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {t.key === 'noimage' && (
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
                            )}
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <Input
                        placeholder="Search by name, generic name, or manufacturer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                </div>
                {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            </div>

            {/* Table */}
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Medicine</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Image</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 sm:table-cell">Category</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 md:table-cell">Form</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 lg:table-cell">Rx</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 lg:table-cell">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredMedicines.length === 0 ? (
                                <tr><td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    {imageFilter === 'noimage' ? 'All medicines have images! 🎉' : 'No medicines found in the catalog.'}
                                </td></tr>
                            ) : filteredMedicines.map((med) => (
                                <tr key={med.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{med.name}</span>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    {med.generic_name && <span>{med.generic_name}</span>}
                                                    {med.manufacturer && (
                                                        <>
                                                            {med.generic_name && <span>•</span>}
                                                            <span>{med.manufacturer}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {med.image_url ? (
                                            <img src={med.image_url} alt={med.name} className="h-10 w-10 rounded object-cover border border-gray-200 dark:border-gray-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class=\"text-xs text-red-500\">Broken</span>'; }} />
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                                <XCircle className="h-3 w-3" /> No Image
                                            </span>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                                        {med.category ? (
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                {med.category}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                                        {med.dosage_form || med.form || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {med.price ? `₹${med.price}` : '—'}
                                        {med.mrp && med.mrp > (med.price || 0) && (
                                            <span className="ml-1 text-xs text-gray-400 line-through">₹{med.mrp}</span>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 lg:table-cell">
                                        {med.requires_prescription ? (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Rx</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">OTC</span>
                                        )}
                                    </td>
                                    <td className="hidden px-4 py-3 lg:table-cell">
                                        {med.is_active !== false ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle className="h-3 w-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                <XCircle className="h-3 w-3" /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(med)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => void handleDelete(med.id, med.name)} disabled={actionLoading === med.id} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                                                {actionLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

            {showCsvMapping && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Map CSV Columns</h2>
                            <button onClick={() => setShowCsvMapping(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                            Map your CSV columns to medicine catalog fields. Only <strong>Medicine Name</strong> is required. {csvRawData.length} rows detected.
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

                         {csvDryRunResult && (
                            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-gray-700 p-3">
                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Dry Run Results</h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">{csvDryRunResult.wouldImport || 0}</span> would be imported,
                                    {' '}<span className="font-medium">{csvDryRunResult.wouldDuplicate || 0}</span> would be skipped as duplicates.
                                </p>
                                {(csvDryRunResult.duplicates?.length) > 0 && (
                                    <ul className="mt-1 list-disc list-inside text-xs text-gray-600 dark:text-gray-400">
                                        {csvDryRunResult.duplicates.map((d: string) => (
                                            <li key={d}>{d}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                         )}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCsvMapping(false)}>Cancel</Button>
                            <Button
                                variant="outline"
                                onClick={handleDryRunCSV}
                                isLoading={actionLoading === 'dryrun'}
                                disabled={!csvHeaders.some(h => csvMapping[h] === 'name')}
                                leftIcon={<Upload className="h-4 w-4" />}
                            >
                                Dry Run (Preview)
                            </Button>
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
