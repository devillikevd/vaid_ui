'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { Package, Search, Loader2, RefreshCw, Plus, Trash2, Edit2, AlertCircle, X, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/export';

const PAGE_SIZE = 10;

export default function PharmacyInventoryPage() {
    const {
        inventory,
        inventoryPagination,
        loadingInventory,
        error,
        fetchInventory,
        addInventoryItem,
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
        quantity: '',
        price: '',
        manufacturer: '',
        expiryDate: '',
        minQuantity: '10',
    });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
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
        setForm({ name: '', quantity: '', price: '', manufacturer: '', expiryDate: '', minQuantity: '10' });
        setShowAdd(false);
        setEditId(null);
    };

    const handleAdd = async () => {
        if (!form.name) return;
        setActionLoading('add');
        const success = await addInventoryItem({
            name: form.name,
            quantity: parseInt(form.quantity, 10) || 0,
            price: parseFloat(form.price) || 0,
            manufacturer: form.manufacturer,
            expiryDate: form.expiryDate || undefined,
            minQuantity: parseInt(form.minQuantity, 10) || 10,
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
            quantity: parseInt(form.quantity, 10) || 0,
            price: parseFloat(form.price) || 0,
            manufacturer: form.manufacturer,
            expiryDate: form.expiryDate || undefined,
            minQuantity: parseInt(form.minQuantity, 10) || 10,
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

    const openEdit = (item: any) => {
        setEditId(item.id);
        setForm({
            name: item.name || '',
            quantity: String(item.quantity ?? 0),
            price: String(item.price ?? ''),
            manufacturer: item.manufacturer || '',
            expiryDate: item.expiryDate || '',
            minQuantity: String(item.minQuantity ?? 10),
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
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV(inventory, [
                            { key: 'name', label: 'Medicine' },
                            { key: 'quantity', label: 'Quantity' },
                            { key: 'minQuantity', label: 'Minimum Stock' },
                            { key: 'price', label: 'Price' },
                            { key: 'manufacturer', label: 'Manufacturer' },
                            { key: 'expiryDate', label: 'Expiry Date' },
                        ], 'inventory')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Export CSV
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAdd(true); }} leftIcon={<Plus className="h-4 w-4" />}>Add Item</Button>
                </div>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <Card padding="lg" className="w-full max-w-md">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{editId ? 'Edit Item' : 'Add Inventory Item'}</h2>
                            <button onClick={resetForm}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <Input label="Medicine Name *" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Enter medicine name" />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} />
                                <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Minimum Stock" type="number" value={form.minQuantity} onChange={(e) => setForm((current) => ({ ...current, minQuantity: e.target.value }))} />
                                <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))} />
                            </div>
                            <Input label="Manufacturer" value={form.manufacturer} onChange={(e) => setForm((current) => ({ ...current, manufacturer: e.target.value }))} />
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
                                                {item.manufacturer ? <p className="text-xs text-gray-400">{item.manufacturer}</p> : null}
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
