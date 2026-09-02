'use client';

import React, { useState } from 'react';
import {
    X,
    Pill,
    Plus,
    Check,
    Loader2,
    AlertCircle,
    Boxes,
    Tag,
    Calendar,
    DollarSign,
    Building2
} from 'lucide-react';

interface AddStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddStock: (data: Record<string, any>) => Promise<boolean>;
    editItem?: any | null;
}

export function AddStockModal({
    isOpen,
    onClose,
    onAddStock,
    editItem = null,
}: AddStockModalProps) {
    const [medicineName, setMedicineName] = useState(editItem?.medicine_name || '');
    const [genericName, setGenericName] = useState(editItem?.generic_name || '');
    const [category, setCategory] = useState(editItem?.category || 'Tablet');
    const [batchNumber, setBatchNumber] = useState(editItem?.batch_number || '');
    const [expiryDate, setExpiryDate] = useState(editItem?.expiry_date || '');
    const [mrp, setMrp] = useState(editItem?.mrp?.toString() || '');
    const [costPrice, setCostPrice] = useState(editItem?.cost_price?.toString() || '');
    const [sellingPrice, setSellingPrice] = useState(editItem?.selling_price?.toString() || '');
    const [stockQuantity, setStockQuantity] = useState(editItem?.stock_quantity?.toString() || '');
    const [minAlertQuantity, setMinAlertQuantity] = useState(editItem?.min_alert_quantity?.toString() || '10');
    const [unit, setUnit] = useState(editItem?.unit || 'strips');
    const [rackLocation, setRackLocation] = useState(editItem?.rack_location || '');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medicineName.trim()) {
            setError('Medicine name is required');
            return;
        }
        if (!sellingPrice) {
            setError('Selling price is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onAddStock({
                id: editItem?.id || undefined,
                medicineName: medicineName.trim(),
                genericName: genericName.trim() || undefined,
                category,
                batchNumber: batchNumber.trim() || undefined,
                expiryDate: expiryDate || undefined,
                mrp: parseFloat(mrp) || parseFloat(sellingPrice) || 0,
                costPrice: parseFloat(costPrice) || 0,
                sellingPrice: parseFloat(sellingPrice) || 0,
                stockQuantity: parseInt(stockQuantity, 10) || 0,
                minAlertQuantity: parseInt(minAlertQuantity, 10) || 10,
                unit,
                rackLocation: rackLocation.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save inventory item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Boxes className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {editItem ? 'Edit Medicine Stock' : 'Add Hospital Medicine Stock'}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Manage in-house dispensary inventory, batches, pricing, and reorder levels.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                        
                        {/* 1. Medicine Name & Generic */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Medicine Brand Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Paracetamol 650mg, Augmentin 625"
                                    value={medicineName}
                                    onChange={(e) => setMedicineName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Generic Chemical Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acetaminophen, Amoxicillin + Clavulanic"
                                    value={genericName}
                                    onChange={(e) => setGenericName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* 2. Category & Form Unit */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Form / Category <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Syrup">Syrup / Suspension</option>
                                    <option value="Injection">Injection (Vial / Ampoule)</option>
                                    <option value="IV Fluid">IV Fluid (Saline / Dextrose)</option>
                                    <option value="Ointment">Ointment / Gel</option>
                                    <option value="Drops">Eye / Ear Drops</option>
                                    <option value="Inhaler">Inhaler / Respule</option>
                                    <option value="Medical Supply">Medical Supply / Consumable</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Stock Unit
                                </label>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                    <option value="strips">Strips</option>
                                    <option value="tablets">Tablets / Capsules</option>
                                    <option value="bottles">Bottles</option>
                                    <option value="vials">Vials</option>
                                    <option value="ampoules">Ampoules</option>
                                    <option value="pieces">Pieces / Units</option>
                                    <option value="boxes">Boxes</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. Batch Number & Expiry Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Batch Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. BT-2026-908"
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* 4. Pricing (MRP, Selling Price, Cost Price) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Selling Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 45.00"
                                    value={sellingPrice}
                                    onChange={(e) => setSellingPrice(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    MRP (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 50.00"
                                    value={mrp}
                                    onChange={(e) => setMrp(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Cost Price (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 32.00"
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* 5. Quantity, Min Alert & Rack Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Initial Stock Quantity
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 100"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Min Reorder Alert
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 15"
                                    value={minAlertQuantity}
                                    onChange={(e) => setMinAlertQuantity(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Rack / Shelf Location
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Rack A-2, Cold Storage 1"
                                    value={rackLocation}
                                    onChange={(e) => setRackLocation(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>{editItem ? 'Save Changes' : 'Add to Inventory'}</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
