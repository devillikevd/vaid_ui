'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Pill,
    Package,
    Plus,
    Search,
    AlertTriangle,
    CheckCircle,
    Clock,
    FileText,
    TrendingUp,
    Filter,
    Loader2,
    Calendar,
    ArrowUpRight,
    Tag,
    Boxes,
    ShoppingCart,
    Send,
    X,
    Building2,
    Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/doctor/StatusBadge';
import { hospitalApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface InventoryItem {
    id: string;
    medicine_name: string;
    generic_name?: string;
    category: string;
    batch_number?: string;
    expiry_date?: string;
    mrp: number;
    selling_price: number;
    stock_quantity: number;
    min_alert_quantity: number;
    unit: string;
    rack_location?: string;
}

interface PendingPrescription {
    id: string;
    patient_id: string;
    chief_complaint?: string;
    created_at: string;
    patient?: {
        id: string;
        name: string;
        phone?: string;
        age?: number;
        gender?: string;
    };
    doctor?: {
        name: string;
        specialization?: string;
    };
}

interface DispensationRecord {
    id: string;
    dispensation_number: string;
    total_amount: number;
    dispense_type: string;
    created_at: string;
    status: string;
    items: Array<{
        medicine_name: string;
        quantity: number;
        unit_price: number;
        total_amount: number;
        batch_number?: string;
    }>;
    patient?: {
        name: string;
        phone?: string;
    };
    dispenser?: {
        name: string;
    };
}

export default function InhousePharmacyPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'queue' | 'inventory' | 'history'>('queue');
    const [isLoading, setIsLoading] = useState(false);

    // Inventory State
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [inventorySearch, setInventorySearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [stockForm, setStockForm] = useState({
        medicineName: '',
        genericName: '',
        category: 'Tablet',
        batchNumber: '',
        expiryDate: '',
        mrp: '',
        sellingPrice: '',
        stockQuantity: '',
        minAlertQuantity: '10',
        unit: 'strips',
        rackLocation: '',
    });

    // Queue State
    const [pendingEncounters, setPendingEncounters] = useState<PendingPrescription[]>([]);
    const [showDispenseModal, setShowDispenseModal] = useState(false);
    const [selectedPrescription, setSelectedPrescription] = useState<PendingPrescription | null>(null);
    const [dispenseItems, setDispenseItems] = useState<Array<{
        inventoryId?: string;
        medicineName: string;
        batchNumber: string;
        quantity: number;
        unitPrice: number;
        instructions: string;
    }>>([]);

    // History State
    const [history, setHistory] = useState<DispensationRecord[]>([]);

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string | number | boolean> = { search: inventorySearch };
            if (selectedCategory !== 'all') params.category = selectedCategory;
            if (showLowStockOnly) params.lowStock = 'true';
            const res = await hospitalApi.getInhouseInventory(params);
            if (res.success && res.inventory) {
                setInventory(res.inventory as InventoryItem[]);
            }
        } catch (e) {
            console.error('Failed to fetch inventory', e);
        } finally {
            setIsLoading(false);
        }
    }, [inventorySearch, selectedCategory, showLowStockOnly]);

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await hospitalApi.getPendingDispensations();
            if (res.success) {
                setPendingEncounters((res.recentEncounters || []) as PendingPrescription[]);
            }
        } catch (e) {
            console.error('Failed to fetch pending prescriptions', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await hospitalApi.getDispensationsHistory();
            if (res.success && res.dispensations) {
                setHistory(res.dispensations as DispensationRecord[]);
            }
        } catch (e) {
            console.error('Failed to fetch dispensation history', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'queue') fetchQueue();
        if (activeTab === 'inventory') fetchInventory();
        if (activeTab === 'history') fetchHistory();
    }, [activeTab, fetchQueue, fetchInventory, fetchHistory]);

    const handleAddStock = async () => {
        if (!stockForm.medicineName.trim() || !stockForm.sellingPrice) {
            toast.error('Validation Error', 'Medicine name and selling price are required');
            return;
        }

        try {
            const res = await hospitalApi.addInhouseInventory(stockForm);
            if (res.success) {
                toast.success('Stock Added', `${stockForm.medicineName} added to hospital inventory`);
                setShowAddStockModal(false);
                setStockForm({
                    medicineName: '',
                    genericName: '',
                    category: 'Tablet',
                    batchNumber: '',
                    expiryDate: '',
                    mrp: '',
                    sellingPrice: '',
                    stockQuantity: '',
                    minAlertQuantity: '10',
                    unit: 'strips',
                    rackLocation: '',
                });
                fetchInventory();
            } else {
                toast.error('Failed', res.error || 'Could not add stock');
            }
        } catch (e) {
            toast.error('Error', 'Failed to connect to server');
        }
    };

    const handleOpenDispense = (presc: PendingPrescription) => {
        setSelectedPrescription(presc);
        setDispenseItems([
            { medicineName: '', batchNumber: '', quantity: 1, unitPrice: 0, instructions: '' }
        ]);
        setShowDispenseModal(true);
    };

    const handleDispenseSubmit = async () => {
        if (!selectedPrescription) return;
        const validItems = dispenseItems.filter(i => i.medicineName.trim() && i.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Error', 'Please add at least one valid medicine to dispense');
            return;
        }

        try {
            const res = await hospitalApi.dispensePrescription({
                patientId: selectedPrescription.patient_id,
                encounterId: selectedPrescription.id,
                dispenseType: 'opd_prescription',
                items: validItems,
                notes: `Dispensed for encounter ${selectedPrescription.id}`,
            });

            if (res.success) {
                toast.success('Dispensed & Charged', 'Medicines dispensed and added to hospital billing!');
                setShowDispenseModal(false);
                setSelectedPrescription(null);
                fetchQueue();
            } else {
                toast.error('Failed', res.error || 'Dispensation failed');
            }
        } catch (e) {
            toast.error('Error', 'Failed to complete dispensation');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Pill className="h-7 w-7 text-teal-600" />
                        In-House Hospital Pharmacy Desk
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Dispensary queue, hospital stock management, and automatic billing charge integration
                    </p>
                </div>
                {activeTab === 'inventory' && (
                    <Button onClick={() => setShowAddStockModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="h-4 w-4 mr-2" /> Add Medicine Stock
                    </Button>
                )}
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'queue'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Clock className="h-4 w-4" /> Prescription Dispensing Queue
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'inventory'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <Package className="h-4 w-4" /> Hospital Medicine Inventory
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'history'
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <FileText className="h-4 w-4" /> Dispensation History
                </button>
            </div>

            {/* TAB 1: DISPENSING QUEUE */}
            {activeTab === 'queue' && (
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
                    ) : pendingEncounters.length === 0 ? (
                        <Card className="p-12 text-center text-gray-500">
                            <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                            <p className="font-medium">No pending prescriptions in queue</p>
                            <p className="text-xs text-gray-400 mt-1">Prescriptions generated in OPD and IPD will appear here for dispensation.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingEncounters.map((enc) => (
                                <Card key={enc.id} className="p-5 border border-teal-100 dark:border-teal-900/40 hover:shadow-md transition">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-teal-700 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                                                OPD Prescription
                                            </span>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">
                                                {enc.patient?.name || 'Patient'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {enc.patient?.age ? `${enc.patient.age}y / ${enc.patient.gender || 'M'}` : ''} • Phone: {enc.patient?.phone || 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 space-y-1">
                                        <p><strong>Doctor:</strong> {enc.doctor?.name || 'Assigned Doctor'}</p>
                                        <p><strong>Reason:</strong> {enc.chief_complaint || 'General Checkup'}</p>
                                        <p className="text-gray-400">{new Date(enc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>

                                    <Button
                                        onClick={() => handleOpenDispense(enc)}
                                        className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2"
                                    >
                                        <Pill className="h-3.5 w-3.5 mr-1.5" /> Dispense Medicines & Bill
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: INVENTORY */}
            {activeTab === 'inventory' && (
                <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search medicine, generic name, or batch..."
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                        >
                            <option value="all">All Categories</option>
                            <option value="Tablet">Tablets</option>
                            <option value="Capsule">Capsules</option>
                            <option value="Injection">Injections</option>
                            <option value="IV Fluid">IV Fluids</option>
                            <option value="Syrup">Syrups</option>
                            <option value="Medical Supply">Medical Supplies</option>
                        </select>
                        <button
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                showLowStockOnly
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300'
                            }`}
                        >
                            <AlertTriangle className="h-3.5 w-3.5 inline mr-1" /> Low Stock Alerts
                        </button>
                    </div>

                    {/* Inventory Table */}
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                <tr>
                                    <th className="p-3">Medicine Name</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Batch & Expiry</th>
                                    <th className="p-3">Stock Qty</th>
                                    <th className="p-3">Rate (Selling)</th>
                                    <th className="p-3">Rack</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {inventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">
                                            No inventory items found. Click &quot;Add Medicine Stock&quot; to stock items.
                                        </td>
                                    </tr>
                                ) : (
                                    inventory.map((item) => {
                                        const isLowStock = item.stock_quantity <= item.min_alert_quantity;
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                                <td className="p-3 font-semibold text-gray-900 dark:text-white">
                                                    {item.medicine_name}
                                                    {item.generic_name && (
                                                        <div className="text-xs text-gray-400 font-normal">{item.generic_name}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-xs">{item.category}</td>
                                                <td className="p-3 text-xs">
                                                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.batch_number || 'N/A'}</span>
                                                    <div className="text-gray-400 mt-0.5">{item.expiry_date || 'No Expiry'}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        isLowStock
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    }`}>
                                                        {item.stock_quantity} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-900 dark:text-white">
                                                    ₹{item.selling_price}
                                                    {item.mrp > item.selling_price && (
                                                        <span className="text-xs text-gray-400 line-through ml-1.5">₹{item.mrp}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-xs text-gray-500">{item.rack_location || '—'}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: HISTORY */}
            {activeTab === 'history' && (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                            <tr>
                                <th className="p-3">Dispensation #</th>
                                <th className="p-3">Patient</th>
                                <th className="p-3">Items Dispensed</th>
                                <th className="p-3">Total Amount</th>
                                <th className="p-3">Dispensed By</th>
                                <th className="p-3">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No dispensation history recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                history.map((disp) => (
                                    <tr key={disp.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="p-3 font-mono font-bold text-xs text-teal-700">{disp.dispensation_number}</td>
                                        <td className="p-3 font-semibold text-gray-900 dark:text-white">{disp.patient?.name || 'Patient'}</td>
                                        <td className="p-3 text-xs text-gray-600">
                                            {(disp.items || []).map(i => `${i.medicine_name} (x${i.quantity})`).join(', ')}
                                        </td>
                                        <td className="p-3 font-bold text-gray-900 dark:text-white">₹{disp.total_amount}</td>
                                        <td className="p-3 text-xs text-gray-500">{disp.dispenser?.name || 'Pharmacist'}</td>
                                        <td className="p-3 text-xs text-gray-400">{new Date(disp.created_at).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ADD STOCK MODAL */}
            {showAddStockModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add Medicine to Hospital Inventory</h3>
                            <button onClick={() => setShowAddStockModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-gray-600">Medicine Name *</label>
                                <Input value={stockForm.medicineName} onChange={e => setStockForm({ ...stockForm, medicineName: e.target.value })} placeholder="e.g. Augmentin 625 Duo" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Generic Name</label>
                                <Input value={stockForm.genericName} onChange={e => setStockForm({ ...stockForm, genericName: e.target.value })} placeholder="Amoxicillin + Clav" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Category</label>
                                <select value={stockForm.category} onChange={e => setStockForm({ ...stockForm, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800">
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Injection">Injection</option>
                                    <option value="IV Fluid">IV Fluid</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Medical Supply">Medical Supply</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Batch Number</label>
                                <Input value={stockForm.batchNumber} onChange={e => setStockForm({ ...stockForm, batchNumber: e.target.value })} placeholder="e.g. AUG-2026B" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Expiry Date</label>
                                <Input type="date" value={stockForm.expiryDate} onChange={e => setStockForm({ ...stockForm, expiryDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">MRP (₹)</label>
                                <Input type="number" value={stockForm.mrp} onChange={e => setStockForm({ ...stockForm, mrp: e.target.value })} placeholder="220" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Selling Price (₹) *</label>
                                <Input type="number" value={stockForm.sellingPrice} onChange={e => setStockForm({ ...stockForm, sellingPrice: e.target.value })} placeholder="200" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Stock Quantity</label>
                                <Input type="number" value={stockForm.stockQuantity} onChange={e => setStockForm({ ...stockForm, stockQuantity: e.target.value })} placeholder="50" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600">Rack Location</label>
                                <Input value={stockForm.rackLocation} onChange={e => setStockForm({ ...stockForm, rackLocation: e.target.value })} placeholder="Shelf B-4" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <Button variant="outline" onClick={() => setShowAddStockModal(false)}>Cancel</Button>
                            <Button onClick={handleAddStock} className="bg-teal-600 hover:bg-teal-700 text-white">Save Medicine</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DISPENSE MODAL */}
            {showDispenseModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl border">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Dispense Prescription</h3>
                                <p className="text-xs text-gray-500">Patient: {selectedPrescription.patient?.name} • Doctor: {selectedPrescription.doctor?.name}</p>
                            </div>
                            <button onClick={() => setShowDispenseModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {dispenseItems.map((item, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg space-y-2 text-xs border">
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-6">
                                            <label className="font-semibold text-gray-600">Medicine Name</label>
                                            <Input
                                                value={item.medicineName}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const matchingInv = inventory.find(i => i.medicine_name.toLowerCase() === val.toLowerCase());
                                                    const updated = [...dispenseItems];
                                                    updated[idx].medicineName = val;
                                                    if (matchingInv) {
                                                        updated[idx].inventoryId = matchingInv.id;
                                                        updated[idx].batchNumber = matchingInv.batch_number || '';
                                                        updated[idx].unitPrice = matchingInv.selling_price;
                                                    }
                                                    setDispenseItems(updated);
                                                }}
                                                placeholder="Enter medicine..."
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="font-semibold text-gray-600">Qty</label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={e => {
                                                    const updated = [...dispenseItems];
                                                    updated[idx].quantity = parseInt(e.target.value) || 1;
                                                    setDispenseItems(updated);
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="font-semibold text-gray-600">Rate (₹)</label>
                                            <Input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => {
                                                    const updated = [...dispenseItems];
                                                    updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                                    setDispenseItems(updated);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-500">
                                        <span>Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        {dispenseItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setDispenseItems(dispenseItems.filter((_, i) => i !== idx))}
                                                className="text-red-500 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={() => setDispenseItems([...dispenseItems, { medicineName: '', batchNumber: '', quantity: 1, unitPrice: 0, instructions: '' }])}
                                className="w-full text-xs"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Medicine
                            </Button>
                        </div>

                        <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg text-xs text-teal-800 dark:text-teal-300 flex items-center justify-between font-semibold">
                            <span>Total Bill to Charge Patient:</span>
                            <span className="text-base font-bold">
                                ₹{dispenseItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <Button variant="outline" onClick={() => setShowDispenseModal(false)}>Cancel</Button>
                            <Button onClick={handleDispenseSubmit} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                                <Check className="h-4 w-4 mr-1.5" /> Dispense & Add to Bill
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
