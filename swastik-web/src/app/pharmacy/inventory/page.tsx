'use client';

import { useDeferredValue, useEffect, useState, useRef } from 'react';
import { Package, Search, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, X, Download, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/export';
import { parseCSV } from '@/utils/csvParser';

const PAGE_SIZE = 10;

export default function PharmacyInventoryPage() {
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
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [tab, setTab] = useState<'all' | 'low'>('all');
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        genericName: '',
        category: 'Tablet',
        quantity: '',
        packSize: '1',
        unitType: 'unit',
        price: '',
        mrp: '',
        batchNumber: '',
        manufacturer: '',
        expiryDate: '',
        minQuantity: '10',
        requiresPrescription: false,
    });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();
    const toast = useToast();

    useEffect(() => {
        void fetchInventory({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            lowStock: tab === 'low' ? true : undefined,
        });
    }, [deferredSearchQuery, fetchInventory, page, tab]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, tab]);

    const resetForm = () => {
        setForm({ 
            name: '', genericName: '', category: 'Tablet', quantity: '', packSize: '1', unitType: 'unit', 
            price: '', mrp: '', batchNumber: '', manufacturer: '', expiryDate: '', minQuantity: '10', 
            requiresPrescription: false 
        });
        setShowAdd(false);
        setEditId(null);
    };

    const handleAdd = async () => {
        if (!form.name) return;
        setActionLoading('add');
        const success = await addInventoryItem({
            name: form.name,
            generic_name: form.genericName,
            category: form.category,
            quantity: parseInt(form.quantity, 10) || 0,
            pack_size: parseInt(form.packSize, 10) || 1,
            unit_type: form.unitType || 'unit',
            price: parseFloat(form.price) || 0,
            mrp: parseFloat(form.mrp) || parseFloat(form.price) || 0,
            batch_number: form.batchNumber,
            manufacturer: form.manufacturer,
            expiryDate: form.expiryDate || undefined,
            minQuantity: parseInt(form.minQuantity, 10) || 10,
            requiresPrescription: form.requiresPrescription,
        });
        if (success) {
            resetForm();
            toast.success('Item Added', 'Inventory item added successfully');
        }
        setActionLoading(null);
    };

    const handleUpdate = async () => {
        if (!editId) return;
        setActionLoading('edit');
        const success = await updateInventoryItem(editId, {
            name: form.name,
            generic_name: form.genericName,
            category: form.category,
            quantity: parseInt(form.quantity, 10) || 0,
            pack_size: parseInt(form.packSize, 10) || 1,
            unit_type: form.unitType || 'unit',
            price: parseFloat(form.price) || 0,
            mrp: parseFloat(form.mrp) || parseFloat(form.price) || 0,
            batch_number: form.batchNumber,
            manufacturer: form.manufacturer,
            expiryDate: form.expiryDate || undefined,
            minQuantity: parseInt(form.minQuantity, 10) || 10,
            requiresPrescription: form.requiresPrescription,
        });
        if (success) {
            resetForm();
            toast.success('Item Updated', 'Inventory item updated');
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

            // Optional: validate headers or map them strictly if needed
            // For now, we trust the CSV has matching headers: name, quantity, price, etc.
            setActionLoading('import');
            const success = await addBulkInventoryItems(parsedData);
            if (success) {
                toast.success('Import Successful', `Successfully imported ${parsedData.length} items`);
            }
            setActionLoading(null);
            
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const openEdit = (item: any) => {
        setEditId(item.id);
        setForm({
            name: item.name || '',
            genericName: item.genericName || '',
            category: item.category || 'Tablet',
            quantity: String(item.quantity ?? 0),
            packSize: String(item.packSize ?? 1),
            unitType: item.unitType || 'unit',
            price: String(item.price ?? ''),
            mrp: String(item.mrp ?? item.price ?? ''),
            batchNumber: item.batchNumber || '',
            manufacturer: item.manufacturer || '',
            expiryDate: item.expiryDate || '',
            minQuantity: String(item.minQuantity ?? 10),
            requiresPrescription: item.requiresPrescription ?? false,
        });
        setShowAdd(true);
    };

    if (loadingInventory && inventory.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>;
    }

    if (error && inventory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button
                    onClick={() => {
                        clearError();
                        void fetchInventory({ page: 1, limit: PAGE_SIZE, lowStock: tab === 'low' ? true : undefined });
                    }}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage medicine inventory with live stock thresholds</p>
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
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={actionLoading === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        disabled={actionLoading === 'import'}
                    >
                        {actionLoading === 'import' ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV(inventory, [
                            { key: 'name', label: 'Medicine' },
                            { key: 'genericName', label: 'Generic Name' },
                            { key: 'category', label: 'Category' },
                            { key: 'quantity', label: 'Quantity' },
                            { key: 'packSize', label: 'Pack Size' },
                            { key: 'unitType', label: 'Unit Type' },
                            { key: 'minQuantity', label: 'Minimum Stock' },
                            { key: 'price', label: 'Price' },
                            { key: 'mrp', label: 'MRP' },
                            { key: 'batchNumber', label: 'Batch Number' },
                            { key: 'manufacturer', label: 'Manufacturer' },
                            { key: 'expiryDate', label: 'Expiry Date' },
                            { key: 'requiresPrescription', label: 'Requires Prescription' },
                        ], 'inventory')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV([], [
                            { key: 'name', label: 'name' },
                            { key: 'genericName', label: 'genericName' },
                            { key: 'category', label: 'category' },
                            { key: 'quantity', label: 'quantity' },
                            { key: 'packSize', label: 'packSize' },
                            { key: 'unitType', label: 'unitType' },
                            { key: 'price', label: 'price' },
                            { key: 'mrp', label: 'mrp' },
                            { key: 'minQuantity', label: 'minQuantity' },
                            { key: 'batchNumber', label: 'batchNumber' },
                            { key: 'manufacturer', label: 'manufacturer' },
                            { key: 'expiryDate', label: 'expiryDate' },
                            { key: 'requiresPrescription', label: 'requiresPrescription' },
                        ], 'inventory_template')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Template
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAdd(true); }} leftIcon={<Plus className="h-4 w-4" />}>Add Item</Button>
                </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editId ? 'Edit Item' : 'Add Inventory Item'}</h2>
                            <button onClick={resetForm}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input label="Medicine Name *" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Enter medicine name" />
                                <Input label="Generic Name" value={form.genericName} onChange={(e) => setForm((current) => ({ ...current, genericName: e.target.value }))} placeholder="e.g. Paracetamol" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Input label="Total Loose Stock" type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="Total units" />
                                <Input label="Min Stock" type="number" value={form.minQuantity} onChange={(e) => setForm((current) => ({ ...current, minQuantity: e.target.value }))} />
                                <Input label="Price (Selling)" type="number" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} />
                                <Input label="MRP (Max Price)" type="number" value={form.mrp} onChange={(e) => setForm((current) => ({ ...current, mrp: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Input label="Pack Size (e.g. 15)" type="number" value={form.packSize} onChange={(e) => setForm((current) => ({ ...current, packSize: e.target.value }))} placeholder="Items per pack" />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit Type</label>
                                    <select
                                        value={form.unitType}
                                        onChange={(e) => setForm((current) => ({ ...current, unitType: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    >
                                        <option value="unit">Unit</option>
                                        <option value="strip">Strip</option>
                                        <option value="bottle">Bottle</option>
                                        <option value="tube">Tube</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                    >
                                        <option value="Tablet">Tablet</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Capsule">Capsule</option>
                                        <option value="Cream">Cream</option>
                                        <option value="Drops">Drops</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Input label="Batch Number" value={form.batchNumber} onChange={(e) => setForm((current) => ({ ...current, batchNumber: e.target.value }))} />
                                <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))} />
                                <Input label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm((current) => ({ ...current, manufacturer: e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="requiresPrescription"
                                    checked={form.requiresPrescription}
                                    onChange={(e) => setForm((current) => ({ ...current, requiresPrescription: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="requiresPrescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Requires Prescription
                                </label>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button onClick={editId ? handleUpdate : handleAdd} isLoading={actionLoading === 'add' || actionLoading === 'edit'} disabled={!form.name}>
                                {editId ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    {(['all', 'low'] as const).map((currentTab) => (
                        <button
                            key={currentTab}
                            onClick={() => setTab(currentTab)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === currentTab
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {currentTab === 'all' ? 'All Items' : 'Low Stock'}
                        </button>
                    ))}
                </div>
                <div className="flex-1">
                    <Input
                        placeholder="Search inventory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                </div>
            </div>

            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Medicine</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Stock</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 sm:table-cell">Min Stock</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 sm:table-cell">Price</th>
                                <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400 lg:table-cell">Status</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {inventory.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">No items found for the current filters</td></tr>
                            ) : inventory.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-orange-100 p-2"><Package className="h-4 w-4 text-orange-600" /></div>
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span>{item.packSize > 1 ? `${item.packSize} / ${item.unitType}` : item.unitType}</span>
                                                    {item.manufacturer && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{item.manufacturer}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 sm:table-cell">{item.minQuantity}</td>
                                    <td className="hidden px-4 py-3 text-sm text-gray-600 dark:text-gray-400 sm:table-cell">{item.price ? `₹${item.price}` : '—'}</td>
                                    <td className="hidden px-4 py-3 lg:table-cell">
                                        <span className={`rounded px-2 py-1 text-xs font-medium ${item.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {item.isLowStock ? 'Low Stock' : 'Healthy'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => void handleDelete(item.id, item.name)} disabled={actionLoading === item.id} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                                                {actionLoading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                currentPage={inventoryPagination.page}
                totalPages={inventoryPagination.totalPages}
                onPageChange={setPage}
                totalItems={inventoryPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
