'use client';

import React, { useDeferredValue, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
    Package, Search, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, 
    X, Download, Upload, ChevronRight, FileSpreadsheet, AlertTriangle, Clock, Activity, Layers, Tag, ArrowUpDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/export';
import { parseCSV } from '@/utils/csvParser';
import { MasterCatalogSearch } from '@/components/pharmacy/MasterCatalogSearch';
import { pharmacyApi } from '@/lib/api';

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default function PharmacyInventoryPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const searchQuery = searchParams.get('search') || '';
    const tab = (searchParams.get('filter') || 'all') as 'all' | 'low' | 'out' | 'expiring' | 'expired';
    const sortField = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const {
        inventory,
        inventoryPagination,
        loadingInventory,
        error,
        fetchInventory,
        addInventoryItem,
        addBulkInventoryItems,
        updateInventoryItem,
        deleteInventoryItem,
        clearError,
    } = usePharmacyStore();
    
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const deferredSearchQuery = useDeferredValue(localSearch.trim());
    
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    const [form, setForm] = useState({
        name: '', genericName: '', category: 'Tablet', quantity: '', packSize: '1', unitType: 'unit', 
        price: '', mrp: '', batchNumber: '', manufacturer: '', expiryDate: '', minQuantity: '10', 
        requiresPrescription: false, medicine_id: '', barcode: ''
    });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showCsvMapping, setShowCsvMapping] = useState(false);
    const [csvRawData, setCsvRawData] = useState<any[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});

    const CSV_FIELDS = [
        { key: 'name', label: 'Medicine Name *', required: true },
        { key: 'generic_name', label: 'Generic Name' },
        { key: 'quantity', label: 'Total Quantity' },
        { key: 'price', label: 'Selling Price' },
        { key: 'mrp', label: 'MRP' },
        { key: 'batch_number', label: 'Batch Number' },
        { key: 'expiry_date', label: 'Expiry Date' },
        { key: 'reorder_level', label: 'Minimum Stock' },
        { key: 'barcode', label: 'Barcode' },
    ];

    const guessMapping = useCallback((headers: string[]): Record<string, string> => {
        const mapping: Record<string, string> = {};
        const headerLower = headers.map(h => h.toLowerCase().trim());
        CSV_FIELDS.forEach(field => {
            const fieldLower = field.key.toLowerCase();
            const idx = headerLower.findIndex(h =>
                h === fieldLower ||
                h === field.key.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase() ||
                h.replace(/[\s_-]/g, '') === fieldLower.replace(/[\s_-]/g, '')
            );
            if (idx !== -1) mapping[headers[idx]] = field.key;
        });
        return mapping;
    }, []);

    const updateUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        let changed = false;
        for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === undefined) {
                if (params.has(key)) { params.delete(key); changed = true; }
            } else {
                if (params.get(key) !== value) { params.set(key, value); changed = true; }
            }
        }
        if (changed) router.push(`${pathname}?${params.toString()}`);
    }, [pathname, searchParams, router]);

    useEffect(() => {
        if (deferredSearchQuery !== searchQuery) {
            updateUrl({ search: deferredSearchQuery || null, page: '1' });
        }
    }, [deferredSearchQuery, searchQuery, updateUrl]);

    useEffect(() => {
        void fetchInventory({
            page,
            limit,
            search: searchQuery || undefined,
            lowStock: tab === 'low' ? true : undefined,
            sortBy: sortField,
            sortOrder: sortOrder as 'asc' | 'desc',
        });
    }, [page, limit, searchQuery, tab, sortField, sortOrder, fetchInventory, refreshKey]);

    const displayInventory = useMemo(() => {
        if (tab === 'all' || tab === 'low') return inventory;
        const now = Date.now();
        return inventory.filter((item: any) => {
            const avail = (item.quantity || 0) - (item.reserved_quantity || item.reserved || 0);
            let isExpired = false;
            let isExpiringSoon = false;
            if (item.expiry_date || item.expiryDate) {
                const exp = new Date(item.expiry_date || item.expiryDate).getTime();
                if (exp < now) isExpired = true;
                else if (exp - now <= THIRTY_DAYS) isExpiringSoon = true;
            }
            if (tab === 'expired') return isExpired;
            if (isExpired) return false;
            if (tab === 'out') return avail <= 0;
            if (tab === 'expiring') return isExpiringSoon;
            return true;
        });
    }, [inventory, tab]);

    const groupedInventory = useMemo(() => {
        const groups: Record<string, {
            identityKey: string;
            medicine_id: string;
            name: string;
            generic_name: string;
            manufacturer: string;
            pack_size: string;
            barcode: string;
            batches: any[];
            total_quantity: number;
            total_reserved: number;
            total_available: number;
            medicine?: any;
        }> = {};

        displayInventory.forEach((item: any) => {
            const mName = item.medicine?.name || (item.medicine_id ? 'Not available' : item.name);
            const mGen = item.medicine?.generic_name || (item.medicine_id ? 'Not available' : (item.generic_name || item.genericName));
            const mMan = item.medicine?.manufacturer || (item.medicine_id ? 'Not available' : item.manufacturer);
            const mPack = item.medicine?.pack_size || item.pack_size || item.packSize;
            
            const key = item.medicine_id || `${mName}|${mGen || ''}|${mMan || ''}|${mPack || ''}`;
            if (!groups[key]) {
                groups[key] = {
                    identityKey: key,
                    medicine_id: item.medicine_id,
                    name: mName,
                    generic_name: mGen,
                    manufacturer: mMan,
                    pack_size: mPack,
                    barcode: item.barcode,
                    batches: [],
                    total_quantity: 0,
                    total_reserved: 0,
                    total_available: 0,
                    medicine: item.medicine,
                };
            }
            groups[key].batches.push(item);
            
            const qty = item.quantity || 0;
            const resQty = item.reserved_quantity || item.reserved || 0;
            const avail = qty - resQty;
            
            groups[key].total_quantity += qty;
            groups[key].total_reserved += resQty;
            groups[key].total_available += avail;
        });

        return Object.values(groups);
    }, [displayInventory]);

    const kpis = useMemo(() => {
        let tLow = 0;
        let tOut = 0;
        let tExpiring = 0;
        let tReserved = 0;
        const now = Date.now();

        inventory.forEach((item: any) => {
            const qty = item.quantity || 0;
            const resQty = item.reserved_quantity || item.reserved || 0;
            const avail = qty - resQty;
            const min = item.minimum_stock || item.reorder_level || item.minQuantity || 10;
            tReserved += resQty;
            let isExpired = false;
            let isExpiringSoon = false;
            if (item.expiry_date || item.expiryDate) {
                const exp = new Date(item.expiry_date || item.expiryDate).getTime();
                if (exp < now) isExpired = true;
                else if (exp - now <= THIRTY_DAYS) isExpiringSoon = true;
            }
            if (!isExpired) {
                if (avail <= 0) tOut++;
                else if (avail <= min) tLow++;
                else if (isExpiringSoon) tExpiring++;
            }
        });

        return {
            totalMedicines: inventoryPagination.total || 0,
            lowStock: tLow,
            outOfStock: tOut,
            expiringSoon: tExpiring,
            reservedUnits: tReserved,
        };
    }, [inventory, inventoryPagination.total]);
    const kpisLoading = loadingInventory;

    const resetForm = () => {
        setForm({ 
            name: '', genericName: '', category: 'Tablet', quantity: '', packSize: '1', unitType: 'unit', 
            price: '', mrp: '', batchNumber: '', manufacturer: '', expiryDate: '', minQuantity: '10', 
            requiresPrescription: false, medicine_id: '', barcode: ''
        });
        setShowAdd(false);
        setEditItem(null);
    };

    const handleSave = async () => {
        if (!form.name) return;
        setActionLoading('save');
        
        const payload = {
            name: form.name,
            generic_name: form.genericName,
            medicine_id: form.medicine_id || undefined,
            category: form.category,
            quantity: parseInt(form.quantity, 10) || 0,
            pack_size: parseInt(form.packSize, 10) || 1,
            unit_type: form.unitType || 'unit',
            price: parseFloat(form.price) || 0,
            mrp: parseFloat(form.mrp) || parseFloat(form.price) || 0,
            batch_number: form.batchNumber,
            manufacturer: form.manufacturer,
            expiry_date: form.expiryDate || undefined,
            reorder_level: parseInt(form.minQuantity, 10) || 10,
            requires_prescription: form.requiresPrescription,
            barcode: form.barcode
        };

        const success = editItem 
            ? await updateInventoryItem(editItem.id, payload)
            : await addInventoryItem(payload);

        if (success) {
            resetForm();
            toast.success(editItem ? 'Item Updated' : 'Item Added', `Inventory item saved successfully`);
            setRefreshKey(k => k + 1);
            if (selectedItem && editItem && selectedItem.id === editItem.id) {
                setSelectedItem(null);
            }
        } else {
            toast.error('Save Failed', 'Unable to save medicine. Please try again.');
        }
        setActionLoading(null);
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Delete Item',
            message: `Delete ${name} from inventory?`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;

        setActionLoading(id);
        const success = await deleteInventoryItem(id);
        if (success) {
            toast.success('Item Deleted', 'Item has been removed');
            setRefreshKey(k => k + 1);
            setSelectedItem(null);
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
            setCsvMapping(guessMapping(headers));
            setShowCsvMapping(true);

            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleConfirmCSVImport = async () => {
        const mappedData = csvRawData.map(row => {
            const mapped: any = {};
            for (const [header, field] of Object.entries(csvMapping)) {
                mapped[field] = row[header];
            }
            return mapped;
        });

        if (!mappedData.some(item => item.name || item.medicine_id)) {
            toast.error('Missing Mapping', 'Please map at least the Medicine Name or ID field');
            return;
        }

        setActionLoading('import');
        const response = await addBulkInventoryItems(mappedData);
        if (response.success) {
            const imported = response.data?.imported || 0;
            const unmatched = response.data?.unmatchedRows?.length || 0;
            
            if (unmatched > 0) {
                toast.warning('Import Partially Completed', `Successfully imported ${imported} items. ${unmatched} rows could not be matched to the Vaididea Master Catalog.`);
            } else {
                toast.success('Import Successful', `Successfully imported ${imported} items.`);
            }
            setRefreshKey(k => k + 1);
        } else {
            toast.error('Import Failed', response.message);
        }
        setActionLoading(null);
        setShowCsvMapping(false);
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setForm({
            name: item.name || '',
            genericName: item.genericName || item.generic_name || '',
            category: item.category || 'Tablet',
            quantity: String(item.quantity ?? 0),
            packSize: String((item.packSize || item.pack_size) ?? 1),
            unitType: item.unitType || item.unit_type || 'unit',
            price: String(item.price ?? ''),
            mrp: String(item.mrp ?? item.price ?? ''),
            batchNumber: item.batchNumber || item.batch_number || '',
            manufacturer: item.manufacturer || '',
            expiryDate: item.expiryDate || item.expiry_date ? new Date(item.expiryDate || item.expiry_date).toISOString().split('T')[0] : '',
            minQuantity: String(item.minQuantity || item.reorder_level || item.minimum_stock || 10),
            requiresPrescription: item.requiresPrescription || item.requires_prescription || false,
            medicine_id: item.medicine_id || '',
            barcode: item.barcode || ''
        });
        setShowAdd(true);
    };

    const getStatus = (item: any) => {
        const now = Date.now();
        const qty = item.quantity || 0;
        const resQty = item.reserved_quantity || item.reserved || 0;
        const avail = qty - resQty;
        const min = item.minimum_stock || item.reorder_level || item.minQuantity || 10;
        
        let isExpired = false;
        let isExpiringSoon = false;

        if (item.expiry_date || item.expiryDate) {
            const exp = new Date(item.expiry_date || item.expiryDate).getTime();
            if (exp < now) isExpired = true;
            else if (exp - now <= THIRTY_DAYS) isExpiringSoon = true;
        }

        if (isExpired) return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' };
        if (avail <= 0) return { label: 'Out of Stock', color: 'bg-red-50 text-red-700 border-red-200' };
        if (avail <= min) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        if (isExpiringSoon) return { label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        return { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200' };
    };


    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage medicines, batches, stock levels and availability.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} leftIcon={actionLoading === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} disabled={actionLoading === 'import'}>
                        {actionLoading === 'import' ? 'Importing...' : 'Import Medicines'}
                    </Button>
                    <Button variant="outline" onClick={() => downloadCSV(inventory, CSV_FIELDS.map(f => ({ key: f.key, label: f.label })), 'inventory')} leftIcon={<Download className="h-4 w-4" />}>
                        Export CSV
                    </Button>
                    <Button variant="outline" onClick={() => downloadCSV([], CSV_FIELDS.map(f => ({ key: f.key, label: f.label })), 'inventory_template')} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
                        Template
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-orange-600 hover:bg-orange-700 text-white" leftIcon={<Plus className="h-4 w-4" />}>
                        Add Medicine
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card padding="md" className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">Total Medicines</span>
                    <span className="text-2xl font-bold mt-1">
                        {kpisLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : kpis.totalMedicines}
                    </span>
                </Card>
                <Card padding="md" className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">Low Stock <span className="text-xs text-gray-400 font-normal">(Page)</span></span>
                    <span className="text-2xl font-bold text-orange-600 mt-1">
                        {kpisLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : kpis.lowStock}
                    </span>
                </Card>
                <Card padding="md" className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">Out of Stock <span className="text-xs text-gray-400 font-normal">(Page)</span></span>
                    <span className="text-2xl font-bold text-red-600 mt-1">
                        {kpisLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : kpis.outOfStock}
                    </span>
                </Card>
                <Card padding="md" className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">Expiring Soon <span className="text-xs text-gray-400 font-normal">(Page)</span></span>
                    <span className="text-2xl font-bold text-yellow-600 mt-1">
                        {kpisLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : kpis.expiringSoon}
                    </span>
                </Card>
                <Card padding="md" className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium">Reserved Units <span className="text-xs text-gray-400 font-normal">(Page)</span></span>
                    <span className="text-2xl font-bold text-blue-600 mt-1">
                        {kpisLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : kpis.reservedUnits}
                    </span>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex overflow-x-auto pb-1 hide-scrollbar">
                    {(['all', 'low', 'out', 'expiring', 'expired'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => updateUrl({ filter: t, page: '1' })}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                tab === t 
                                ? 'border-orange-600 text-orange-600 dark:border-orange-500 dark:text-orange-400' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {t === 'all' && 'All'}
                            {t === 'low' && 'Low Stock'}
                            {t === 'out' && 'Out of Stock'}
                            {t === 'expiring' && 'Expiring Soon'}
                            {t === 'expired' && 'Expired'}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-96 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Search medicine, generic name or barcode..."
                        className="pl-9 w-full"
                    />
                </div>
            </div>

            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 flex flex-col items-center justify-center text-center gap-2">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <h3 className="text-red-800 font-medium text-lg">Unable to load inventory.</h3>
                    <Button variant="outline" onClick={() => { clearError(); void fetchInventory({ page: 1, limit }); }} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Retry
                    </Button>
                </div>
            ) : null}

            {loadingInventory && displayInventory.length === 0 && !error ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 h-16 rounded-xl w-full" />
                    ))}
                </div>
            ) : null}

            {!loadingInventory && !error && displayInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <Package className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No medicines in inventory yet.</h3>
                    <p className="text-gray-500 mt-1">Add your first medicine or import via CSV to get started.</p>
                </div>
            ) : null}

            {!loadingInventory && displayInventory.length > 0 ? (
                <>
                    <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Medicine</th>
                                    <th className="px-4 py-3 font-medium">Generic / Mfg</th>
                                    <th className="px-4 py-3 font-medium">Batch / Expiry</th>
                                    <th className="px-4 py-3 font-medium">Available</th>
                                    <th className="px-4 py-3 font-medium">Reserved</th>
                                    <th className="px-4 py-3 font-medium">Total Stock</th>
                                    <th className="px-4 py-3 font-medium">Min Stock</th>
                                    <th className="px-4 py-3 font-medium">MRP / Selling</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {groupedInventory.map((group) => {
                                    const isExpanded = expandedGroups[group.identityKey];
                                    
                                    // Determine overall status (prioritize expired -> out of stock -> low stock)
                                    let groupStatus = { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200' };
                                    const statusLevels = { 'Expired': 0, 'Out of Stock': 1, 'Low Stock': 2, 'Expiring Soon': 3, 'In Stock': 4 };
                                    let minLevel = 4;
                                    group.batches.forEach(b => {
                                        const s = getStatus(b);
                                        const level = statusLevels[s.label as keyof typeof statusLevels] ?? 4;
                                        if (level < minLevel) { minLevel = level; groupStatus = s; }
                                    });

                                    return (
                                        <React.Fragment key={group.identityKey}>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors" onClick={() => toggleGroup(group.identityKey)}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</div>
                                                            {group.barcode && <div className="text-xs text-gray-500 font-mono mt-0.5">#{group.barcode}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-gray-700 dark:text-gray-300">{group.medicine?.generic_name ?? group.generic_name ?? 'Not available'}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{group.medicine?.manufacturer ?? group.manufacturer ?? 'Not available'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-500">{group.batches.length} Batch{group.batches.length !== 1 ? 'es' : ''}</div>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100 text-base">{group.total_available}</td>
                                                <td className="px-4 py-3 text-blue-600 font-medium">{group.total_reserved}</td>
                                                <td className="px-4 py-3 text-gray-500 font-medium">{group.total_quantity}</td>
                                                <td className="px-4 py-3 text-gray-500">-</td>
                                                <td className="px-4 py-3 text-gray-500">-</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${groupStatus.color}`}>
                                                        {groupStatus.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); resetForm(); setForm(c => ({...c, name: group.name, genericName: group.generic_name || '', manufacturer: group.manufacturer || '', packSize: group.pack_size || '', medicine_id: group.medicine_id || ''})); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1"/> Batch</Button>
                                                </td>
                                            </tr>
                                            {isExpanded && group.batches.map((item: any) => {
                                                const qty = item.quantity || 0;
                                                const resQty = item.reserved_quantity || item.reserved || 0;
                                                const avail = qty - resQty;
                                                const status = getStatus(item);
                                                return (
                                                    <tr key={item.id} className="bg-orange-50/30 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer" onClick={() => setSelectedItem(item)}>
                                                        <td className="px-4 py-2 pl-12 border-l-2 border-orange-400">
                                                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch {item.batch_number || item.batchNumber || 'N/A'}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-xs text-gray-500">{item.pack_size || item.packSize ? `Pack: ${item.pack_size || item.packSize}` : '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm text-gray-700 dark:text-gray-300">EXP: {item.expiry_date || item.expiryDate ? new Date(item.expiry_date || item.expiryDate).toLocaleDateString() : 'None'}</div>
                                                        </td>
                                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{avail}</td>
                                                        <td className="px-4 py-2 text-blue-600">{resQty}</td>
                                                        <td className="px-4 py-2 text-gray-500">{qty}</td>
                                                        <td className="px-4 py-2 text-gray-500">{item.reorder_level || item.minimum_stock || item.minQuantity || 10}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-gray-500 line-through text-xs">₹{item.mrp || item.price}</div>
                                                            <div className="font-medium text-gray-900 dark:text-gray-100">₹{item.price}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Edit2 className="h-4 w-4 text-gray-500" /></Button>
                                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id, item.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-4">
                        {groupedInventory.map((group) => {
                            const isExpanded = expandedGroups[group.identityKey];
                            
                            let groupStatus = { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200' };
                            const statusLevels = { 'Expired': 0, 'Out of Stock': 1, 'Low Stock': 2, 'Expiring Soon': 3, 'In Stock': 4 };
                            let minLevel = 4;
                            group.batches.forEach(b => {
                                const s = getStatus(b);
                                const level = statusLevels[s.label as keyof typeof statusLevels] ?? 4;
                                if (level < minLevel) { minLevel = level; groupStatus = s; }
                            });

                            return (
                                <Card key={group.identityKey} padding="md" className="transition-colors border-gray-200 dark:border-gray-800">
                                    <div className="cursor-pointer" onClick={() => toggleGroup(group.identityKey)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-2">
                                                <div className="mt-1">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h3>
                                                    <p className="text-xs text-gray-500">{group.generic_name || '-'}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{group.batches.length} Batch{group.batches.length !== 1 ? 'es' : ''}</p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${groupStatus.color}`}>
                                                {groupStatus.label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-center">
                                                <div className="text-xs text-gray-500">Avail</div>
                                                <div className="font-semibold text-gray-900 dark:text-gray-100">{group.total_available}</div>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center">
                                                <div className="text-xs text-blue-600/70">Rsrv</div>
                                                <div className="font-semibold text-blue-600">{group.total_reserved}</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-center">
                                                <div className="text-xs text-gray-500">Total</div>
                                                <div className="font-semibold text-gray-900 dark:text-gray-100">{group.total_quantity}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resetForm(); setForm(c => ({...c, name: group.name, genericName: group.generic_name || '', manufacturer: group.manufacturer || '', packSize: group.pack_size || '', medicine_id: group.medicine_id || ''})); setShowAdd(true); }} className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"><Plus className="h-4 w-4 mr-1"/> Add Batch</Button>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            {group.batches.map((item: any) => {
                                                const qty = item.quantity || 0;
                                                const resQty = item.reserved_quantity || item.reserved || 0;
                                                const avail = qty - resQty;
                                                const status = getStatus(item);
                                                return (
                                                    <div key={item.id} className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30" onClick={() => setSelectedItem(item)}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Batch {item.batch_number || 'N/A'}</div>
                                                                <div className="text-xs text-gray-500">EXP: {item.expiry_date || item.expiryDate ? new Date(item.expiry_date || item.expiryDate).toLocaleDateString() : '-'}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{item.price}</div>
                                                                <div className="text-xs text-gray-500 line-through">₹{item.mrp || item.price}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-3">
                                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{avail}</span> Avail
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Edit2 className="h-3 w-3 text-gray-500" /></Button>
                                                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name); }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </>
            ) : null}

            {inventoryPagination && inventoryPagination.totalPages > 1 && !loadingInventory && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={page}
                        totalPages={inventoryPagination.totalPages}
                        onPageChange={(p: number) => updateUrl({ page: String(p) })}
                    />
                </div>
            )}

            {selectedItem && !showAdd && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="w-full max-w-md bg-white dark:bg-[#111] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-lg font-semibold">Medicine Details</h2>
                            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div>
                                {selectedItem.medicine?.image_url && (
                                    <div className="mb-4 bg-gray-50 border border-gray-100 rounded-xl p-2 flex justify-center">
                                        <img src={selectedItem.medicine.image_url} alt={selectedItem.name} className="h-32 object-contain" />
                                    </div>
                                )}
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedItem.name}</h1>
                                {selectedItem.generic_name && <p className="text-gray-500 mt-1">{selectedItem.generic_name}</p>}
                                
                                {selectedItem.medicine && (
                                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                        {selectedItem.medicine.category && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{selectedItem.medicine.category}</span>}
                                        {selectedItem.medicine.dosage_form && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{selectedItem.medicine.dosage_form}</span>}
                                        {selectedItem.medicine.strength && <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">{selectedItem.medicine.strength}</span>}
                                        {selectedItem.medicine.pack_size && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md">Pack: {selectedItem.medicine.pack_size}</span>}
                                        {selectedItem.requires_prescription && <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md font-medium">Rx</span>}
                                    </div>
                                )}
                                
                                <div className="mt-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatus(selectedItem).color}`}>
                                        {getStatus(selectedItem).label}
                                    </span>
                                </div>
                                {selectedItem.medicine?.description && (
                                    <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedItem.medicine.description}</p>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-xs text-gray-500 mb-1">Available</div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{(selectedItem.quantity || 0) - (selectedItem.reserved_quantity || selectedItem.reserved || 0)}</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <div className="text-xs text-blue-600/70 mb-1">Reserved</div>
                                    <div className="text-xl font-bold text-blue-600">{selectedItem.reserved_quantity || selectedItem.reserved || 0}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-xs text-gray-500 mb-1">Total Stock</div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedItem.quantity || 0}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Minimum Stock</span>
                                    <span className="font-medium">{selectedItem.reorder_level || selectedItem.minimum_stock || selectedItem.minQuantity || 10}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Selling Price</span>
                                    <span className="font-bold text-green-600">₹{selectedItem.price}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">MRP</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">₹{selectedItem.mrp || selectedItem.price}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Batch Number</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.batch_number || selectedItem.batchNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Expiry Date</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.expiry_date || selectedItem.expiryDate ? new Date(selectedItem.expiry_date || selectedItem.expiryDate).toLocaleDateString() : '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Barcode</span>
                                    <span className="font-medium font-mono text-gray-900 dark:text-gray-100">{selectedItem.barcode || '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={() => openEdit(selectedItem)} leftIcon={<Edit2 className="h-4 w-4" />}>
                                Edit Medicine
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="w-full max-w-md bg-white dark:bg-[#111] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editItem ? 'Edit Medicine' : 'Add Medicine'}</h2>
                                {!editItem && <p className="text-xs text-gray-500 mt-0.5">Add a medicine to your pharmacy inventory.</p>}
                            </div>
                            <button onClick={resetForm} aria-label="Close form" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {!editItem && (
                                <MasterCatalogSearch
                                    onSelect={(med: any) => {
                                        setForm(current => ({
                                            ...current,
                                            name: med.name || current.name,
                                            genericName: med.generic_name || current.genericName,
                                            manufacturer: med.manufacturer || current.manufacturer,
                                            category: med.dosage_form || current.category,
                                            price: String(med.price ?? current.price),
                                            mrp: String(med.mrp ?? current.mrp),
                                            medicine_id: med.id || current.medicine_id,
                                            requiresPrescription: med.requires_prescription ?? current.requiresPrescription,
                                        }));
                                        toast.success('Auto-filled from catalog', `${med.name} fields populated`);
                                    }}
                                />
                            )}
                            
                            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {/* SECTION 1: MEDICINE INFORMATION */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="h-3 w-3 text-orange-600" /> Medicine Information</h3>
                                    <div className="space-y-4">
                                        <Input label="Medicine Name *" value={form.name} onChange={(e) => {}} disabled={true} placeholder="Select from catalog above" error={!form.medicine_id && !editItem ? "Please select a valid medicine from the Vaididea catalog." : undefined} />
                                        <Input label="Generic / Salt Name" value={form.genericName} onChange={(e) => {}} disabled={true} placeholder="Active ingredients" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Pack Size" value={form.packSize} onChange={(e) => setForm(c => ({ ...c, packSize: e.target.value }))} placeholder="e.g. 10 tablets" />
                                            <Input label="Manufacturer" value={form.manufacturer} onChange={(e) => {}} disabled={true} placeholder="Manufacturer name" />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100 dark:border-gray-800" />

                                {/* SECTION 2: IDENTIFICATION */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="h-3 w-3 text-orange-600" /> Identification</h3>
                                    <div>
                                        <Input label="Barcode" value={form.barcode} onChange={(e) => setForm(c => ({ ...c, barcode: e.target.value }))} placeholder="Scan or type barcode" />
                                        <p className="text-xs text-gray-500 mt-1">Used for quick POS and inventory search.</p>
                                    </div>
                                </div>

                                <hr className="border-gray-100 dark:border-gray-800" />

                                {/* SECTION 3: STOCK & BATCH */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Layers className="h-3 w-3 text-orange-600" /> Stock & Batch</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Input label="Batch Number" value={form.batchNumber} onChange={(e) => setForm(c => ({ ...c, batchNumber: e.target.value }))} placeholder="Batch code" />
                                        <div>
                                            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm(c => ({ ...c, expiryDate: e.target.value }))} />
                                            {form.expiryDate && new Date(form.expiryDate).getTime() < Date.now() && <p className="text-xs text-red-500 mt-1">Expired medicines should not be fulfilled or sold.</p>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Input label="Total Quantity *" type="number" min="0" value={form.quantity} onChange={(e) => setForm(c => ({ ...c, quantity: e.target.value }))} placeholder="e.g. 100" error={form.quantity !== '' && Number(form.quantity) < 0 ? "Quantity cannot be negative." : undefined} />
                                        </div>
                                        <div>
                                            <Input label="Minimum Stock" type="number" min="0" value={form.minQuantity} onChange={(e) => setForm(c => ({ ...c, minQuantity: e.target.value }))} placeholder="e.g. 10" error={form.minQuantity !== '' && Number(form.minQuantity) < 0 ? "Cannot be negative." : undefined} />
                                            <p className="text-xs text-gray-500 mt-1">Low-stock alerts trigger when available stock reaches this level.</p>
                                        </div>
                                    </div>
                                </div>

                                {editItem && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reserved Quantity</span>
                                        <span className="text-sm font-bold text-blue-600">{editItem.reserved_quantity || editItem.reserved || 0}</span>
                                    </div>
                                )}

                                <hr className="border-gray-100 dark:border-gray-800" />

                                {/* SECTION D: COMPLIANCE */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Tag className="h-3 w-3 text-orange-600" /> Compliance</h3>
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 opacity-70 pointer-events-none">
                                        <input type="checkbox" id="rx" checked={form.requiresPrescription} readOnly className="w-5 h-5 rounded border-gray-300 text-orange-600 bg-gray-100" />
                                        <label htmlFor="rx" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                            Prescription Required (Rx)
                                            <p className="text-xs text-gray-500 font-normal mt-0.5">This is strictly enforced by the Vaididea Master Catalog.</p>
                                        </label>
                                    </div>
                                </div>

                                <hr className="border-gray-100 dark:border-gray-800" />

                                {/* SECTION 4: PRICING */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Tag className="h-3 w-3 text-orange-600" /> Pricing</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="MRP (₹)" type="number" min="0" value={form.mrp} onChange={(e) => setForm(c => ({ ...c, mrp: e.target.value }))} placeholder="0.00" error={form.mrp !== '' && Number(form.mrp) < 0 ? "Cannot be negative." : undefined} />
                                        <Input label="Selling Price (₹)" type="number" min="0" value={form.price} onChange={(e) => setForm(c => ({ ...c, price: e.target.value }))} placeholder="0.00" error={form.price !== '' && Number(form.price) < 0 ? "Cannot be negative." : undefined} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 sticky bottom-0">
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={
                                    (!editItem && !form.medicine_id) || 
                                    actionLoading === 'save' || 
                                    (form.quantity !== '' && Number(form.quantity) < 0) || 
                                    (form.minQuantity !== '' && Number(form.minQuantity) < 0) ||
                                    (form.mrp !== '' && Number(form.mrp) < 0) ||
                                    (form.price !== '' && Number(form.price) < 0)
                                } 
                                className="bg-orange-600 hover:bg-orange-700 text-white" 
                                leftIcon={actionLoading === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            >
                                {actionLoading === 'save' ? 'Saving...' : 'Save Medicine'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showCsvMapping && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <Card padding="lg" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Map CSV Columns</h2>
                            <button onClick={() => setShowCsvMapping(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">Match your CSV columns to the inventory fields.</p>
                        
                        <div className="space-y-4">
                            {csvHeaders.map(header => (
                                <div key={header} className="flex items-center gap-4">
                                    <div className="w-1/3 font-medium text-sm truncate bg-gray-50 dark:bg-gray-800 p-2 rounded">{header}</div>
                                    <div className="w-8 flex justify-center"><ChevronRight className="h-4 w-4 text-gray-400" /></div>
                                    <select
                                        className="w-flex-1 p-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
                                        value={csvMapping[header] || ''}
                                        onChange={(e) => setCsvMapping(prev => ({ ...prev, [header]: e.target.value }))}
                                    >
                                        <option value="">-- Ignore Column --</option>
                                        {CSV_FIELDS.map(field => (
                                            <option key={field.key} value={field.key}>
                                                {field.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowCsvMapping(false)}>Cancel</Button>
                            <Button onClick={handleConfirmCSVImport} disabled={actionLoading === 'import'} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {actionLoading === 'import' ? 'Importing...' : 'Confirm Import'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {dialogProps && <ConfirmDialog {...dialogProps} />}
        </div>
    );
}
